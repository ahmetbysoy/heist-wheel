// juice.js — FAZ 4: Web Audio sentez + haptik + screen-shake. Gerçek sentez, dosya yok.
let ctx = null
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Mekanik pim tıkırtısı (çark dönerken)
export function tick() {
  try {
    const a = ac(), t = a.currentTime
    const o = a.createOscillator(), g = a.createGain()
    o.type = 'square'; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(600, t + 0.03)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.06)
  } catch (e) {}
}
// 808 sub-bass drop (büyük kazanç)
export function bassDrop() {
  try {
    const a = ac(), t = a.currentTime
    const o = a.createOscillator(), g = a.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.5)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.65)
  } catch (e) {}
}
// Bomba patlama
export function bombSound() {
  try {
    const a = ac(), t = a.currentTime
    const o = a.createOscillator(), g = a.createGain()
    o.type = 'sawtooth'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.4)
    g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.5)
  } catch (e) {}
}

const tg = () => window.Telegram?.WebApp?.HapticFeedback
export function haptic(kind) {
  try {
    const h = tg()
    if (h) {
      if (kind === 'bet') h.impactOccurred('light')
      else if (kind === 'spin') h.impactOccurred('medium')
      else if (kind === 'tick') h.impactOccurred('rigid')
      else if (kind === 'win') h.notificationOccurred('success')
      else if (kind === 'bomb') h.notificationOccurred('error')
      else if (kind === 'steal') h.notificationOccurred('warning')
      return
    }
    const nav = navigator.vibrate
    if (!nav) return
    if (kind === 'bet') nav(15)
    else if (kind === 'spin') nav(30)
    else if (kind === 'tick') nav(10)
    else if (kind === 'win') nav([50, 30, 100])
    else if (kind === 'bomb') nav([80, 40, 80, 40, 120])
    else if (kind === 'steal') nav([40, 20, 40])
  } catch (e) {}
}

export function shake(intensity = 'medium') {
  const app = document.querySelector('.wheelwrap') || document.body
  const amp = { light: 2, medium: 5, heavy: 10 }[intensity] || 5
  const dur = { light: 120, medium: 300, heavy: 500 }[intensity] || 300
  let el = 0
  const iv = setInterval(() => {
    const x = (Math.random() - 0.5) * amp * 2, y = (Math.random() - 0.5) * amp * 2
    app.style.transform = `translate(${x}px,${y}px)`
    el += 16
    if (el >= dur) { clearInterval(iv); app.style.transform = '' }
  }, 16)
}
