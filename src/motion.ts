import gsap from 'gsap'

/** One vocabulary of timing/easing for the whole site. */
export const EASE = {
  mech: 'power3.inOut', // Family A — mechanical: precise, controlled stops
  out: 'expo.out', // Family E — architectural reveals
  spring: 'back.out(1.7)', // Family C — gravitational overshoot
  organic: 'elastic.out(1,0.55)', // Family B — organic settle
}
export const DUR = { fast: 0.25, base: 0.6, slow: 1.1 }

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
export const finePointer = () => matchMedia('(pointer: fine)').matches
export const isSmall = () => matchMedia('(max-width: 720px)').matches

/** Single shared pointer tracker — every pointer-driven effect reads from here. */
export const pointer = { x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0, moved: false }
let lx = pointer.x
let ly = pointer.y
addEventListener(
  'pointermove',
  (e) => {
    pointer.x = e.clientX
    pointer.y = e.clientY
    pointer.moved = true
  },
  { passive: true },
)
gsap.ticker.add(() => {
  pointer.vx += (pointer.x - lx - pointer.vx) * 0.35
  pointer.vy += (pointer.y - ly - pointer.vy) * 0.35
  lx = pointer.x
  ly = pointer.y
})

const GLYPHS = '▓▒░/\\|+-=<>#%&01'
/** Family D — digital: scramble then resolve. Returns a cancel fn. */
export function scramble(el: HTMLElement, to: string, ms = 700) {
  if (reduced()) {
    el.textContent = to
    return () => {}
  }
  const start = performance.now()
  let raf = 0
  const tick = (t: number) => {
    const p = Math.min((t - start) / ms, 1)
    el.textContent = [...to]
      .map((c, i) => (c === ' ' || i < p * to.length ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
      .join('')
    if (p < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}
