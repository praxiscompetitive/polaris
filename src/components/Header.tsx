import { useEffect, useState } from 'react'
import { SECTIONS, useStore } from '../store'

/** Brand bar: logo home, sections on one line (wide screens), the orb sits at its right end. Solid once the hero is gone. */
export default function Header() {
  const { current } = useStore()
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const hero = document.getElementById('home')
    if (!hero) return
    const io = new IntersectionObserver(([e]) => setSolid(!e.isIntersecting), { rootMargin: '-72px 0px 0px 0px' })
    io.observe(hero)
    return () => io.disconnect()
  }, [])
  return (
    <header className={`top ${solid ? 'top--solid' : ''}`}>
      <a href="#home" className="top__brand" aria-label="POLARIS, back to top">
        <img src="/brand/icon-180.png" alt="" width={36} height={36} />
        <img src="/brand/wordmark.png" alt="" width={116} height={12} className="top__word" />
      </a>
      <nav className="top__nav" aria-label="Sections">
        {SECTIONS.slice(1).map((s) => (
          <a key={s.id} href={`#${s.id}`} aria-current={current === s.id ? 'location' : undefined}>{s.label === 'SRI LANKA' ? 'Sri Lanka' : s.label[0] + s.label.slice(1).toLowerCase()}</a>
        ))}
      </nav>
    </header>
  )
}
