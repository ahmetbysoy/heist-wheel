// gameSync.js — 4 koltuklu masayı Firebase üzerinden gerçek zamanlı senkronlar.
// Host = koltuklarda en erken oturan (ts en küçük). Sadece host faz geçirir,
// RNG belirler, boş koltuklara bot bahsi yazar. Herkes aynı `game` node'unu
// okuyup render eder — local state yok.
import { useEffect, useState } from 'react'
import { db, ref, onValue, update, runTransaction, ROOT } from './firebase.js'

export const N_SEATS = 4
export const BET_S = 15
export const SPIN_MS = 4200
export const LOCK_MS = 1100
export const RESULT_MS = 3600

export const SEG = [
  { t: 2, c: '#e23b3b', l: 'x2' }, { t: 0, c: '#1a1d24', l: '💣' },
  { t: 3, c: '#f5b301', l: 'x3' }, { t: 2, c: '#e23b3b', l: 'x2' },
  { t: 'S', c: '#a05ce6', l: '🥷' }, { t: 2, c: '#e23b3b', l: 'x2' },
  { t: 5, c: '#00c26e', l: 'x5' }, { t: 2, c: '#e23b3b', l: 'x2' },
  { t: 3, c: '#f5b301', l: 'x3' }, { t: 'S', c: '#a05ce6', l: '🥷' },
  { t: 2, c: '#e23b3b', l: 'x2' }, { t: 0, c: '#1a1d24', l: '💣' },
]
const N = SEG.length
const rnd = n => Math.floor(Math.random() * n)

export const BOT_FALLBACK = [
  { name: 'VEGA', ava: '🥷', style: 'risk' },
  { name: 'KURT', ava: '🐺', style: 'safe' },
  { name: 'TİLKİ', ava: '🦊', style: 'chaos' },
  { name: 'ZEHRA', ava: '🦂', style: 'risk' },
]

export function seatInfo(i, seats) {
  const s = seats[i]
  if (s) return { name: s.name, ava: '😎', bot: false }
  return { ...BOT_FALLBACK[i], bot: true }
}

// ── server saatiyle senkron "now" — client saat kaymasını düzeltir ──
let offset = 0
onValue(ref(db, '.info/serverTimeOffset'), s => { offset = s.val() || 0 })
export const now = () => Date.now() + offset

const gRef = () => ref(db, `${ROOT}/table/game`)

export function useGame() {
  const [game, setGame] = useState(null)
  useEffect(() => onValue(gRef(), s => setGame(s.val())), [])
  return game
}

export function hostSeat(seats) {
  let best = -1, bestTs = Infinity
  for (let i = 0; i < N_SEATS; i++) {
    const s = seats[i]
    if (s && s.ts < bestTs) { bestTs = s.ts; best = i }
  }
  return best
}

// oyun node'u yoksa ilk defa kurar (herhangi bir client tetikleyebilir, transaction güvenli)
export function initGameIfMissing() {
  return runTransaction(gRef(), cur => {
    if (cur) return
    const chips = {}, out = {}
    for (let i = 0; i < N_SEATS; i++) { chips[i] = 1000; out[i] = false }
    return {
      phase: 'bet', round: 1, phaseUntil: now() + BET_S * 1000,
      bets: {}, chips, out, segResult: null, winnerSeat: null, feed: {},
    }
  })
}

export function log(msg, cls = '') {
  update(ref(db, `${ROOT}/table/game/feed`), { [now()]: { m: msg, cls } })
}

// ── bahis yaz (herkes kendi koltuğu için çağırır) ──
export function placeBet(seat, seg, amount) {
  return runTransaction(ref(db, `${ROOT}/table/game/bets/${seat}/${seg}`), cur => (cur || 0) + amount)
}
export function clearMyBets(seat) {
  return update(ref(db, `${ROOT}/table/game/bets`), { [seat]: null })
}

