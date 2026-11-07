import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { EASE, reduced, scramble } from '../motion'
import { SECTIONS, SectionId, get, set } from '../store'

/** Family E: a circular mask grows from the node you chose, the scene swaps underneath, the mask retreats. */
let run: ((id: SectionId, o?: { x: number; y: number }) => void) | null = null
let busy = false

export function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: 'instant' as ScrollBehavior })
}

/** Navigate with a transition, keeping browser history in sync. */
export function navigate(id: SectionId, origin?: { x: number; y: number }, hash = id) {
  if (location.hash !== '#' + hash) history.pushState({ id }, '', '#' + hash)
  if (!run || reduced() || busy) return scrollToSection(id)
  run(id, origin)
}

/** Shared by desktop and mobile: track the section under the viewport midline, route in-page anchors through navigate. */
export function useSiteNav() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (!e.isIntersecting) return
        const id = (e.target as HTMLElement).dataset.section as SectionId
        if (!SECTIONS.some((s) => s.id === id)) return
        const s = get()
        set({ current: id, visited: s.visited.includes(id) ? s.visited : [...s.visited, id] })
      }),
      { rootMargin: '-50% 0px -50% 0px' },
    )
    document.querySelectorAll('[data-section]').forEach((el) => io.observe(el))
    const click = (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return
      const id = a.getAttribute('href')!.slice(1)
      if (!SECTIONS.some((s) => s.id === id)) return
      e.preventDefault()
      navigate(id as SectionId, { x: e.clientX, y: e.clientY })
    }
    addEventListener('click', click)
    return () => { io.disconnect(); removeEventListener('click', click) }
  }, [])
}

export default function Transition() {
  const veil = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    run = (id, o = { x: innerWidth - 40, y: 40 }) => {
      busy = true
      const v = veil.current!
      const at = `circle(0px at ${o.x}px ${o.y}px)`
      const full = `circle(${Math.hypot(innerWidth, innerHeight) + 40}px at ${o.x}px ${o.y}px)`
      gsap.set(v, { clipPath: at, autoAlpha: 1 })
      const tl = gsap.timeline({ onComplete: () => { gsap.set(v, { autoAlpha: 0 }); busy = false } })
      tl.to(v, { clipPath: full, duration: 0.5, ease: EASE.mech })
        .add(() => {
          scrollToSection(id)
          scramble(label.current!, SECTIONS.find((s) => s.id === id)!.label, 320)
        })
        .to(label.current, { autoAlpha: 1, duration: 0.15 }, '<')
        .to(label.current, { autoAlpha: 0, duration: 0.2 }, '+=0.18')
        .to(v, { clipPath: at, duration: 0.45, ease: EASE.mech }, '<0.05')
    }
    const onPop = () => {
      const id = location.hash.slice(1).split('/')[0] as SectionId
      if (SECTIONS.some((s) => s.id === id)) scrollToSection(id)
    }
    addEventListener('popstate', onPop)
    // Direct links: land on the hash once layout exists.
    requestAnimationFrame(() => requestAnimationFrame(onPop))
    return () => { run = null; removeEventListener('popstate', onPop) }
  }, [])

  return (
    <div ref={veil} className="veil" aria-hidden="true">
      <span ref={label} className="veil__label" />
    </div>
  )
}
