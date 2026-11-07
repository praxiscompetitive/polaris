import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { EASE, finePointer, pointer } from '../motion'
import { SECTIONS, SectionId, useStore } from '../store'
import { navigate } from './Transition'
import Icon from './Icons'

const STEP = 76
const MSTEP = 58

/** Desktop: trunk runs left, a branch drops down from PROJECTS. Mobile: one column, labels always on. */
function layout(mobile: boolean) {
  return SECTIONS.map((s, i) => {
    if (mobile) return { id: s.id, x: 0, y: (i + 1) * MSTEP, from: i === 0 ? -1 : i - 1 }
    if (i < 4) return { id: s.id, x: -(i + 1) * STEP, y: 0, from: i - 1 }
    return { id: s.id, x: -4 * STEP, y: (i - 3) * STEP, from: i === 4 ? 3 : i - 1 }
  })
}

export default function Orb() {
  const { current } = useStore()
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState<SectionId | null>(null)
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 720px)').matches)
  const root = useRef<HTMLElement>(null)
  const orb = useRef<HTMLButtonElement>(null)
  const tl = useRef<gsap.core.Timeline | undefined>(undefined)
  const pts = layout(mobile)

  useEffect(() => {
    const mq = matchMedia('(max-width: 720px)')
    const f = () => setMobile(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])

  // Build the deployment timeline: the mechanism unfolds, nodes travel, lines draw.
  useLayoutEffect(() => {
    const q = gsap.utils.selector(root)
    const nodes = q('.node')
    const segs = q('.seg')
    gsap.set(nodes, { x: 0, y: 0, scale: 0, rotate: -120, autoAlpha: 0 })
    gsap.set(segs, { strokeDashoffset: 1 })
    gsap.set(q('.orbnav__caption'), { autoAlpha: 0, y: -8 })
    const t = gsap.timeline({ paused: true, defaults: { ease: EASE.mech } })
    t.to(q('.orb__ring'), { rotate: (i) => (i ? -100 : 100), scale: 1.28, duration: 0.45, ease: EASE.spring }, 0)
      .to(q('.orb__shell'), { scale: 0.9, duration: 0.3 }, 0)
      .to(q('.orb__core'), { scale: 1.4, duration: 0.3, ease: EASE.spring }, 0)
    pts.forEach((p, i) => {
      const at = 0.12 + i * 0.07
      t.to(nodes[i], { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.5, ease: EASE.spring }, at)
      // leftward first, then downward (branch) — mobile only has the downward leg
      if (!mobile) t.to(nodes[i], { x: p.x, duration: 0.5 }, at)
      if (p.y) t.to(nodes[i], { y: p.y, duration: 0.45 }, mobile ? at : at + 0.3)
      t.to(segs[i], { strokeDashoffset: 0, duration: 0.4, ease: 'none' }, at + 0.15)
    })
    t.to(q('.orbnav__caption'), { autoAlpha: 1, y: 0, duration: 0.4 }, 0.7)
    tl.current = t
    return () => { t.kill() }
  }, [mobile])

  const close = useCallback((refocus = false) => {
    setOpen(false)
    tl.current?.timeScale(1.7).reverse()
    if (refocus) orb.current?.focus()
  }, [])

  const toggle = (e: React.MouseEvent) => {
    if (open) return close()
    setOpen(true)
    tl.current?.timeScale(1).play()
    // keyboard users land on the active node once deployment settles
    if (e.detail === 0)
      tl.current?.eventCallback('onComplete', () =>
        root.current?.querySelector<HTMLElement>(`[data-node="${current}"]`)?.focus())
  }

  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close(true)
    const out = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) close() }
    addEventListener('keydown', key)
    addEventListener('pointerdown', out)
    return () => { removeEventListener('keydown', key); removeEventListener('pointerdown', out) }
  }, [open, close])

  // Orb shell parallax + node anticipation: all in one ticker, only doing work when near/open.
  useEffect(() => {
    if (!finePointer()) return
    const el = root.current!
    const o = orb.current!
    const nodes = [...el.querySelectorAll<HTMLElement>('.node__body')]
    const f = () => {
      const r = o.getBoundingClientRect()
      const dx = pointer.x - (r.left + r.width / 2)
      const dy = pointer.y - (r.top + r.height / 2)
      const d = Math.hypot(dx, dy)
      const near = d < 140
      o.dataset.near = String(near)
      const k = near ? Math.min(1, d / 60) : 0
      o.style.setProperty('--px', String((dx / (d || 1)) * k))
      o.style.setProperty('--py', String((dy / (d || 1)) * k))
      if (!open) return
      nodes.forEach((n) => {
        const nr = n.getBoundingClientRect()
        const ndx = pointer.x - (nr.left + nr.width / 2)
        const ndy = pointer.y - (nr.top + nr.height / 2)
        const nd = Math.hypot(ndx, ndy)
        const pull = nd < 110 && nd > 1 ? (1 - nd / 110) * 4 : 0 // leans toward you, never enough to dodge a click
        n.style.setProperty('--ax', `${(ndx / nd) * pull || 0}px`)
        n.style.setProperty('--ay', `${(ndy / nd) * pull || 0}px`)
      })
    }
    gsap.ticker.add(f)
    return () => gsap.ticker.remove(f)
  }, [open])

  const go = (e: React.MouseEvent, id: SectionId) => {
    e.preventDefault()
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    navigate(id, { x: r.left + r.width / 2, y: r.top + r.height / 2 })
    close()
  }

  const shown = hover ?? current
  const info = SECTIONS.find((s) => s.id === shown)!
  const idx = SECTIONS.findIndex((s) => s.id === shown) + 1

  return (
    <nav ref={root} className={`orbnav ${open ? 'is-open' : ''}`} aria-label="Primary">
      <svg className="orbnav__lines" width="1" height="1" aria-hidden="true">
        {pts.map((p, i) => {
          const a = p.from < 0 ? { x: 0, y: 0 } : pts[p.from]
          const hot = hover === p.id || current === p.id
          return (
            <path key={p.id} className={`seg ${hot ? 'hot' : ''}`} pathLength={1} strokeDasharray={1}
              d={`M${a.x} ${a.y} L${p.x} ${p.y}`} />
          )
        })}
      </svg>
      {pts.map((p) => {
        const s = SECTIONS.find((x) => x.id === p.id)!
        return (
          <a key={p.id} href={`#${p.id}`} className={`node ${current === p.id ? 'is-active' : ''}`} data-node={p.id}
            data-cursor="link" aria-current={current === p.id ? 'location' : undefined}
            onClick={(e) => go(e, p.id)} onPointerEnter={() => setHover(p.id)} onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(p.id)} onBlur={() => setHover(null)}>
            <span className="node__body">
              <Icon id={p.id} />
            </span>
            <span className="node__label">{s.label}</span>
          </a>
        )
      })}
      <div className="orbnav__caption" aria-hidden="true">
        <b>{String(idx).padStart(2, '0')}</b> / {String(SECTIONS.length).padStart(2, '0')}<br />
        {info.label}<br />
        <span>{info.blurb}</span>
      </div>
      <button ref={orb} className="orb" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open}
        onClick={toggle} data-cursor="link">
        <span className="orb__shell" />
        <svg className="orb__rings" viewBox="0 0 60 60" aria-hidden="true">
          <g className="orb__ring"><path d="M8 30a22 22 0 0144 0" /></g>
          <g className="orb__ring"><path d="M52 30a22 22 0 01-44 0" /></g>
        </svg>
        <span className="orb__core" />
        <span className="orb__led" />
      </button>
    </nav>
  )
}
