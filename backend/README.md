# 🧙 Masal Dünyası — Backend

AI destekli masal üretim platformu. Clean Architecture ile geliştirilmiş Node.js + TypeScript backend.

---

## Hızlı Başlangıç

### Gereksinimler
- Node.js 18+
- PostgreSQL 15+
- En az bir AI API anahtarı (aşağıya bakın)

### Kurulum

```bash
# 1. Bağımlılıkları yükle
cd backend
npm install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle ve anahtarları ekle

# 3. Veritabanı migration
npx prisma migrate dev --name init

# 4. Prisma client üret
npx prisma generate

# 5. Geliştirme sunucusunu başlat
npm run dev
```

Sunucu `http://localhost:3001` adresinde çalışır.

---

## Ortam Değişkenleri

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/masaldunyasi

# Gerekli — hikaye üretimi ve görsel için
OPENAI_API_KEY=sk-...

# Opsiyonel — sesli okuma için
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Opsiyonel — müzik ve video için
REPLICATE_API_TOKEN=r8_...

PORT=3001
JWT_SECRET=degistir_bunu
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Not:** API anahtarı olmayan agentlar otomatik olarak hata döndürür ve uyarı mesajı gösterir. Uygulama yine de çalışır.

---

## API Endpoints

### Hikayeler

| Metod | Endpoint | Açıklama |
|-------|----------|----------|
| `POST` | `/api/stories/generate` | Yeni hikaye oluştur |
| `GET` | `/api/stories` | Tüm hikayeleri listele |
| `GET` | `/api/stories/:id` | Tek hikaye detayı |
| `DELETE` | `/api/stories/:id` | Hikaye sil |

### Agent'lar

| Metod | Endpoint | Açıklama |
|-------|----------|----------|
| `POST` | `/api/agents/tts/:storyId` | Sesli okuma üret |
| `POST` | `/api/agents/image/:storyId` | Görsel üret |
| `POST` | `/api/agents/music/:storyId` | Müzik üret |
| `POST` | `/api/agents/video/:storyId` | Video üret |
| `GET` | `/api/agents/jobs/:jobId/status` | Job durumu sorgula |

### Sağlık Kontrolü

```bash
GET /health
```

```json
{
  "status": "ok",
  "agents": {
    "story": true,
    "tts": false,
    "image": true,
    "music": false,
    "video": false
  }
}
```

---

## WebSocket Olayları

```javascript
// Bağlan
const socket = io('http://localhost:3001');

// Belirli hikayeyi takip et
socket.emit('subscribe:story', storyId);

// Dinle
socket.on('job:update', ({ storyId, agentType, status, result }) => {
  // QUEUED | RUNNING | COMPLETED | FAILED
});

socket.on('story:ready', ({ storyId, title }) => {
  // Hikaye metnin hazır olduğunda
});
```

---

## Proje Yapısı

```
src/
├── domain/          # İş kuralları — DB'den bağımsız
│   ├── entities/    # TypeScript tipleri
│   ├── repositories/# Abstract interface'ler
│   └── services/    # Agent interface'leri
├── application/     # Use case'ler (iş mantığı)
│   ├── use-cases/
│   └── dtos/
├── infrastructure/  # Dış bağımlılıklar
│   ├── agents/      # OpenAI, ElevenLabs, Replicate
│   ├── database/    # Prisma
│   ├── external/    # API client'ları
│   └── logger/      # Winston
└── presentation/    # HTTP katmanı
    ├── controllers/
    ├── routes/
    └── middlewares/
```

---

## Agent Ekleme / Değiştirme

Yeni bir TTS sağlayıcısı eklemek için:

1. `src/domain/services/index.ts` dosyasındaki `ITTSAgentService` interface'ini uygula
2. `src/infrastructure/agents/index.ts` dosyasına yeni sınıfı ekle
3. `src/main.ts` Composition Root'ta eski agent'ı yenisiyle değiştir

Başka hiçbir dosyaya dokunmana gerek yok.

---

## Testler

```bash
npm test
```

---

## Lisans

MIT
