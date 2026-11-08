import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { reduced } from './motion'
import Header from './components/Header'
import Transition, { useSiteNav } from './components/Transition'
import Hero from './components/Hero'
import { Events, Explorer, LiveStrip, Monitor, Observatory, Ocean, Region, Sources } from './components/Landing'
import { useReveal } from './motion'
import Footer from './components/Footer'
import MissionGate from './components/MissionGate'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  useEffect(() => {
    document.documentElement.classList.toggle('reduce', reduced())

    // Scroll progress → CSS variable (the phone dock's progress bar).
    const vel = ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        document.documentElement.style.setProperty('--prog', self.progress.toFixed(4))
      },
    })

    return () => vel.kill()
  }, [])
  useSiteNav()
  useReveal()

  return (
    <>
      <a className="skip" href="#app/explorer">Skip to the globe</a>
      <Header />
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
    </>
  )
}
