import { ReactNode, useLayoutEffect, useRef } from 'react'

/**
 * One fixed page. If its content is taller than the screen it is scaled down to fit (a transform, so layout
 * is untouched): no scrollbar, and none needed. Floor of 0.5. `scroll` opts out (phones).
 */
export default function Page({ children, scroll = false }: { children: ReactNode; scroll?: boolean }) {
  const page = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (scroll) return // phones keep a normal scrolling page
    const p = page.current!, i = inner.current!
    const fit = () => {
      i.style.transform = 'none'
      const k = Math.max(0.5, Math.min(1, p.clientHeight / i.scrollHeight))
      i.style.transform = k < 1 ? `scale(${k})` : 'none'
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(p); ro.observe(i)
    return () => ro.disconnect()
  }, [scroll])
  return <div ref={page} className={`page${scroll ? ' page--scroll' : ''}`}><div ref={inner} className="page__in">{children}</div></div>
}
