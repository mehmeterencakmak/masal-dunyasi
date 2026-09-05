# 🧙 Masal Dünyası — Sıfırdan Kurulum Rehberi
### Hiç kod bilmesen bile çalıştırabilirsin!

---

## 📁 ÖNCE DOSYA DİZİNİ NASIL OLMALI?

Bilgisayarında bir klasör oluşturacaksın. Sonunda şöyle görünmesi lazım:

```
masal-dunyasi/          ← Ana klasör (sen oluştur)
│
├── backend/            ← Backend klasörü (sen oluştur)
│   ├── src/            ← Kaynak kodlar (zaten indirildi)
│   ├── package.json    ← (zaten indirildi)
│   ├── tsconfig.json   ← (zaten indirildi)
│   └── .env            ← SEN oluşturacaksın (adım 4'te)
│
└── frontend/           ← Frontend klasörü (adım 6'da oluşturacağız)
    ├── src/
    │   └── services/
    │       └── api.ts  ← (zaten indirildi)
    └── ...
```

---

## 🛠️ ADIM 1 — Gerekli Programları Yükle

### A) Node.js yükle (en önemli!)
1. https://nodejs.org adresine git
2. **"LTS"** yazan büyük yeşil butona tıkla (20.x veya 22.x olabilir)
3. İndirilen `.msi` dosyasını çalıştır, "Next Next Next Finish" de
4. Bilgisayarı **yeniden başlat**

### B) Node.js kuruldu mu kontrol et
- Windows: `Windows tuşu` → "cmd" yaz → Enter
- Mac: `Command + Boşluk` → "terminal" yaz → Enter

Açılan siyah ekrana şunu yaz:
```
node --version
```
`v20.x.x` gibi bir şey görürsen ✅ kurulmuş!

### C) PostgreSQL yükle (veritabanı)
1. https://www.postgresql.org/download/ adresine git
2. İşletim sistemini seç (Windows/Mac)
3. İndir ve kur
4. **Kurulum sırasında şifre sorar — "postgres" yaz ve UNUTMA!**
5. Port: **5432** (değiştirme)

---

## 🗂️ ADIM 2 — Klasörleri Oluştur

**Windows için:**
1. Masaüstüne sağ tık → Yeni Klasör → `masal-dunyasi` adını ver
2. O klasörün içine gir → Yeni Klasör → `backend` adını ver
3. O klasörün içine gir → Yeni Klasör → `frontend` adını ver

**Mac için:**
Terminal'de şunu yaz:
```bash
mkdir -p ~/Desktop/masal-dunyasi/backend
mkdir -p ~/Desktop/masal-dunyasi/frontend
```

---

## 📋 ADIM 3 — İndirilen Dosyaları Yerleştir

Claude'un ürettiği dosyaları doğru klasörlere kopyala:

### Backend dosyaları → `masal-dunyasi/backend/` klasörüne:
```
backend/
├── package.json          ✅ kopyala
├── tsconfig.json         ✅ kopyala
├── README.md             ✅ kopyala
└── src/                  ✅ tüm bu klasörü kopyala
    ├── main.ts
    ├── domain/
    ├── application/
    ├── infrastructure/
    └── presentation/
```

### Frontend dosyaları → `masal-dunyasi/frontend/src/` klasörüne:
```
frontend/src/
├── services/
│   └── api.ts            ✅ kopyala
└── hooks/
    └── index.ts          ✅ kopyala
```

---

## 🔑 ADIM 4 — .env Dosyası Oluştur (API Anahtarları)

`backend` klasörünün **içinde** `.env` adında bir dosya oluştur.

**Windows'ta nasıl oluşturulur:**
1. Notepad'i aç (Windows + R → notepad → Enter)
2. Aşağıdaki içeriği yapıştır
3. Kaydet → "Tüm Dosyalar" seç → dosya adı: `.env` → backend klasörüne kaydet

**Mac'te nasıl oluşturulur:**
Terminal'de: `nano ~/Desktop/masal-dunyasi/backend/.env`

### .env dosyasının içeriği:
```
DATABASE_URL="postgresql://postgres:SENIN_SIFREN@localhost:5432/masaldunyasi"

OPENAI_API_KEY=buraya_openai_anahtarini_yapistir

ELEVENLABS_API_KEY=buraya_elevenlabs_anahtarini_yapistir
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

REPLICATE_API_TOKEN=buraya_replicate_tokenini_yapistir

PORT=3001
JWT_SECRET=masaldunyasi_gizli_anahtar_2024
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=./uploads
```

> ⚠️ `SENIN_SIFREN` yazan yere PostgreSQL kurulumunda yazdığın şifreyi yaz!

