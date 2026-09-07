# 🥷 SOYGUN ÇARKI — 4 Kişilik Kumarhane Masası

Crypto temalı, beceri + sinir + blöf karışımı, **4 kişilik, herkes-düşman,
1. kazanır** bir çark/bahis oyunu. React + Vite.

## Oynanış
1. **BAHİS** (15 sn): dilime tıkla, seçili chip kadar bahis koy. Botlar canlı
   bahis atar (FOMO).
2. **🔒 KASA KİLİTLENDİ**: bahisler masaya kilitlenir.
3. **🌀 ÇARK**: döner, durur.
4. **SONUÇ**:
   - `x2/x3/x5` → o dilime oynayanlar çarpan kadar kazanır (kasa öder, EV<1 →
     kasa uzun vadede kazanır).
   - `🥷 ÇAL` → çal'a oynayanlar, her rakibin %15'ini yürütür.
   - `💣 BOMB` → tüm bahisler kasaya.
5. Chip'i biten **elendi**. Son kalan **masayı süpürür**.

## Geliştirme
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ üretir
```

## GitHub → Vercel pipeline
İki yol:

**A) Kolay yol (önerilen):** GitHub'da private repo oluştur, push et, sonra
[vercel.com](https://vercel.com) → *Import* → repo'yu seç. Vercel `vite`
tespit eder, her push'ta otomatik deploy eder. `vercel.json` hazır.

**B) Actions ile:** `.github/workflows/deploy.yml` hazır. GitHub repo
*Settings → Secrets → Actions* içine şunları ekle:
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Sonra her `main`
push'u Vercel'e deploy olur.

```bash
git init && git add -A && git commit -m "soygun çarkı v0.1"
git remote add origin git@github.com:KULLANICI/heist-wheel.git   # PRIVATE!
git push -u origin main
```

> ⚠ Repo **private** olsun. İçinde oturum/secret yok ama ekonomi kodun açık
> olmasın.
