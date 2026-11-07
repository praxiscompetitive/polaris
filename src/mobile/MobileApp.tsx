import { useEffect, useRef, useState } from 'react'
import { reduced } from '../motion'
import { SECTIONS, SectionId, set, useStore } from '../store'
import Transition, { navigate, useSiteNav } from '../components/Transition'
import Kinetic from '../components/Kinetic'
import Icon from '../components/Icons'
import { fmtLL, useEarth } from '../components/Hero'
import { Events, Explorer, Monitor, Observatory, Ocean, Region, Sources } from '../components/Landing'
import MissionGate from '../components/MissionGate'
import './mobile.css'

/**
 * POLARIS for phones. Same data and sections as desktop, rebuilt for thumbs: native scroll only,
 * one bottom dock as navigation, and Mission views that keep one data overlay at a time.
 */

const cap = (s: string) => (s === s.toUpperCase() ? s[0] + s.slice(1).toLowerCase() : s)

function Hero() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [noGL, setNoGL] = useState(false)
  const [pt, setPt] = useState<{ lat: number; lon: number } | null>(null)
  useEarth(canvas, () => setNoGL(true), { onPoint: setPt, focus: { lat: 7.8, lon: 80.7 } })
  return (
    <section id="home" data-section="home" className="m-hero" aria-label="POLARIS">
      <div className="m-hero__stage">
        {noGL
          ? <img src="/earth-day.jpg" alt="Blue Marble: cloud-free Earth, NASA" width={2048} height={1024} />
          : <canvas ref={canvas} aria-label="Interactive Earth. Drag to rotate." />}
        <p className="m-hero__ll mono" aria-hidden="true">{pt ? fmtLL(pt.lat, pt.lon) : 'Drag to rotate'}</p>
      </div>
      <div className="m-hero__copy">
        <h1><Kinetic text="POLARIS" className="m-wordmark" reveal /></h1>
        <p className="m-hero__stmt">An open window into our planet.</p>
        <p className="m-hero__sub">Real satellite, ocean and climate data on a live 3D globe.</p>
        <a className="btn btn--solid" href="#app/explorer">Open the globe</a>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="m-foot">
      <nav className="m-foot__links" aria-label="Footer">
        {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`}>{cap(s.label)}</a>)}
      </nav>
      <p className="muted">POLARIS is an open-source project by Praxis, MIT licence. Data belongs to its providers.</p>
    </footer>
  )
}

/** The orb, docked where the thumb is. Opens a native modal sheet: focus trap, Esc and backdrop for free. */
function Dock() {
  const { current } = useStore()
  const sheet = useRef<HTMLDialogElement>(null)
  const label = SECTIONS.find((s) => s.id === current)!.label

  const go = (e: React.MouseEvent, id: SectionId) => {
    e.preventDefault()
    const r = e.currentTarget.getBoundingClientRect()
    sheet.current!.close()
    navigate(id, { x: r.left + 32, y: r.top + r.height / 2 })
  }

  return (
    <>
      <nav className="m-dock" aria-label="Primary">
        <span className="m-dock__label mono">{cap(label)}</span>
        <span className="m-dock__bar" aria-hidden="true"><i /></span>
        <button className="m-dock__orb" aria-haspopup="dialog" aria-label="Open navigation" onClick={() => sheet.current!.showModal()}>
          <span className="orb__shell" />
          <span className="orb__core" />
        </button>
      </nav>
      <dialog ref={sheet} className="m-sheet" aria-label="Sections" onClick={(e) => e.target === sheet.current && sheet.current.close()}>
        <ul>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} aria-current={current === s.id ? 'location' : undefined} onClick={(e) => go(e, s.id)}>
                <span className="m-sheet__ic"><Icon id={s.id} /></span>
                <b>{cap(s.label)}</b>
                <span>{s.blurb}</span>
              </a>
            </li>
          ))}
        </ul>
        <button className="m-sheet__close mono" onClick={() => sheet.current!.close()}>Close</button>
      </dialog>
    </>
  )
}

export default function MobileApp() {
  useEffect(() => {
    document.documentElement.classList.toggle('reduce', reduced())
    set({})
  }, [])
  useSiteNav()

  return (
    <div className="m">
      <main>
        <Hero />
        <Explorer />
        <Ocean />
        <Monitor />
        <Events />
        <Observatory />
        <Region />
        <Sources />
      </main>
      <Footer />
      <Dock />
      <Transition />
      <MissionGate mobile />
    </div>
  )
}
