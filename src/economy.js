// economy.js — Faz 0 ekonomi motoru (çekimsiz).
// Tek bakiye: users/{uid}/balance (chip). Prize Pool + reklam geliri takibi.
// ⚠️ Faz 0'da reklam SİMÜLASYON; gerçek SDK + SSV Faz 1'de (client sinyaline güvenme).
import { useEffect, useState } from 'react'
import { db, ref, onValue, runTransaction, get, update, ROOT } from './firebase.js'

export const CHIP_VALUE = 0.0005        // $ / chip (sen belirlersin)
export const PAYOUT_RATIO = 0.5          // reklam gelirinin kullanıcıya verilen payı
export const ECPM_SIM = 3                // $ — TR gerçekçi; ağ seçilince güncelle
export const DAILY_AD_CAP = 15
export const AMOE_DAILY_CHIPS = 20       // reklamsız günlük bedava giriş (sweepstakes AMOE)
const AD_REV_CHIPS = Math.max(1, Math.round((ECPM_SIM / 1000) / CHIP_VALUE))  // görüntüleme başına gelir (chip)

const econRef = () => ref(db, `${ROOT}/econ`)
export function useEcon() { const [e, setE] = useState(null); useEffect(() => onValue(econRef(), s => setE(s.val())), []); return e }

export const getPool = () => get(ref(db, `${ROOT}/econ/prize_pool`)).then(s => s.val() || 0)
export const adjPool = d => runTransaction(ref(db, `${ROOT}/econ/prize_pool`), c => Math.max(0, (c || 0) + d))
export const addPaid = d => runTransaction(ref(db, `${ROOT}/econ/paid_chips`), c => (c || 0) + d)
export const addRevenue = d => runTransaction(ref(db, `${ROOT}/econ/ad_revenue`), c => (c || 0) + d)

// azalan getiri (ad-farming freni) — n: bugünkü kaçıncı izleme (1-based)
export const adFactor = n => (n <= 2 ? 1 : n <= 5 ? 0.75 : n <= 10 ? 0.5 : 0.25)
const today = () => new Date().toISOString().slice(0, 10)

// 📺 reklam izle (Faz 0 SİMÜLASYON) → chip ver, marjı prize pool'a
export async function watchAd(uid) {
  const d = today(), uRef = ref(db, `${ROOT}/users/${uid}`)
  const u = (await get(uRef)).val() || {}
  const cnt = u.ad_day === d ? (u.ad_watch_today || 0) : 0
  if (cnt >= DAILY_AD_CAP) return { ok: false, msg: `Günlük reklam limiti (${DAILY_AD_CAP}) doldu` }
  const f = adFactor(cnt + 1)
  const give = Math.max(1, Math.round(AD_REV_CHIPS * PAYOUT_RATIO * f))
  const margin = AD_REV_CHIPS - give
  await runTransaction(ref(db, `${ROOT}/users/${uid}/balance`), c => (c || 0) + give)
  await update(uRef, { ad_day: d, ad_watch_today: cnt + 1 })
  adjPool(margin); addRevenue(AD_REV_CHIPS)
  return { ok: true, give, left: DAILY_AD_CAP - cnt - 1 }
}

// 🎁 AMOE: reklamsız günlük bedava chip (sweepstakes güvenlik katmanı)
export async function claimDailyFree(uid) {
  const d = today(), uRef = ref(db, `${ROOT}/users/${uid}`)
  const u = (await get(uRef)).val() || {}
  if (u.amoe_day === d) return { ok: false, msg: 'Bugün zaten aldın' }
  await runTransaction(ref(db, `${ROOT}/users/${uid}/balance`), c => (c || 0) + AMOE_DAILY_CHIPS)
  await update(uRef, { amoe_day: d })
  return { ok: true, give: AMOE_DAILY_CHIPS }
}
