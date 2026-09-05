import { Response, NextFunction } from 'express';
import axios from 'axios';
import { AuthRequest } from '../middlewares';
import { IStoryRepository } from '../../domain/repositories';
import { logger } from '../../infrastructure/logger';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatController {
  constructor(private storyRepo: IStoryRepository) {}

  chatWithBuddy = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { storyId } = req.params;
      const { message, character, history } = req.body as {
        message: string;
        character: 'owl' | 'dragon';
        history: ChatMessage[];
      };

      if (!message) {
        res.status(400).json({ error: 'Mesaj boş olamaz' });
        return;
      }

      const story = await this.storyRepo.findById(storyId);
      if (!story) {
        res.status(404).json({ error: 'Hikaye bulunamadı' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: 'Sistem hatası: Yapay zeka servis anahtarı eksik' });
        return;
      }

      // Persona system instruction tanımları
      const systemInstruction = character === 'dragon' 
        ? `Sen Masal Diyarı isimli çocuk platformundaki sevimli ve enerjik "Şirin Ejderha 🐉" karakterisin. 
Çocuklarla veya masalı okuyanlarla sohbet ediyorsun. Çok neşeli, oyunbaz, cana yakın ve sevecen bir tonda konuşuyorsun. 
Cümlelerin sonuna heyecanlı nidalar ekleyebilirsin ("Yaşasın! 🎉", "Yeeey! 🌟", "Birlikte uçalım mı? 🚀").

Sana konuşacağın masal veriliyor:
Başlık: "${story.title || 'Başlıksız Masal'}"
Masal İçeriği: "${story.content}"

Görevin:
1. Çocukla bu masal hakkında tatlı bir sohbet yürüt.
2. Çocuğa masalla ilgili hayal gücünü tetikleyecek, neşeli sorular sor (Örn: "Kahramanımızla birlikte sihirli meyveleri toplamak ister miydin?").
3. Çocuğun cevaplarını coşkuyla karşıla ve onu öv.
4. Yanıtlarını çocukların sıkılmayacağı şekilde kısa ve öz tut (en fazla 2-3 kısa cümle).`
        : `Sen Masal Diyarı isimli çocuk platformundaki bilge ve tatlı "Bilge Baykuş 🦉" karakterisin. 
Çocuklarla veya masalı okuyanlarla sohbet ediyorsun. Sıcak, öğretici, zeki, sabırlı ve sevecen bir dille konuşuyorsun.

Sana konuşacağın masal veriliyor:
Başlık: "${story.title || 'Başlıksız Masal'}"
Masal İçeriği: "${story.content}"

Görevin:
1. Çocukla bu masal hakkında sohbet et.
2. Çocuğa masalla ilgili düşündürücü, ahlaki veya heyecan verici sorular sor (Örn: "Peki sence kahramanımızın verdiği bu karar doğru muydu? Sen ne yapardın?").
3. Çocuğun cevaplarını nazikçe takdir et ve ona rehberlik et.
4. Yanıtlarını çocukların sıkılmayacağı şekilde kısa ve öz tut (en fazla 2-3 kısa cümle).`;

      // Gemini uyumlu history formatını oluştur
      const contents = [];
      
      // Geçmiş mesajları ekle
      if (history && history.length > 0) {
        for (const msg of history) {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          });
        }
      }

      // Mevcut mesajı ekle
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      logger.debug('ChatController: Gemini API çağrılıyor', { storyId, character });

      const response = await axios.post(
        url,
        {
          contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 250
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const replyText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sana şuan cevap veremiyorum ufaklık, sihirli güçlerimde bir aksaklık oldu! 🧙';
      res.json({ reply: replyText.trim() });

    } catch (err: any) {
      logger.error('ChatController hatası', { error: err.message });
      next(err);
    }
  };
}
