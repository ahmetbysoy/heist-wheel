import { useEffect, useRef, useState } from 'react'
import Wheel from './Wheel.jsx'
import {
  db, ROOT, ref, onValue, set, update, get, remove,
  onDisconnect, runTransaction, identity, demoWallet,
} from './firebase.js'
import { useEcon, watchAd, claimDailyFree } from './economy.js'

const BUY_IN = 20         // chip — buy-in düşürüldü (tier-3 eCPM'e göre)
const START_BAL = 100     // başlangıç chip
const SEATS = 4

export default function App() {
  const me = useRef(identity()).current
  const [bal, setBal] = useState(null)
  const [seats, setSeats] = useState({})
  const [specs, setSpecs] = useState({})
  const [likes, setLikes] = useState({})
  const [feed, setFeed] = useState([])
  const [screen, setScreen] = useState('lobby')   // lobby | game
  const [mySeat, setMySeat] = useState(-1)
  const [wallet, setWallet] = useState('')
  const [hearts, setHearts] = useState([])
  const econ = useEcon()

  const ad = async () => { const r = await watchAd(me.uid); if (!r.ok) alert(r.msg) }
  const amoe = async () => { const r = await claimDailyFree(me.uid); if (!r.ok) alert(r.msg) }

  // ── başlangıç: kullanıcı kaydı + cüzdan-ID eşleme ──
  useEffect(() => {
    const w = demoWallet(me.uid)
    setWallet(w)
    const uRef = ref(db, `${ROOT}/users/${me.uid}`)
    get(uRef).then(s => {
      if (!s.exists()) set(uRef, { name: me.name, wallet: w, balance: START_BAL, ts: Date.now() })
    })
    set(ref(db, `${ROOT}/wallets/${me.uid}`), w)   // user_id ↔ adres

    const un1 = onValue(ref(db, `${ROOT}/users/${me.uid}/balance`), s => setBal(s.val() ?? 0))
    const un2 = onValue(ref(db, `${ROOT}/table/seats`), s => {
      const v = s.val() || {}
      setSeats(v)
      const mine = Object.entries(v).find(([i, x]) => x?.uid === me.uid)
      if (mine) { setMySeat(+mine[0]); setScreen('game') }
    })
    const un3 = onValue(ref(db, `${ROOT}/table/spectators`), s => setSpecs(s.val() || {}))
    const un4 = onValue(ref(db, `${ROOT}/table/likes`), s => setLikes(s.val() || {}))
    const un5 = onValue(ref(db, `${ROOT}/table/feed`), s => {
      const v = s.val() || {}
      setFeed(Object.values(v).sort((a, b) => b.ts - a.ts).slice(0, 12))
    })
    return () => [un1, un2, un3, un4, un5].forEach(f => f())
    // eslint-disable-next-line
  }, [])

  const isSpec = mySeat < 0 && specs[me.uid]

  // ── masaya otur (ilk gelen, 1 USDT) ──
  async function joinSeat() {
    if (bal == null || bal < BUY_IN) return alert(`Oturmak için ${BUY_IN} chip gerek (bakiye ${bal})`)
    for (let i = 0; i < SEATS; i++) {
      if (seats[i]) continue
      const r = await runTransaction(ref(db, `${ROOT}/table/seats/${i}`), cur => {
        if (cur !== null) return          // dolu → iptal
        return { uid: me.uid, name: me.name, ts: Date.now() }
      })
      if (r.committed) {
        await update(ref(db, `${ROOT}/users/${me.uid}`), { balance: bal - BUY_IN })
        onDisconnect(ref(db, `${ROOT}/table/seats/${i}`)).remove()
        setMySeat(i); setScreen('game')
        pushFeed(`🪑 ${me.name} ${i + 1}. koltuğa oturdu (-${BUY_IN} USDT)`)
        return
      }
    }
    alert('Masa dolu — tüm koltuklar kapıldı!')
  }

  function spectate() {
    set(ref(db, `${ROOT}/table/spectators/${me.uid}`), { name: me.name, ts: Date.now() })
    onDisconnect(ref(db, `${ROOT}/table/spectators/${me.uid}`)).remove()
    setMySeat(-1); setScreen('game')
  }

  function leave() {
    if (mySeat >= 0) remove(ref(db, `${ROOT}/table/seats/${mySeat}`))
    remove(ref(db, `${ROOT}/table/spectators/${me.uid}`))
    setMySeat(-1); setScreen('lobby')
  }

  function like(i) {
    runTransaction(ref(db, `${ROOT}/table/likes/${i}`), c => (c || 0) + 1)
    burst(i)
  }
  function burst(i) {
    const id = Math.random()
    setHearts(h => [...h, { id, i }])
    setTimeout(() => setHearts(h => h.filter(x => x.id !== id)), 1200)
  }

  function pushFeed(msg) {
    const f = ref(db, `${ROOT}/table/feed`)
    const key = Date.now()
    update(f, { [key]: { msg, ts: key } })
  }

  const seatedCount = Object.values(seats).filter(Boolean).length

  return (
    <div className="app">
      <header>
        <h1>🥷 SOYGUN ÇARKI</h1>
        <span className="tag">💳 {bal ?? '…'} USDT · 👥 {seatedCount}/4 · 👁 {Object.keys(specs).length}</span>
      </header>

      <div className="econbar">
        <span>🏦 Havuz <b>{econ?.prize_pool || 0}</b></span>
        <span>💸 Ödenen <b>{econ?.paid_chips || 0}</b></span>
        <span>📺 Gelir <b>{econ?.ad_revenue || 0}</b></span>
        <span className={((econ?.ad_revenue || 0) - (econ?.paid_chips || 0)) >= 0 ? 'ok' : 'bad'}>
          Δ {((econ?.ad_revenue || 0) - (econ?.paid_chips || 0))}
        </span>
        <button className="btn ghost sm" onClick={ad}>📺 Reklam (sim)</button>
        <button className="btn ghost sm" onClick={amoe}>🎁 Bedava</button>
      </div>

      {screen === 'lobby' ? (
        <div className="lobby">
          <div className="walletcard">
            <div className="wname">{me.name}</div>
            <div className="waddr">🔑 {wallet.slice(0, 10)}…{wallet.slice(-6)}</div>
            <div className="wbal">💰 {bal ?? 0} chip</div>
            <div className="wsub">cüzdan, kullanıcı ID'nle eşlendi {me.tg ? '(Telegram)' : '(misafir)'}</div>
          </div>

          <div className="seatgrid">
            {Array.from({ length: SEATS }, (_, i) => {
              const s = seats[i]
              return (
                <div key={i} className={`seat ${s ? 'full' : ''}`}>
                  <div className="sava">{s ? '😎' : '🪑'}</div>
                  <div className="sname">{s ? s.name : `Koltuk ${i + 1}`}</div>
                  <div className="slike">❤️ {likes[i] || 0}</div>
                </div>
              )
            })}
          </div>

          <div className="lobbtns">
            <button className="btn" onClick={joinSeat}>🪑 OTUR — {BUY_IN} chip</button>
            <button className="btn ghost" onClick={spectate}>👁 İZLE + BEĞEN</button>
          </div>
          <div className="hint">İlk gelen 4 kişi oturur · diğerleri izler & beğenir · koltuk = {BUY_IN} USDT (oyun parası)</div>
        </div>
      ) : (
        <div className="game">
          <Wheel seat={mySeat} seats={seats} meName={me.name} />
          {mySeat < 0 && (
            <div className="likeRow">
              {Array.from({ length: SEATS }, (_, i) => seats[i] && (
                <div key={i} className="likecell">
                  <button className="likebtn" onClick={() => like(i)}>❤️</button>
                  <span className="likename">{seats[i].name} · {likes[i] || 0}</span>
                  {hearts.filter(h => h.i === i).map(h => <span key={h.id} className="heart">❤️</span>)}
                </div>
              ))}
            </div>
          )}
          <button className="btn ghost" onClick={leave}>← Lobiden Ayrıl</button>
        </div>
      )}
    </div>
  )
}
