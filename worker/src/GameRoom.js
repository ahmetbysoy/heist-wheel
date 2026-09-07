// GameRoom — Cloudflare Durable Object (otoriter oyun sunucusu).
// Klasik DO sınıfı (extends yok = en geniş uyumluluk). Web Crypto (crypto.subtle) global.
// Provably-Fair: seed tur BAŞINDA üretilir + hash'i publish edilir, spin'de AYNI seed kullanılır,
// tur sonunda reveal. DO single-threaded → istekler sırayla, race-lock gerekmez.

const SEG = [
  { t: 2.33, l: 'x2.33' }, { t: 0, l: '💣' }, { t: 5.82, l: 'x5.82' }, { t: 2.33, l: 'x2.33' },
  { t: 'S', l: '🥷' }, { t: 2.33, l: 'x2.33' }, { t: 11.64, l: 'x11.64' }, { t: 2.33, l: 'x2.33' },
  { t: 5.82, l: 'x5.82' }, { t: 'S', l: '🥷' }, { t: 2.33, l: 'x2.33' }, { t: 0, l: '💣' },
]
const SEGCOUNT = SEG.length
const BET_MS = 15000, LOCK_MS = 1100, SPIN_MS = 4200, RESULT_MS = 3600

const enc = new TextEncoder()
const toHex = b => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('')
const randHex = n => toHex(crypto.getRandomValues(new Uint8Array(n)))
const sha256Hex = async m => toHex(await crypto.subtle.digest('SHA-256', enc.encode(m)))
const hmacHex = async (key, msg) => {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toHex(await crypto.subtle.sign('HMAC', k, enc.encode(msg)))
}
// client (provablyFair.js outcomeFromHex) ile BİREBİR aynı: ilk 13 hex (52 bit)
const outcomeFromHex = (hex, n) => Math.floor((parseInt(hex.slice(0, 13), 16) / 2 ** 52) * n)

export class GameRoom {
  constructor(state, env) { this.state = state; this.env = env; this.game = null; this.sessions = new Map(); this.serverSeed = null }

  async ensureLoaded() {
    if (this.game) return
    const g = await this.state.storage.get('game')
    const s = await this.state.storage.get('sessions')
    const seed = await this.state.storage.get('serverSeed')
    if (s) this.sessions = new Map(Object.entries(s))
    if (seed) this.serverSeed = seed
    if (g) { this.game = g; return }
    await this.newRound(1)
  }
  async persist() {
    await this.state.storage.put('game', this.game)
    await this.state.storage.put('sessions', Object.fromEntries(this.sessions))
    if (this.serverSeed) await this.state.storage.put('serverSeed', this.serverSeed)
  }

  // tur başı: seed üret + commitment (hash) publish. seed gizli kalır.
  async newRound(round) {
    this.serverSeed = randHex(32)
    const commitment = await sha256Hex(this.serverSeed)
    const clientSeed = randHex(16)
    this.game = {
      phase: 'bet', round, phaseUntil: Date.now() + BET_MS, bets: {},
      chips: this.game?.chips || { 0: 1000, 1: 1000, 2: 1000, 3: 1000 },
      out: this.game?.out || { 0: false, 1: false, 2: false, 3: false },
      segResult: null, winnerSeat: this.game?.winnerSeat ?? null, pot: 0, feed: this.game?.feed || {},
      commitment, clientSeed, nonce: round, serverSeed: null,
    }
  }

