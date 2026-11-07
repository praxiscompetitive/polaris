import { useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { pointer, reduced } from './motion'
import { SECTIONS, set, useStore } from './store'
import Orb from './components/Orb'
import Header from './components/Header'
import Transition, { useSiteNav } from './components/Transition'
import Hero from './components/Hero'
import { Events, Explorer, LiveStrip, Monitor, Observatory, Ocean, Region, Sources } from './components/Landing'
import { useReveal } from './motion'
import Footer from './components/Footer'
import MissionGate from './components/MissionGate'

gsap.registerPlugin(ScrollTrigger)

const poly = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    return `${(10 + Math.cos(a) * 8).toFixed(1)},${(10 + Math.sin(a) * 8).toFixed(1)}`
  }).join(' ')

/** Left rail: progress + a marker that gains a side per section. The label doubles as the debug-mode switch. */
function Rail() {
  const { current, debug } = useStore()
  const i = SECTIONS.findIndex((s) => s.id === current)
  return (
    <div className="rail">
      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><polygon points={poly(i + 3)} className="rail__poly" /></svg>
      <div className="rail__bar" aria-hidden="true"><i /></div>
      <button className="rail__label mono" aria-pressed={debug} onClick={() => set({ debug: !debug })}
        title="Toggle the optional debug overlay">
        {String(i + 1).padStart(2, '0')} / {SECTIONS[i].label}
      </button>
    </div>
  )
}

/** Optional overlay: clearly labelled, purely informational. */
function Debug() {
  const { current, visited } = useStore()
  const [t, setT] = useState({ fps: 0, y: 0, x: 0, py: 0, sy: 0 })
  useEffect(() => {
    let frames = 0, last = performance.now()
    const f = () => {
      frames++
      const now = performance.now()
      if (now - last > 500) {
        setT({ fps: Math.round((frames * 1000) / (now - last)), x: pointer.x | 0, y: pointer.y | 0, py: 0, sy: scrollY | 0 })
        frames = 0; last = now
      }
    }
    gsap.ticker.add(f)
    return () => gsap.ticker.remove(f)
  }, [])
  return (
    <aside className="hud mono" aria-label="Debug overlay (optional)">
      <b>Debug overlay (optional)</b><br />
      fps {t.fps} · scrollY {t.sy}<br />
      cursor {t.x},{t.y}<br />
      scene {current} · visited {visited.length}/{SECTIONS.length}<br />
      dir {document.body.dataset.dir ?? '-'}
    </aside>
  )
}

export default function App() {
  const { debug } = useStore()

  useEffect(() => {
    document.documentElement.classList.toggle('reduce', reduced())
    set({}) // apply persisted debug class

    // Scroll velocity & direction → CSS variables. Fast scrolling simplifies fine detail and leans display type.
    let calm: number
    const vel = ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        const v = Math.max(-1, Math.min(1, self.getVelocity() / 3000))
        document.documentElement.style.setProperty('--vel', v.toFixed(3))
        document.documentElement.style.setProperty('--prog', self.progress.toFixed(4))
        document.body.dataset.dir = self.direction > 0 ? 'down' : 'up'
        document.body.dataset.fast = String(Math.abs(self.getVelocity()) > 1800)
        clearTimeout(calm)
        calm = window.setTimeout(() => { document.documentElement.style.setProperty('--vel', '0'); document.body.dataset.fast = 'false' }, 140)
      },
    })

    // Magnetic buttons: pulled toward the cursor inside a small radius.
    const mag = (e: PointerEvent) => {
      document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
        const r = el.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
        const near = Math.hypot(dx, dy) < Math.max(r.width, r.height) * 0.7 + 30
        gsap.to(el, { x: near ? dx * 0.25 : 0, y: near ? dy * 0.25 : 0, duration: near ? 0.25 : 0.6, ease: near ? 'power2.out' : 'elastic.out(1,0.5)', overwrite: 'auto' })
      })
    }
    if (matchMedia('(pointer: fine)').matches && !reduced()) addEventListener('pointermove', mag, { passive: true })

    return () => { vel.kill(); removeEventListener('pointermove', mag) }
  }, [])
  useSiteNav()
  useReveal()

  return (
    <>
      <a className="skip" href="#app/explorer">Skip to the globe</a>
      <Header />
      <Orb />
      <Rail />
      <main>
        <Hero />
        <LiveStrip />
        <Explorer />
        <Ocean />
        <Monitor />
        <Events />
        <Observatory />
        <Region />
        <Sources />
      </main>
      <Footer />
      <Transition />
      <MissionGate />
      {debug && <Debug />}
    </>
  )
}