// ── SADECE HOST çağırır: bot bahsi enjekte et ──
export function injectBotBets(game, seats) {
  for (let i = 0; i < N_SEATS; i++) {
    if (seats[i]) continue                       // gerçek oyuncu → bot değil
    if (game.out?.[i]) continue
    if (Math.random() >= .35) continue            // her tick'te değil, doğal hissettir
    const f = BOT_FALLBACK[i]
    const bets = game.bets?.[i] || {}
    const spent = Object.values(bets).reduce((a, x) => a + x, 0)
    const chips = game.chips?.[i] ?? 0
    const amt = [10, 50, 100][rnd(3)]
    if (amt > chips - spent) continue
    const pickSeg = () => {
      if (f.style === 'safe') return [0, 3, 5, 7, 10][rnd(5)]
      if (f.style === 'risk') return [6, 4, 9][rnd(3)]
      return rnd(N)
    }
    placeBet(i, pickSeg(), amt)
  }
}

// ── SADECE HOST çağırır: faz süresi dolduysa bir sonraki faza geç ──
// runTransaction ile `phase` alanı korunuyor → iki client aynı anda host
// sanıp çift geçiş yapamaz (reconnect race'ine karşı güvenlik).
export function advancePhase(game, seats) {
  if (!game || now() < game.phaseUntil) return
  if (game.phase === 'bet') return lockPhase()
  if (game.phase === 'lock') return spinPhase()
  if (game.phase === 'spin') return settlePhase(game)
  if (game.phase === 'result') return startRound(game, seats)
}

function lockPhase() {
  return runTransaction(gRef(), g => {
    if (!g || g.phase !== 'bet') return
    let pot = 0
    const chips = { ...g.chips }
    for (let i = 0; i < N_SEATS; i++) {
      const t = Object.values(g.bets?.[i] || {}).reduce((a, x) => a + x, 0)
      chips[i] = (chips[i] || 0) - t; pot += t
    }
    g.chips = chips; g.pot = pot; g.phase = 'lock'; g.phaseUntil = now() + LOCK_MS
    return g
  })
}

function spinPhase() {
  return runTransaction(gRef(), g => {
    if (!g || g.phase !== 'lock') return
    g.segResult = rnd(N); g.phase = 'spin'; g.phaseUntil = now() + SPIN_MS + 250
    return g
  })
}

function settlePhase(game) {
  return runTransaction(gRef(), g => {
    if (!g || g.phase !== 'spin') return
    const idx = g.segResult, seg = SEG[idx]
    const chips = { ...g.chips }, out = { ...g.out }
    if (typeof seg.t === 'number' && seg.t > 0) {
      for (let i = 0; i < N_SEATS; i++) {
        const b = g.bets?.[i]?.[idx] || 0
        if (b > 0) chips[i] = (chips[i] || 0) + b * seg.t
      }
    } else if (seg.t === 'S') {
      const thieves = []
      for (let i = 0; i < N_SEATS; i++) if (!out[i] && (g.bets?.[i]?.[idx] || 0) > 0) thieves.push(i)
      const rate = thieves.length > 1 ? .1 : .15
      thieves.forEach(th => {
        for (let o = 0; o < N_SEATS; o++) {
          if (o === th || out[o]) continue
          const take = Math.floor((chips[o] || 0) * rate)
          chips[o] -= take; chips[th] = (chips[th] || 0) + take
        }
      })
    }
    for (let i = 0; i < N_SEATS; i++) if ((chips[i] || 0) <= 0) { chips[i] = 0; out[i] = true }
    const alive = [0, 1, 2, 3].filter(i => !out[i])
    g.chips = chips; g.out = out; g.phase = 'result'; g.phaseUntil = now() + RESULT_MS
    if (alive.length === 1) g.winnerSeat = alive[0]
    log(`🎯 T${g.round}: ${seg.l} · pot ${g.pot || 0}`)   // seyirciye canlı yayın
    return g
  })
}

function startRound(game, seats) {
  if (game.winnerSeat != null) return             // oyun bitti, yeni tur yok
  return runTransaction(gRef(), g => {
    if (!g || g.phase !== 'result') return
    g.round = (g.round || 1) + 1; g.bets = {}; g.segResult = null
    g.phase = 'bet'; g.phaseUntil = now() + BET_S * 1000
    return g
  })
}

export function resetGame() {
  return update(ref(db, `${ROOT}/table`), { game: null })
}
