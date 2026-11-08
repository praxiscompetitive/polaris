import { useEffect, useRef, useState } from 'react'
import { reduced } from '../motion'
import { SECTIONS, useStore } from '../store'
import Page from '../components/Page'
import Transition, { useSiteNav } from '../components/Transition'
import Icon from '../components/Icons'
import { fmtLL, useEarth } from '../components/Hero'
import { LiveStrip, PAGES } from '../components/Landing'
import MissionGate from '../components/MissionGate'
import './mobile.css'

/**
 * POLARIS for phones. Same pages as desktop, rebuilt for thumbs: one bottom dock of page icons,
 * and Mission views that keep one data overlay at a time.
 */

const cap = (s: string) => (s === s.toUpperCase() ? s[0] + s.slice(1).toLowerCase() : s)

function Hero() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [noGL, setNoGL] = useState(false)
  const [pt, setPt] = useState<{ lat: number; lon: number } | null>(null)
  useEarth(canvas, () => setNoGL(true), { onPoint: setPt, focus: { lat: 7.8, lon: 80.7 } })
  return (
    <section className="m-hero" aria-label="POLARIS">
      <img className="m-hero__icon" src="/brand/icon-180.png" alt="" width={40} height={40} />
      <div className="m-hero__stage">
        {noGL
          ? <img src="/earth-day.jpg" alt="Blue Marble: cloud-free Earth, NASA" width={2048} height={1024} />
          : <canvas ref={canvas} aria-label="Interactive Earth. Drag to rotate." />}
        <p className="m-hero__ll mono" aria-hidden="true">{pt ? fmtLL(pt.lat, pt.lon) : 'Drag to rotate'}</p>
      </div>
      <div className="m-hero__copy">
        <h1 className="m-hero__word"><img src="/brand/wordmark.png" alt="POLARIS" width={606} height={63} /></h1>
        <p className="m-hero__stmt">An open window into our planet.</p>
        <p className="m-hero__sub">Real satellite, ocean and climate data on a live 3D globe.</p>
        <a className="btn btn--solid" href="#app/explorer">Open the globe</a>
      </div>
    </section>
  )
}

/** One bar, bottom, where the thumb is: an icon per page. */
function Dock() {
  const { current } = useStore()
  return (
    <nav className="m-dock" aria-label="Pages">
      {SECTIONS.map((s) => (
        <a key={s.id} href={`#${s.id}`} aria-label={cap(s.label)} aria-current={current === s.id ? 'page' : undefined}>
          <Icon id={s.id} size={22} />
        </a>
      ))}
    </nav>
  )
}

export default function MobileApp() {
  useEffect(() => { document.documentElement.classList.toggle('reduce', reduced()) }, [])
  useSiteNav()
  const { current } = useStore()
  const Body = current === 'home' ? null : PAGES[current]

  return (
    <div className="m">
      <main className="stage" data-page={current}>
        <Page key={current} scroll>
          {Body ? <Body /> : <><Hero /><LiveStrip /></>}
        </Page>
      </main>
      <Dock />
      <Transition />
      <MissionGate mobile />
    </div>
  )
}