  async fetch(req) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
    const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { ...cors, 'Content-Type': 'application/json' } })
    try {
      await this.ensureLoaded()
      const path = new URL(req.url).pathname.split('/').pop()
      const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
      if (path === 'state') return json(this.publicState())
      if (path === 'join') return json(await this.join(body))
      if (path === 'leave') return json(await this.leave(body))
      if (path === 'bet') return json(await this.bet(body))
      if (path === 'clear-bets') return json(await this.clearBets(body))
      if (path === 'advance-phase') return json(await this.advance())
      if (path === 'verify-round') return json(await this.verify(body))
      if (path === 'reset') { await this.newRound(1); await this.persist(); return json(this.publicState()) }
      return json({ error: 'not found' }, 404)
    } catch (e) { return json({ error: e.message }, 500) }
  }

  publicState() {
    const g = { ...this.game }
    delete g.serverSeed                    // seed asla gönderilmez (result'ta reveal edilir)
    return { ...g, sessions: Object.fromEntries(this.sessions) }
  }

  async join({ userId, name, seat }) {
    if (!userId || seat == null || seat < 0 || seat > 3) return { error: 'bad args' }
    for (const s of this.sessions.values()) if (s.seat === seat) return { error: 'seat occupied' }
    this.sessions.set(userId, { seat, name, ts: Date.now() })
    if (!(seat in this.game.chips)) { this.game.chips[seat] = 1000; this.game.out[seat] = false }
    await this.persist(); return { ok: true, ...this.publicState() }
  }
  async leave({ userId }) {
    const s = this.sessions.get(userId); if (!s) return { error: 'not joined' }
    this.sessions.delete(userId)
    delete this.game.chips[s.seat]; delete this.game.out[s.seat]; delete this.game.bets[s.seat]
    await this.persist(); return { ok: true, ...this.publicState() }
  }
  async bet({ userId, segmentIndex, amount }) {
    const s = this.sessions.get(userId); if (!s) return { error: 'not joined' }
    if (this.game.phase !== 'bet') return { error: 'betting closed' }
    const seat = s.seat
    const spent = Object.values(this.game.bets[seat] || {}).reduce((a, x) => a + x, 0)
    if (spent + amount > (this.game.chips[seat] || 0)) return { error: 'insufficient chips' }
    this.game.bets[seat] = this.game.bets[seat] || {}
    this.game.bets[seat][segmentIndex] = (this.game.bets[seat][segmentIndex] || 0) + amount
    await this.persist(); return { ok: true, ...this.publicState() }
  }
  async clearBets({ userId }) {
    const s = this.sessions.get(userId); if (!s) return { error: 'not joined' }
    if (this.game.phase !== 'bet') return { error: 'betting closed' }
    delete this.game.bets[s.seat]; await this.persist(); return { ok: true, ...this.publicState() }
  }

  async advance() {
    if (Date.now() < this.game.phaseUntil) return { ok: false, remaining: this.game.phaseUntil - Date.now() }
    if (this.game.phase === 'bet') this.lock()
    else if (this.game.phase === 'lock') await this.spin()
    else if (this.game.phase === 'spin') this.settle()
    else if (this.game.phase === 'result') { if (this.game.winnerSeat == null) await this.newRound(this.game.round + 1) }
    await this.persist(); return { ok: true, ...this.publicState() }
  }

  lock() {
    let pot = 0; const chips = { ...this.game.chips }
    for (let s = 0; s < 4; s++) { const t = Object.values(this.game.bets[s] || {}).reduce((a, x) => a + x, 0); chips[s] = (chips[s] || 0) - t; pot += t }
    this.game.chips = chips; this.game.pot = pot; this.game.phase = 'lock'; this.game.phaseUntil = Date.now() + LOCK_MS
  }
  async spin() {
    // commitment tur başında verildi; AYNI serverSeed kullanılır (yeniden üretilmez)
    const h = await hmacHex(this.serverSeed, `${this.game.clientSeed}:${this.game.nonce}`)
    this.game.segResult = outcomeFromHex(h, SEGCOUNT)
    this.game.phase = 'spin'; this.game.phaseUntil = Date.now() + SPIN_MS + 250
  }
  settle() {
    const idx = this.game.segResult, seg = SEG[idx]
    const chips = { ...this.game.chips }, out = { ...this.game.out }
    const onClass = (s, cls) => { let t = 0; for (let j = 0; j < SEGCOUNT; j++) if (SEG[j].t === cls) t += this.game.bets[s]?.[j] || 0; return t }
    if (typeof seg.t === 'number' && seg.t > 0) {
      for (let s = 0; s < 4; s++) { const b = onClass(s, seg.t); if (b > 0) chips[s] = (chips[s] || 0) + Math.round(b * seg.t) }
    } else if (seg.t === 'S') {
      const thieves = []; for (let s = 0; s < 4; s++) if (!out[s] && onClass(s, 'S') > 0) thieves.push(s)
      const rate = thieves.length > 1 ? .1 : .15
      thieves.forEach(th => { for (let o = 0; o < 4; o++) { if (o === th || out[o]) continue; const take = Math.floor((chips[o] || 0) * rate); chips[o] -= take; chips[th] = (chips[th] || 0) + take } })
    } // BOMB → kasa (pot zaten düştü)
    for (let s = 0; s < 4; s++) if ((chips[s] || 0) <= 0) { chips[s] = 0; out[s] = true }
    const alive = [0, 1, 2, 3].filter(s => !out[s])
    this.game.chips = chips; this.game.out = out; this.game.phase = 'result'; this.game.phaseUntil = Date.now() + RESULT_MS
    this.game.lastMult = seg.t; if (alive.length === 1) this.game.winnerSeat = alive[0]
    this.game.serverSeed = this.serverSeed   // REVEAL — doğrulama için
    this.game.feed = this.game.feed || {}; this.game.feed[Date.now()] = { m: `🎯 T${this.game.round}: ${seg.l} · pot ${this.game.pot || 0}`, ts: Date.now() }
  }

  async verify({ serverSeed, clientSeed, nonce }) {
    const commitment = await sha256Hex(serverSeed)
    const h = await hmacHex(serverSeed, `${clientSeed}:${nonce}`)
    return { commitment, outcome: outcomeFromHex(h, SEGCOUNT), matchesCommitment: commitment === this.game.commitment }
  }
}