---

## 🗄️ ADIM 5 — Veritabanını Oluştur

Terminal/cmd'yi aç ve şunu yaz:
```bash
psql -U postgres
```

Şifre soruyorsa PostgreSQL şifreni gir.

Sonra şunu yaz:
```sql
CREATE DATABASE masaldunyasi;
\q
```

---

## ⚙️ ADIM 6 — Frontend Projesini Oluştur

Terminal/cmd'de `frontend` klasörüne git:

**Windows:**
```cmd
cd C:\Users\KULLANICI_ADIN\Desktop\masal-dunyasi\frontend
```

**Mac:**
```bash
cd ~/Desktop/masal-dunyasi/frontend
```

Sonra bu komutu çalıştır (Vite ile React projesi oluşturur):
```bash
npm create vite@latest . -- --template react-ts
```

Sorular sorarsa:
- "Ok to proceed?" → `y` + Enter
- Framework? → `React` seç
- Variant? → `TypeScript` seç

Sonra:
```bash
npm install
```

Şimdi `src/services/` ve `src/hooks/` klasörlerini oluştur ve
Claude'un ürettiği `api.ts` ile `index.ts` dosyalarını içlerine koy.

---

## 🚀 ADIM 7 — Backend'i Başlat

Yeni bir terminal/cmd aç. Backend klasörüne git:

**Windows:**
```cmd
cd C:\Users\KULLANICI_ADIN\Desktop\masal-dunyasi\backend
```

**Mac:**
```bash
cd ~/Desktop/masal-dunyasi/backend
```

Sırayla şu komutları çalıştır:

```bash
# 1. Bağımlılıkları yükle (sadece ilk seferinde)
npm install

# 2. Prisma'yı ayarla (sadece ilk seferinde)
npx prisma generate
npx prisma migrate dev --name init

# 3. Backend'i başlat
npm run dev
```

✅ Şunu görürsen backend çalışıyor:
```
🧙 Masal Dünyası backend başlatıldı { port: 3001 }
PostgreSQL bağlantısı kuruldu
```

---

## 🌐 ADIM 8 — Frontend'i Başlat

**Yeni** bir terminal/cmd aç (backend çalışmaya devam etmeli!):

```bash
cd masal-dunyasi/frontend
npm run dev
```

✅ Şunu görürsen frontend çalışıyor:
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

Tarayıcıda `http://localhost:5173` adresine git! 🎉

---

## 🔑 API Anahtarlarını Nereden Alırım?

### OpenAI (Hikaye + Görsel üretimi) — EN ÖNEMLİSİ
1. https://platform.openai.com adresine git
2. Kayıt ol / giriş yap
3. Sağ üstte profil → **"API Keys"**
4. **"Create new secret key"** → kopyala → `.env` dosyasına yapıştır
5. Kart bilgisi gerekebilir (kullandıkça ödersin, çok ucuz)

### ElevenLabs (Sesli okuma) — OPSİYONEL
1. https://elevenlabs.io adresine git
2. Ücretsiz kayıt ol
3. Profil → **"API Key"** → kopyala

### Replicate (Müzik + Video) — OPSİYONEL
1. https://replicate.com adresine git
2. GitHub ile kayıt ol
3. Hesap → **"API tokens"** → kopyala

> 💡 Sadece OpenAI anahtarı olsa bile hikaye ve görsel üretebilirsin!
> Diğerleri olmasa o butonlar hata mesajı gösterir ama uygulama çalışır.

---

## ❌ Sık Karşılaşılan Hatalar

### "Cannot find module" hatası
```bash
npm install
```
tekrar çalıştır.

### "ECONNREFUSED" veya veritabanı hatası
- PostgreSQL çalışıyor mu? Servisler/Services'den kontrol et
- `.env` dosyasındaki şifre doğru mu?

### "Port 3001 already in use"
Eski bir backend çalışıyor. Terminali kapat, yeniden aç, `npm run dev` tekrar yaz.

### "OPENAI_API_KEY eksik" hatası
`.env` dosyasını kaydetmeyi unuttun veya dosya adı `.env.txt` olmuş.
Dosya adının sadece `.env` olduğundan emin ol.

---

## 📞 Özet — Her Gün Nasıl Çalıştırırım?

**İki terminal aç:**

Terminal 1 (Backend):
```bash
cd masal-dunyasi/backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd masal-dunyasi/frontend
npm run dev
```

Tarayıcıda: `http://localhost:5173`

**Bitirince:** Her iki terminalde de `Ctrl + C` bas.

---

*Bu rehber Windows ve Mac için geçerlidir. Linux kullanıyorsan terminal komutları Mac ile aynıdır.*
