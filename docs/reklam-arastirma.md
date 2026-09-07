# 🔍 Reklam Ağı Araştırması — Sonuç (Faz 1 kapısı)

## ✅ Fizibilite: EVET, Telegram Mini App'te rewarded video çalışıyor
WebView içine gömülen JS SDK'larla rewarded interstitial/video destekleniyor. Native AdMob/AppLovin DEĞİL — TMA-özel ağlar gerekiyor.

## 📡 Aday ağlar (TMA rewarded + S2S durumu)

| Ağ | Format | S2S / Server doğrulama | Not |
|---|---|---|---|
| **AdsGram** | Rewarded video (TON-native, TMA-özel) | ⚠️ **S2S postback sadece >50.000 DAU** | Uzun vade en iyisi; küçükken sadece client callback |
| **Monetag** (`monetag-tg-sdk`) | Rewarded Interstitial/Pop | Postback var (doküman) | **Resmi React/TG SDK** — entegrasyon en kolay |
| **Adexium** | Rewarded | S2S postback (seçili yüksek hacimli app'ler) | 6 satır SDK |
| OnClickA / MyBid / RichAds | Rewarded/Interstitial | Değişken | iGaming'e açıklar |
| **Telegram resmi ads** | Kanal/bot içi sponsorlu mesaj (video/interstitial DEĞİL mini-app rewarded) | — | Gelirin **%50'si TON** olarak; mini-app rewarded değil |

## 🔴 KRİTİK ENGEL: SSV (server doğrulama) ölçek istiyor
- Gerçek **server-to-server doğrulama** AdsGram'da **50.000 DAU üstü** yayıncılara açık. Onun altında **sadece client-side callback** var → **sahte "izledim" sinyali trivial** (TODO'daki "client sinyaline asla güvenme" kuralı ihlal edilir).
- Yani: **küçük ölçekte gerçek paraya (VAULT→USDT) bağlanamazsın** — reklam hilesiyle bedava coin basılır.

**Çözüm (zaten planınla uyumlu):**
1. **Faz 0 + Faz 1'i oyun-parasıyla çıkar** (çekim YOK). Client-side callback hilesi olsa bile sadece oyun-parası verir → kasa zararı yok.
2. **Faz 2 (USDT çekim) KİLİTLİ kalsın**, ta ki:
   - AdsGram'ın 50k DAU S2S eşiğini aşana **veya**
   - SSV'yi düşük eşikte veren bir ağa geçene kadar.
3. Ara dönemde client anti-cheat (rate limit, device fingerprint) = **geçici**, asla gerçek para için yeterli değil.

## 📉 eCPM GERÇEĞİ (varsayımını düzelt)
- Web rewarded eCPM: **US $15-28, EU $8-15, Tier-3 (Hindistan/Brezilya) $1-3.**
- **Türkiye ≈ tier-2/3 → gerçekçi rewarded eCPM ~$2-6.** Mini-app rewarded daha da düşük (reklamveren ~$5-6 CPM ödüyor → yayıncı payı az).
- Senin "$0.008-0.02/görüntüleme" (eCPM $8-20) varsayımın **TR için iyimser.** Gerçek: **~$0.002-0.006/görüntüleme.**

### Yeniden hesap (eCPM = $3 ile)
```
görüntüleme geliri   = $0.003
payoutRatio %50      = $0.0015 → 3 chip (chip=$0.0005)
```
- Buy-in **100 chip** olursa → **~33 reklam/giriş** = oynanmaz. ❌
- **Buy-in'i düşür: 10-20 chip.** → **~5-8 reklam/giriş.** ✅
- Invariant aynı kalır; sadece sayıları gerçek eCPM'e ölçekle.

## 🎯 Öneri
1. **Ağ:** ilk test için **Monetag TG SDK** (resmi React SDK, en hızlı entegrasyon). Ölçek büyüyünce **AdsGram** (TON + S2S).
2. **Buy-in:** 100 → **20 chip**'e indir; chip değeri/eCPM'e göre ayarla.
3. **Çekim:** AdsGram 50k-DAU S2S eşiği (veya SSV'li ağ) **aşılmadan Faz 2'yi açma.**
4. **Parametre tablosunu** gerçek eCPM ile güncelle (eCPM ~$3, buy-in 20 chip).

## Sıradaki karar
- Faz 0 kodunu (çekimsiz, buy-in 20 chip, simülasyon musluk + dinamik RTP + admin panel) yazayım mı?
- Yoksa önce Monetag/AdsGram hesabı açıp TR'de gerçek eCPM/fill mi ölçelim?
