import { createElement, CSSProperties, Fragment, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { pointer, reduced, scramble } from '../motion'

type Props = {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div'
  className?: string
  /** vf: variable-font weight/width swell near the cursor. push: letters lean away. */
  magnet?: 'vf' | 'push'
  /** scramble the text once when it enters the viewport */
  reveal?: boolean
}

/** Family F — kinetic typography. Letters are real DOM so selection/screen readers still work via aria-label. */
export default function Kinetic({ text, as = 'span', className, magnet, reveal }: Props) {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = root.current!
    const chars = [...el.querySelectorAll<HTMLElement>('.k')]
    let visible = false
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && reveal && !el.dataset.done) {
        el.dataset.done = '1'
        chars.forEach((c, i) => {
          const t = c.dataset.c!
          setTimeout(() => scramble(c, t, 420), i * 28)
        })
      }
    })
    io.observe(el)
    if (!magnet || reduced() || !matchMedia('(pointer: fine)').matches) return () => io.disconnect()

    const tick = () => {
      if (!visible) return
      for (const c of chars) {
        const r = c.getBoundingClientRect()
        const dx = pointer.x - (r.left + r.width / 2)
        const dy = pointer.y - (r.top + r.height / 2)
        const d = Math.hypot(dx, dy)
        const t = Math.max(0, 1 - d / 240)
        if (magnet === 'vf') {
          const w = 300 + t * 500
          const wd = 75 + t * 25
          c.style.fontVariationSettings = `"wght" ${w | 0}, "wdth" ${wd | 0}`
        } else {
          c.style.transform = `translate(${(-dx / (d || 1)) * t * 14}px, ${(-dy / (d || 1)) * t * 14}px) skewX(${t * dx * -0.03}deg)`
        }
      }
    }
    gsap.ticker.add(tick)
    return () => { io.disconnect(); gsap.ticker.remove(tick) }
  }, [text, magnet, reveal])

  const words = text.split(' ')
  let n = 0 // running char index → --i, for CSS-staggered effects
  return createElement(
    as,
    { ref: root, className: `kinetic ${className ?? ''}`, 'aria-label': text },
    words.map((w, wi) =>
      createElement(
        Fragment,
        { key: wi },
        createElement(
          'span',
          { className: 'kw', 'aria-hidden': true },
          [...w].map((c, ci) => createElement('span', { key: ci, className: 'k', 'data-c': c, style: { '--i': n++ } as CSSProperties }, c)),
        ),
        wi < words.length - 1 ? ' ' : null,
      ),
    ),
  )
}
