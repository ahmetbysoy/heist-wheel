import { useEffect, useRef, useState } from 'react'

/* ═══════════════ SOYGUN ÇARKI · 4 kişilik kumarhane masası ═══════════════
   Akış: BAHİS (süre) → KASA KİLİTLENDİ → ÇARK → SONUÇ → eleme → 1. kazanır
   Ekonomi: kasa kenarı matematiksel (x2 EV .83, x3 .5, x5 .42) → kasa uzun
   vadede kazanır. PvP: ÇAL segmenti rakipten yürütür, 💣 herkesi yakar.      */

const SEG = [
  { t: 2, c: '#e23b3b', l: 'x2' },
  { t: 0, c: '#1a1d24', l: '💣' },
  { t: 3, c: '#f5b301', l: 'x3' },
  { t: 2, c: '#e23b3b', l: 'x2' },
  { t: 'S', c: '#a05ce6', l: '🥷' },
  { t: 2, c: '#e23b3b', l: 'x2' },
  { t: 5, c: '#00c26e', l: 'x5' },
  { t: 2, c: '#e23b3b', l: 'x2' },
  { t: 3, c: '#f5b301', l: 'x3' },
  { t: 'S', c: '#a05ce6', l: '🥷' },
  { t: 2, c: '#e23b3b', l: 'x2' },
  { t: 0, c: '#1a1d24', l: '💣' },
]
const N = SEG.length
const BET_S = 15
const SPIN_MS = 4200

const mk = () => ({
  players: [
    { id: 0, name: 'SEN', ava: '😎', chips: 1000, bets: {}, out: false, bot: false },
    { id: 1, name: 'VEGA', ava: '🥷', chips: 1000, bets: {}, out: false, bot: true, style: 'risk' },
    { id: 2, name: 'KURT', ava: '🐺', chips: 1000, bets: {}, out: false, bot: true, style: 'safe' },
    { id: 3, name: 'TİLKİ', ava: '🦊', chips: 1000, bets: {}, out: false, bot: true, style: 'chaos' },
  ],
  phase: 'bet', count: BET_S, rot: 0, spinStyle: {}, result: null, round: 1,
  chip: 50, feed: [], winner: null, pot: 0,
})

const sleep = ms => new Promise(r => setTimeout(r, ms))
const rnd = n => Math.floor(Math.random() * n)

