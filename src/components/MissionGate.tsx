import { lazy, Suspense, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { parse } from '../lib/deeplink'

// Cesium and everything that touches it live behind this import: the landing page never downloads them.
const Mission = lazy(() => import('../mission/Mission'))

/** Opens a Mission view whenever the hash is #app/<view>. Back, forward and pasted links all route through here. */
export default function MissionGate({ mobile = false }: { mobile?: boolean }) {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const f = () => setHash(location.hash)
    addEventListener('hashchange', f)
    addEventListener('popstate', f)
    return () => { removeEventListener('hashchange', f); removeEventListener('popstate', f) }
  }, [])
  const link = parse(hash)
  useEffect(() => { document.documentElement.classList.toggle('in-mission', !!link) }, [!!link])
  if (!link) return null
  return createPortal(
    <Suspense fallback={<div className="mission mission--boot" role="status"><span className="mono">Loading the globe</span></div>}>
      <Mission link={link} mobile={mobile} />
    </Suspense>,
    document.body,
  )
}
