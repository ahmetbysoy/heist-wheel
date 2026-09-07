# ✈️ SOYGUN ÇARKI → Telegram Mini App Kurulumu

Uygulama artık Telegram WebApp SDK'sı ile konuşuyor:
`ready()`, `expand()`, tema renkleri, **kullanıcı adı** (Telegram'dan otomatik),
ve **haptic feedback** (kazanınca başarı, bombada hata titreşimi).

Canlı URL (HTTPS — Telegram için şart): **https://heist-wheel.vercel.app**

## BotFather ile bot oluştur (2 dk)

1. Telegram'da **@BotFather** → `/newbot`
2. Bot adı: `Soygun Çarkı` · kullanıcı adı: `soyguncarki_bot` (…bot ile bitmeli)
3. BotFather sana **bot token** verir (`123456:ABC…`). **Bunu kimseyle paylaşma.**

## Mini App'i bota bağla — 2 yol

### Yol A: Menü butonu (en kolay)
1. @BotFather → `/setmenubutton`
2. Botunu seç
3. URL olarak yapıştır: `https://heist-wheel.vercel.app`
4. Buton adı: `🎰 OYNA`

Artık bot sohbetinde sol alttaki **menü butonu** oyunu açar.

### Yol B: Doğrudan uygulama linki
1. @BotFather → `/newapp` → botunu seç
2. App adı + açıklama, sonra **Web App URL**: `https://heist-wheel.vercel.app`
3. Kısa ad ver → sana link verir: `https://t.me/soyguncarki_bot/oyun`
   Bu linki herhangisohbete at; tıklayan direkt oyuna girer.

## Test et
Telegram mobilde linki/butonu aç → oyun tam ekran açılır, adın Telegram
adın olur, çark dönünce telefon titrer. 🌐 WEB rozeti yerine ✈️ TELEGRAM görürsün.

## Sonraki adım (gerçek online + TON)
Şu an rakipler **bot**. Gerçek 4 kişi + kripto için:
- Backend'de `initData` doğrulama (bot token ile HMAC) → sahte kullanıcı engeli
- Realtime oda (WebSocket) → 4 gerçek oyuncu
- TON Connect cüzdan → gerçek token ekonomisi
Bunlar için bot token'ı **sunucuda** tutman gerekir; frontend'e KOYMA.
