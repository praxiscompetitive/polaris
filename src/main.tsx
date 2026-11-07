import { lazy, Suspense, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

// Cesium fetches its workers and assets from here (copied by vite-plugin-static-copy). Must be set before the lazy mission chunk loads.
;(window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = '/cesium/'

// Two sites, one URL: phones (and phones in landscape) get their own tree and never download the desktop one.
const Desktop = lazy(() => import('./App'))
const Mobile = lazy(() => import('./mobile/MobileApp'))
const mq = matchMedia('(max-width: 720px), (pointer: coarse) and (max-height: 500px)')

function Root() {
  const small = useSyncExternalStore((f) => (mq.addEventListener('change', f), () => mq.removeEventListener('change', f)), () => mq.matches)
  return <Suspense fallback={null}>{small ? <Mobile /> : <Desktop />}</Suspense>
}

createRoot(document.getElementById('root')!).render(<Root />)
