# SOYGUN ÇARKI — Ekonomi Yol Haritası (güncel)

## 🔒 Sabit kural (asla kırılmaz)
`AD-COIN`/`VAULT-COIN` **parayla satılmaz.** Musluk yalnız reklam (+ AMOE bedava giriş).
Giriş bedava → şans → çıkış (VAULT→USDT). Kırılırsa = kumar.
**AMOE:** reklamsız günlük bedava giriş de olmalı (sweepstakes standart güvenlik katmanı).

## 🧮 Tek invariant
`Toplam çekilen USDT < Toplam reklam geliri − kâr marjı` (admin panelde canlı).

## 📊 Parametreler (gerçek TR eCPM ile güncellendi)
| Parametre | Değer | Not |
|---|---|---|
| Rewarded eCPM | **~$3** (TR; US $15-28, EU $8-15, tier-3 $1-3) | ağ seçilince ölçülecek |
| payoutRatio | %50 | |
| 1 chip | $0.0005 | |
| **Buy-in** | **20 chip** (100'den düşürüldü) | ~5-8 reklam/giriş |
| Azalan f | 1-2:%100, 3-5:%75, 6-10:%50, 11+:%25 | |
| Günlük reklam | 15 | |
| AMOE | 20 chip/gün bedava | |
| Dinamik RTP | Prize Pool azsa x5→x3→x1 | ✅ kodda |

---

## ✅ FAZ 0 — Çekimsiz, sıfır risk (KODLANDI, canlı)
- [x] Tek bakiye `users/{uid}/balance` (chip), buy-in 20
- [x] Reklam SİMÜLASYON musluğu (azalan getiri + günlük tavan + AMOE) — `economy.js`
- [x] Prize Pool + dinamik RTP (`settlePhase`: çarpan pool'dan, BOMB→pool, pool azsa çarpan düşer)
- [x] Admin/debug panel: Havuz · Ödenen · Gelir · Δ (invariant) + 📺/🎁 butonları
- [x] Node ile doğrulandı (reklam musluğu + dinamik RTP)

## 🔜 FAZ 1 — Gerçek reklam musluğu + iki defter (hâlâ çekim yok)
- [ ] **Ağ seçimi:** ilk test **Monetag TG SDK** (resmi React/TG SDK) → ölçek büyüyünce **AdsGram** (TON, S2S)
- [ ] `users/{uid}/ad_coin` ve `users/{uid}/vault_coin` ayrı node
- [ ] Reklam → **SSV/S2S callback** ile coin (client sinyaline güvenme)
  - ⚠️ **AdsGram S2S sadece >50k DAU.** Onun altındayken client callback = hilelenebilir → **çekim açma**
- [ ] Azalan getiri sayacı + günlük tavan (server'da)
- [ ] Oturma: önce ad_coin; kazanç → vault_coin (dönüşüm oranı sabit)
- [ ] Admin invariant paneli gerçek reklam geliriyle

## 🔜 FAZ 1.5 — Havuz / Jackpot katmanı (FOMO büyüme motoru)
- [ ] **Model A (masa havuzu):** zaten var (`pot`) — ad_coin ile besleniyor
- [ ] **Model B (global jackpot) topping olarak:** her turda masa potunun **%5'i** `global/jackpot`'a aksın
- [ ] Jackpot nadir/rastgele bir turda bonus patlasın ("🔥 HAVUZ: 1.240.000")
- [ ] Likidite koruması: payout throttle/limit (erken büyük çekim havuzu sıfırlamasın)
- [ ] Sybil önlemi: jackpot hakkı için min tur/oynanış

## 🔒 FAZ 2 — Gerçek çekim (USDT) — **SSV eşiği aşılmadan AÇILMAZ**
- [ ] AdsGram 50k-DAU S2S (veya SSV'li ağ) şartı sağlandı mı?
- [ ] 18+ yaş doğrulama, KYC, min hesap yaşı/tur
- [ ] İzinli bölge listesi + coğrafi engelleme
- [ ] Çekim ayrı sayfa (UX; hukuki koruma değil)
- [ ] Çekim kuyruğu + büyük tutarda manuel review
- [ ] TON/TRC-20 cüzdan + gas/fee

## Notlar
- Reklam araştırması: `docs/reklam-arastirma.md`
- Ekonomi diyagramı: `docs/ekonomi.svg`
