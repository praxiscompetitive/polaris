import { useEffect } from 'react'
import { reduced } from './motion'
import Header from './components/Header'
import Transition, { useSiteNav } from './components/Transition'
import Hero from './components/Hero'
import { LiveStrip, PAGES } from './components/Landing'
import MissionGate from './components/MissionGate'
import { useStore } from './store'

/** Fixed pages, no scrolling: the header switches between them, one at a time. */
export default function App() {
  useEffect(() => { document.documentElement.classList.toggle('reduce', reduced()) }, [])
  useSiteNav()
  const { current } = useStore()
  const Page = current === 'home' ? null : PAGES[current]

  return (
    <>
      <a className="skip" href="#app/explorer">Skip to the globe</a>
      <Header />
      <main className="stage" data-page={current}>
        <div className="page" key={current}>
          {Page ? <Page /> : <><Hero /><LiveStrip /></>}
        </div>
      </main>
      <Transition />
      <MissionGate />
    </>
  )
}