export default function App() {
  const G = useRef(null); if (!G.current) G.current = mk()
  const [, setV] = useState(0); const bump = () => setV(v => v + 1)
  const timers = useRef([])
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const log = (m, cls = '') => { G.current.feed.unshift({ m, cls }); G.current.feed = G.current.feed.slice(30) }

  function botBet(b) {
    const g = G.current
    if (b.out) return
    const afford = c => c <= b.chips - Object.values(b.bets).reduce((a, x) => a + x, 0)
    const pickSeg = () => {
      if (b.style === 'safe') return [0, 3, 5, 7, 10][rnd(5)]            // x2
      if (b.style === 'risk') return [6, 4, 9][rnd(3)]                  // x5 / çal
      return rnd(N)
    }
    const amt = [10, 50, 100][rnd(3)]
    if (!afford(amt)) return
    const s = pickSeg()
    b.bets[s] = (b.bets[s] || 0) + amt
    log(`${b.ava} ${b.name} → ${SEG[s].l}'e ${amt} koydu`, s === 6 ? 'g' : '')
  }

  function startRound() {
    const g = G.current
    if (g.winner) return
    g.round += 1
    g.result = null
    g.players.forEach(p => { p.bets = {} })
    g.phase = 'bet'; g.count = BET_S
    log(`── TUR ${g.round} · bahisler açık ──`, 'y')
    bump()
    // saniye sayacı + canlı bot bahsi (FOMO)
    const tick = setInterval(() => {
      const g2 = G.current
      g2.count -= 1
      g2.players.filter(p => p.bot).forEach(b => { if (Math.random() < .7) botBet(b) })
      if (g2.count <= 0) { clearInterval(tick); lock() }
      bump()
    }, 1000)
    timers.current.push(tick)
  }

  function lock() {
    const g = G.current
    g.phase = 'lock'
    g.pot = 0
    g.players.forEach(p => {
      const t = Object.values(p.bets).reduce((a, x) => a + x, 0)
      p.chips -= t; g.pot += t
    })
    log(`🔒 KASA KİLİTLENDİ · masada ${g.pot} chip`, 'r')
    bump()
    later(spin, 1100)
  }

  function spin() {
    const g = G.current
    const idx = rnd(N)
    g.result = idx
    const spins = 5 + rnd(3)
    const target = spins * 360 + (360 - (idx * (360 / N) + 360 / N / 2))
    g.spinStyle = { transform: `rotate(${target}deg)`, transition: `transform ${SPIN_MS}ms cubic-bezier(.12,.8,.15,1)` }
    g.rot = target
    g.phase = 'spin'
    bump()
    later(settle, SPIN_MS + 250)
  }

  function settle() {
    const g = G.current
    const idx = g.result
    const seg = SEG[idx]
    g.phase = 'result'
    // transition'ı bırak, açıyı sabitle → çark sıfıra "zıplamaz"
    g.spinStyle = { transform: `rotate(${g.rot}deg)` }
    log(`🎯 ÇARK DURDU: ${seg.l}`, 'y')

    if (typeof seg.t === 'number' && seg.t > 0) {
      g.players.forEach(p => {
        const b = p.bets[idx] || 0
        if (b > 0) { const win = b * seg.t; p.chips += win; log(`${p.ava} ${p.name} +${win} (${seg.l})`, 'g') }
      })
    } else if (seg.t === 'S') {
      const thieves = g.players.filter(p => !p.out && (p.bets[idx] || 0) > 0)
      if (thieves.length) {
        const rate = thieves.length > 1 ? .1 : .15
        thieves.forEach(th => {
          g.players.forEach(o => {
            if (o.id === th.id || o.out) return
            const take = Math.floor(o.chips * rate)
            o.chips -= take; th.chips += take
            log(`🥷 ${th.name}, ${o.name}'den ${take} ÇALDI`, 'p')
          })
        })
      } else log('🥷 ÇAL geldi ama kimse bahis koymadı — kasa gülüyor', 'r')
    } else {
      log('💣 BOMB! Tüm bahisler kasaya.', 'r')
    }

    g.players.forEach(p => { if (p.chips <= 0) { p.chips = 0; if (!p.out) { p.out = true; log(`☠️ ${p.name} masadan düştü`, 'r') } } })
    const alive = g.players.filter(p => !p.out)
    if (alive.length === 1) { g.winner = alive[0]; g.phase = 'over'; log(`🏆 ${alive[0].name} MASAYI SİLİP SÜPÜRDÜ`, 'y') }
    bump()
    if (!g.winner) later(startRound, 3600)
  }

  // ilk tur
  useEffect(() => { startRound(); /* eslint-disable-next-line */ }, [])

  function placeBet(i) {
    const g = G.current
    if (g.phase !== 'bet') return
    const me = g.players[0]
    if (me.out) return
    const spent = Object.values(me.bets).reduce((a, x) => a + x, 0)
    const amt = Math.min(g.chip, me.chips - spent)
    if (amt <= 0) return
    me.bets[i] = (me.bets[i] || 0) + amt
    bump()
  }
  function clearBets() { const g = G.current; if (g.phase === 'bet') { g.players[0].bets = {}; bump() } }
  function reset() { timers.current.forEach(clearTimeout); G.current = mk(); startRound(); bump() }

  const g = G.current
  const me = g.players[0]
  const segAngle = 360 / N

  // çark dilimleri
  const arcs = SEG.map((s, i) => {
    const a0 = (i * segAngle - 90) * Math.PI / 180
    const a1 = ((i + 1) * segAngle - 90) * Math.PI / 180
    const x0 = 100 + 96 * Math.cos(a0), y0 = 100 + 96 * Math.sin(a0)
    const x1 = 100 + 96 * Math.cos(a1), y1 = 100 + 96 * Math.sin(a1)
    const mid = (i * segAngle + segAngle / 2 - 90) * Math.PI / 180
    return { s, i, d: `M100,100 L${x0},${y0} A96,96 0 0,1 ${x1},${y1} Z`, tx: 100 + 66 * Math.cos(mid), ty: 100 + 66 * Math.sin(mid) }
  })

  const band = g.phase === 'bet' ? ['bet', `🎲 BAHİSLER AÇIK · ${g.count} sn`]
    : g.phase === 'lock' ? ['lock', '🔒 KASA KİLİTLENDİ']
    : g.phase === 'spin' ? ['win', '🌀 ÇARK DÖNÜYOR…']
    : g.phase === 'result' ? ['win', `🎯 SONUÇ: ${g.result != null ? SEG[g.result].l : ''}`]
    : ['', '']

  return (
    <div className="app">
      <header>
        <h1>🥷 SOYGUN ÇARKI</h1>
        <span className="tag">TUR {g.round} · MASA {g.players.filter(p => !p.out).length}/4 · POT {g.pot}</span>
      </header>

      <div className="table">
        <div className="wheelwrap">
          <div className="wheelbox">
            <div className="pointer" />
            <svg viewBox="0 0 200 200">
              <g style={g.spinStyle}>
                {arcs.map(a => (
                  <g key={a.i} onClick={() => placeBet(a.i)} style={{ cursor: g.phase === 'bet' ? 'pointer' : 'default' }}>
                    <path d={a.d} fill={a.s.c} stroke="#0b0e14" strokeWidth="1.5" />
                    <text x={a.tx} y={a.ty} fill="#fff" fontSize="11" fontWeight="800"
                      textAnchor="middle" dominantBaseline="middle" transform={`rotate(${a.i * segAngle + segAngle / 2} ${a.tx} ${a.ty})`}>
                      {a.s.l}
                    </text>
                    {(me.bets[a.i] || 0) > 0 && (
                      <text x={a.tx} y={a.ty + 12} fill="#ffd75e" fontSize="7" fontWeight="800" textAnchor="middle">
                        {me.bets[a.i]}
                      </text>
                    )}
                  </g>
                ))}
              </g>
            </svg>
            <div className="hub"><div className="core">
              <div className="mult">{g.result != null ? SEG[g.result].l : '🥷'}</div>
              <div className="sub">SOYGUN ÇARKI</div>
            </div></div>
          </div>

          <div className={`statusband ${band[0]}`}>{band[1]}</div>

          <div className="controls">
            {[10, 50, 100, 500].map(c => (
              <div key={c} className={`chip c${c} ${g.chip === c ? 'sel' : ''}`} onClick={() => { g.chip = c; bump() }}>{c}</div>
            ))}
            <button className="btn ghost" onClick={clearBets} disabled={g.phase !== 'bet'}>Temizle</button>
          </div>
          <div className="hint">Dilime tıkla → seçili chip kadar bahis koy. 🥷=çal · 💣=bomb · kasa her zaman kenar alır.</div>
        </div>

        <div className="side">
          {g.players.map(p => (
            <div key={p.id} className={`player ${p.id === 0 ? 'me' : ''} ${p.out ? 'out' : ''}`}>
              {p.out && <span className="badge">ELENDİ</span>}
              <div className="row">
                <span className="ava">{p.ava}</span>
                <span className="name">{p.name}{p.bot ? '' : ' (sen)'}</span>
                <span className="chips">{p.chips}</span>
              </div>
              <div className="bets">
                {Object.entries(p.bets).map(([s, v]) => <span key={s} className="pb">{SEG[s].l}·{v}</span>)}
                {Object.keys(p.bets).length === 0 && <span className="pb">bahis yok</span>}
              </div>
            </div>
          ))}
          <div className="feed">{g.feed.map((f, i) => <div key={i} className={f.cls}>{f.m}</div>)}</div>
          <button className="btn" onClick={reset}>↺ Yeni Oyun</button>
        </div>
      </div>

      {g.winner && (
        <div className="winner"><div className="card">
          <h2>{g.winner.ava} {g.winner.name} KAZANDI</h2>
          <p>Masadaki herkesi soydu. Kasa bile korktu.</p>
          <p style={{ marginTop: 10, color: 'var(--gold2)' }}>{g.winner.chips} chip</p>
          <button className="btn" style={{ marginTop: 16 }} onClick={reset}>Tekrar Oyna</button>
        </div></div>
      )}
    </div>
  )
}
