// gameServer.js — Durable Object istemcisi. Worker URL'si Vite env'den (VITE_WORKER_URL).
// Worker deploy edilip URL verilene kadar bu modül KULLANILMAZ (uygulama hâlâ Firebase'de).
const BASE = import.meta.env?.VITE_WORKER_URL || ''

async function call(path, roomId, body) {
  if (!BASE) throw new Error('VITE_WORKER_URL tanımlı değil (worker deploy edilmedi)')
  const res = await fetch(`${BASE}/${path}?room=${roomId}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export class GameServer {
  constructor(roomId = 'default') { this.roomId = roomId }
  getState() { return call('state', this.roomId) }
  join(userId, name, seat) { return call('join', this.roomId, { userId, name, seat }) }
  leave(userId) { return call('leave', this.roomId, { userId }) }
  placeBet(userId, segmentIndex, amount) { return call('bet', this.roomId, { userId, segmentIndex, amount }) }
  clearBets(userId) { return call('clear-bets', this.roomId, { userId }) }
  advancePhase() { return call('advance-phase', this.roomId, {}) }
  verifyRound(serverSeed, clientSeed, nonce) { return call('verify-round', this.roomId, { serverSeed, clientSeed, nonce }) }
  reset() { return call('reset', this.roomId, {}) }
}
