// Provably-Fair RNG — Web Crypto HMAC-SHA256 + SHA-256 commitment.
// Amaç: oyuncu turun adil olduğunu KENDİSİ doğrulayabilsin (ev sahibi manipüle edemesin).
// Tarayıcıda window.crypto.subtle; Node 18+'ta globalThis.crypto.subtle.
const subtle = () => globalThis.crypto?.subtle
const enc = new TextEncoder()
const toHex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('')

export function randomHex(bytes = 32) {
  const a = new Uint8Array(bytes)
  globalThis.crypto.getRandomValues(a)
  return toHex(a)
}

export async function sha256Hex(msg) {
  return toHex(await subtle().digest('SHA-256', enc.encode(msg)))
}

export async function hmacSha256Hex(key, msg) {
  const k = await subtle().importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toHex(await subtle().sign('HMAC', k, enc.encode(msg)))
}

// HMAC hex → [0, n) üniform. İlk 13 hex (52 bit) güvenli integer aralığında.
export function outcomeFromHex(hex, n) {
  const v = parseInt(hex.slice(0, 13), 16)
  return Math.floor((v / 2 ** 52) * n)
}

export class ProvablyFairEngine {
  // Tur başı: server seed + commitment (hash). Hash'i oyunculara YAYINLA, seed gizli kalsın.
  async newRound() {
    const serverSeed = randomHex(32)
    const commitment = await sha256Hex(serverSeed)
    return { serverSeed, commitment }
  }

  // Spin: sonucu hesapla. serverSeed artık açığa çıkabilir.
  async outcome(serverSeed, clientSeed, nonce, segmentCount) {
    const h = await hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}`)
    return { index: outcomeFromHex(h, segmentCount), hmac: h }
  }

  // Doğrulama: commitment == sha256(serverSeed) mi, ve outcome yeniden üretilebiliyor mu?
  async verify({ serverSeed, clientSeed, nonce, segmentCount, commitment }) {
    const hash = await sha256Hex(serverSeed)
    if (hash !== commitment) return { fair: false, reason: 'commitment mismatch' }
    const { index } = await this.outcome(serverSeed, clientSeed, nonce, segmentCount)
    return { fair: true, index }
  }
}
