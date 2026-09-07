// Firebase Cloud Functions — PROVABLY-FAIR OTORİTESİ (sunucu tarafı).
// Kritik: sonucu SUNUCU hesaplar (client asla), seed bahislerden ÖNCE commit edilir,
// serverSeed client'ın OKUYAMAYACAĞI şekilde tutulur (rules: revealed=true olana kadar read:false).
const functions = require('firebase-functions/v1')
const admin = require('firebase-admin')
const crypto = require('crypto')

admin.initializeApp()
const db = admin.database()
const ROOT = 'soygun/table/game'
const SEGCOUNT = 12

// client (src/core/provablyFair.js outcomeFromHex) ile BİREBİR aynı: ilk 13 hex (52 bit)
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex')
const hmac = (k, m) => crypto.createHmac('sha256', k).update(m).digest('hex')
const outcomeFromHex = (hex, n) => Math.floor((parseInt(hex.slice(0, 13), 16) / 2 ** 52) * n)
const computeOutcome = (serverSeed, clientSeed, round) => outcomeFromHex(hmac(serverSeed, `${clientSeed}:${round}`), SEGCOUNT)

// 1) TUR BAŞI (bahislerden ÖNCE çağrılır): seed üret, hash'i yayınla, seed'i gizli sakla.
exports.startRound = functions.https.onCall(async (data) => {
  const round = Number(data?.round)
  if (!round) throw new functions.https.HttpsError('invalid-argument', 'round gerekli')
  const serverSeed = crypto.randomBytes(32).toString('hex')
  const clientSeed = crypto.randomBytes(16).toString('hex')
  const commitment = sha256(serverSeed)
  // rounds/{round}/serverSeed → rules ile client read:false (revealed'e kadar). admin bypass eder.
  await db.ref(`${ROOT}/rounds/${round}`).set({
    commitment, clientSeed, serverSeed, outcome: null, revealed: false,
    createdAt: admin.database.ServerValue.TIMESTAMP,
  })
  await db.ref(ROOT).update({ serverSeedHash: commitment, clientSeed, round })
  return { commitment, clientSeed, round }
})

// 2) SPIN: sonucu SUNUCUDA hesapla + doğrudan DB'ye yaz (host değiştiremez).
exports.spin = functions.https.onCall(async (data) => {
  const round = Number(data?.round)
  const ref = db.ref(`${ROOT}/rounds/${round}`)
  const r = (await ref.once('value')).val()
  if (!r || !r.serverSeed) throw new functions.https.HttpsError('not-found', 'round/seed yok')
  if (r.outcome != null) return { outcome: r.outcome, commitment: r.commitment }   // idempotent
  const outcome = computeOutcome(r.serverSeed, r.clientSeed, round)
  await ref.update({ outcome })
  await db.ref(`${ROOT}/segResult`).set(outcome)   // sonucu SUNUCU yazar → host manipüle edemez
  return { outcome, commitment: r.commitment }
})

// 3) REVEAL: seed'i aç (doğrulama için). Bundan sonra client serverSeed'i okuyabilir.
exports.reveal = functions.https.onCall(async (data) => {
  const round = Number(data?.round)
  const ref = db.ref(`${ROOT}/rounds/${round}`)
  const r = (await ref.once('value')).val()
  if (!r) throw new functions.https.HttpsError('not-found', 'round yok')
  await ref.update({ revealed: true })
  return { serverSeed: r.serverSeed, clientSeed: r.clientSeed, commitment: r.commitment, outcome: r.outcome }
})

// 4) VERIFY: verilen seed ile sonucu yeniden üret, commitment ile karşılaştır.
exports.verify = functions.https.onCall(async (data) => {
  const { serverSeed, clientSeed, round, outcome } = data || {}
  if (!serverSeed || !clientSeed || round == null || outcome == null)
    throw new functions.https.HttpsError('invalid-argument', 'eksik parametre')
  const commitment = sha256(serverSeed)
  const calc = computeOutcome(serverSeed, clientSeed, Number(round))
  return { fair: calc === Number(outcome), calculatedOutcome: calc, commitment }
})
