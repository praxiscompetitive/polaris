import { useEffect } from 'react'
import { reduced } from './motion'
import Header from './components/Header'
import Page from './components/Page'
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
  const Body = current === 'home' ? null : PAGES[current]

  return (
    <>
      <a className="skip" href="#app/explorer">Skip to the globe</a>
      <Header />
      <main className="stage" data-page={current}>
        <Page key={current}>
          {Body ? <Body /> : <><Hero /><LiveStrip /></>}
        </Page>
      </main>
      <Transition />
      <MissionGate />
    </>
  )
}
