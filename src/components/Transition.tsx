import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { EASE, reduced, scramble } from '../motion'
import { parse } from '../lib/deeplink'
import { warmMission } from './MissionGate'
import { SECTIONS, SectionId, fromHash, get, setCurrent } from '../store'

/**
 * One transition for the whole site: a circular mask grows from what you pressed, the scene swaps underneath
 * (a page, a map, a map view), the mask retreats. Pages and maps both go through `go`.
 */
let run: ((fn: () => void, label: string, o: { x: number; y: number }) => void) | null = null
let busy = false

export function go(fn: () => void, label = '', o = { x: innerWidth - 40, y: 40 }) {
  if (!run || reduced() || busy) return fn() // a second press mid-flight just lands; the state is always right
  run(fn, label, o)
}

/** Centre of the pressed element, so keyboard activation animates from the control too. */
export const originOf = (el: Element) => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

export function navigate(id: SectionId, origin?: { x: number; y: number }) {
  if (get().current === id && !location.hash.startsWith('#app/')) return
  go(() => {
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id)
    setCurrent(id)
  }, SECTIONS.find((s) => s.id === id)!.label, origin)
}

/** Shared by desktop and mobile: route page links and map links through the transition, keep back/forward in sync. */
export function useSiteNav() {
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return
      const href = a.getAttribute('href')!
      const id = href.slice(1)
      if (SECTIONS.some((s) => s.id === id)) { e.preventDefault(); navigate(id as SectionId, originOf(a)) }
      else if (parse(href)) {
        e.preventDefault()
        go(() => { location.hash = href }, SECTIONS.find((s) => s.id === fromHash(href))!.label, originOf(a))
      }
    }
    const intent = (e: Event) => { if ((e.target as Element).closest?.('a[href^="#app/"]')) warmMission() }
    const sync = () => setCurrent(fromHash())
    for (const t of ['pointerover', 'focusin', 'touchstart']) addEventListener(t, intent, { passive: true })
    addEventListener('click', click)
    addEventListener('popstate', sync)
    addEventListener('hashchange', sync)
    return () => { for (const t of ['pointerover', 'focusin', 'touchstart']) removeEventListener(t, intent); removeEventListener('click', click); removeEventListener('popstate', sync); removeEventListener('hashchange', sync) }
  }, [])
}

export default function Transition() {
  const veil = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    run = (fn, text, o) => {
      busy = true
      const v = veil.current!
      const at = `circle(0px at ${o.x}px ${o.y}px)`
      const full = `circle(${Math.hypot(innerWidth, innerHeight) + 40}px at ${o.x}px ${o.y}px)`
      gsap.set(v, { clipPath: at, autoAlpha: 1 })
      const tl = gsap.timeline({ onComplete: () => { gsap.set(v, { autoAlpha: 0 }); busy = false } })
      tl.to(v, { clipPath: full, duration: 0.5, ease: EASE.mech })
        .add(() => {
          fn()
          scramble(label.current!, text, 320)
        })
        .to(label.current, { autoAlpha: 1, duration: 0.15 }, '<')
        .to(label.current, { autoAlpha: 0, duration: 0.2 }, '+=0.18')
        .to(v, { clipPath: at, duration: 0.45, ease: EASE.mech }, '<0.05')
    }
    return () => { run = null }
  }, [])

  return (
    <div ref={veil} className="veil" aria-hidden="true">
      <span ref={label} className="veil__label" />
    </div>
  )
}
