import { useEffect, useRef, useState } from 'react'
import {
  SEG, N_SEATS, SPIN_MS, useGame, hostSeat, initGameIfMissing,
  placeBet, clearMyBets, advancePhase, injectBotBets, resetGame,
  now, seatInfo,
} from './gameSync.js'

const N = SEG.length

/* ═══ SOYGUN ÇARKI · Firebase-senkron masa ═══
   Oyun state'i `table/game`'de TEK kaynak. Host (en erken oturan) fazları
   sürer; herkes aynı node'u render eder → gerçek 4 oyuncu aynı çarkı izler. */
export default function Wheel({ seat = -1, seats = {}, meName }) {
  const game = useGame()
  const [chip, setChip] = useState(50)
  const [style, setStyle] = useState({})
  const gRef = useRef(null); gRef.current = game
  const sRef = useRef(null); sRef.current = seats
  const isHost = seat >= 0 && hostSeat(seats) === seat

  useEffect(() => { initGameIfMissing() }, [])

  // HOST sürücüsü: faz geçişi + bot bahsi (yalnız host)
  useEffect(() => {
    const t = setInterval(() => {
      if (!isHost) return
      const g = gRef.current, s = sRef.current || {}
      if (!g) return
      advancePhase(g, s)
      if (g.phase === 'bet') injectBotBets(g, s)
    }, 1000)
    return () => clearInterval(t)
  }, [isHost])

  // çark dönüşü — segResult'ten deterministik, tüm client'larda aynı
  useEffect(() => {
    if (!game) return
    if (game.phase === 'spin' && game.segResult != null) {
      const spins = 5 + (game.round % 3)
      const target = spins * 360 + (360 - (game.segResult * (360 / N) + 360 / N / 2))
      setStyle({ transform: `rotate(${target}deg)`, transition: `transform ${SPIN_MS}ms cubic-bezier(.12,.8,.15,1)`, transformOrigin: '100px 100px' })
    } else {
      setStyle(s => ({ transform: s.transform, transformOrigin: '100px 100px', transition: 'none' }))
    }
  }, [game?.phase, game?.segResult])

  if (!game) return <div className="statusband">⏳ masa kuruluyor…</div>

  const myBets = seat >= 0 ? (game.bets?.[seat] || {}) : {}
  const remain = Math.max(0, Math.ceil((game.phaseUntil - now()) / 1000))
  const band = game.phase === 'bet' ? ['bet', `🎲 BAHİSLER AÇIK · ${remain} sn`]
    : game.phase === 'lock' ? ['lock', '🔒 KASA KİLİTLENDİ']
    : game.phase === 'spin' ? ['win', '🌀 ÇARK DÖNÜYOR…']
    : game.phase === 'result' ? ['win', `🎯 SONUÇ: ${game.segResult != null ? SEG[game.segResult].l : ''}`]
    : ['', '']

  const segAngle = 360 / N
  const arcs = SEG.map((s, i) => {
    const a0 = (i * segAngle - 90) * Math.PI / 180
    const a1 = ((i + 1) * segAngle - 90) * Math.PI / 180
    const x0 = 100 + 96 * Math.cos(a0), y0 = 100 + 96 * Math.sin(a0)
    const x1 = 100 + 96 * Math.cos(a1), y1 = 100 + 96 * Math.sin(a1)
    const mid = (i * segAngle + segAngle / 2 - 90) * Math.PI / 180
    return { s, i, d: `M100,100 L${x0},${y0} A96,96 0 0,1 ${x1},${y1} Z`, tx: 100 + 66 * Math.cos(mid), ty: 100 + 66 * Math.sin(mid) }
  })

  const bet = i => { if (seat >= 0 && game.phase === 'bet') placeBet(seat, i, chip) }
  const feedLines = Object.values(game.feed || {}).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 8)

  return (
    <div className="wheelwrap">
      <div className="wheelbox">
        <div className="pointer" />
        <svg viewBox="0 0 200 200">
          <g style={style}>
            {arcs.map(a => (
              <g key={a.i} onClick={() => bet(a.i)} style={{ cursor: seat >= 0 && game.phase === 'bet' ? 'pointer' : 'default' }}>
                <path d={a.d} fill={a.s.c} stroke="#0b0e14" strokeWidth="1.5" />
                <text x={a.tx} y={a.ty} fill="#fff" fontSize="11" fontWeight="800" textAnchor="middle" dominantBaseline="middle"
                  transform={`rotate(${a.i * segAngle + segAngle / 2} ${a.tx} ${a.ty})`}>{a.s.l}</text>
                {(myBets[a.i] || 0) > 0 && (
                  <text x={a.tx} y={a.ty + 12} fill="#ffd75e" fontSize="7" fontWeight="800" textAnchor="middle">{myBets[a.i]}</text>
                )}
              </g>
            ))}
          </g>
        </svg>
        <div className="hub"><div className="core">
          <div className="mult">{game.segResult != null ? SEG[game.segResult].l : '🥷'}</div>
          <div className="sub">TUR {game.round} · POT {game.pot || 0}</div>
        </div></div>
      </div>

      <div className={`statusband ${band[0]}`}>{band[1]}{isHost ? ' ·  HOST' : ''}</div>

      {seat >= 0 && game.phase === 'bet' && (
        <div className="controls">
          {[10, 50, 100, 500].map(c => (
            <div key={c} className={`chip c${c} ${chip === c ? 'sel' : ''}`} onClick={() => setChip(c)}>{c}</div>
          ))}
          <button className="btn ghost" onClick={() => clearMyBets(seat)}>Temizle</button>
        </div>
      )}

      <div className="seatgrid">
        {Array.from({ length: N_SEATS }, (_, i) => {
          const p = seatInfo(i, seats)
          return (
            <div key={i} className={`seat ${game.out?.[i] ? 'out' : 'full'} ${i === seat ? 'me' : ''}`}>
              {i === hostSeat(seats) && <span className="badge">👑</span>}
              <div className="sava">{p.ava}</div>
              <div className="sname">{p.name}{i === seat ? ' (sen)' : ''}</div>
              <div className="slike">🪙 {game.chips?.[i] ?? 0}</div>
              <div className="bets">{Object.entries(game.bets?.[i] || {}).map(([sg, v]) => <span key={sg} className="pb">{SEG[sg].l}·{v}</span>)}</div>
            </div>
          )
        })}
      </div>

      <div className="feed">{feedLines.map((f, i) => <div key={i} className={f.cls}>{f.m}</div>)}</div>
      <button className="btn ghost" onClick={resetGame}>↺ Masayı Sıfırla</button>

      {game.winnerSeat != null && (
        <div className="winner"><div className="card">
          <h2>{seatInfo(game.winnerSeat, seats).ava} {seatInfo(game.winnerSeat, seats).name} KAZANDI</h2>
          <p>Masadaki herkesi soydu.</p>
          <p style={{ marginTop: 10, color: 'var(--gold2)' }}>{game.chips?.[game.winnerSeat]} chip</p>
          <button className="btn" style={{ marginTop: 16 }} onClick={resetGame}>Tekrar Oyna</button>
        </div></div>
      )}
    </div>
  )
}
