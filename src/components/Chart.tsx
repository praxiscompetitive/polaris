import { useEffect, useId, useMemo, useRef, useState } from 'react'

/**
 * Line chart in plain SVG: one y-axis, recessive grid, 2px lines, crosshair + tooltip on hover/focus,
 * a legend for 2+ series, and the numbers available as a table. Palette validated for the midnight surface.
 */
export type Series = { name: string; color: string; pts: [x: number, y: number | null][]; dash?: boolean }
type Props = {
  title: string
  series: Series[]
  xFmt: (x: number) => string
  xTicks: number[]
  yFmt: (y: number) => string
  height?: number
  zero?: boolean // draw y = 0 as the baseline (anomalies)
}

const P = { l: 48, r: 16, t: 12, b: 26 }

export default function Chart({ title, series, xFmt, xTicks, yFmt, height = 260, zero }: Props) {
  const id = useId()
  const [hx, setHx] = useState<number | null>(null)
  // the viewBox tracks the real width, so 11px tick labels stay 11px at any size
  const box = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(720)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(box.current!)
    return () => ro.disconnect()
  }, [])
  const H = height
  const { x0, x1, y0, y1, yTicks } = useMemo(() => {
    const xs = series.flatMap((s) => s.pts.map((p) => p[0]))
    const ys = series.flatMap((s) => s.pts.map((p) => p[1]).filter((v): v is number => v != null))
    let lo = Math.min(...ys), hi = Math.max(...ys)
    if (zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0) }
    const step = niceStep((hi - lo) / 4)
    lo = Math.floor(lo / step) * step
    hi = Math.ceil(hi / step) * step
    const yTicks: number[] = []
    for (let v = lo; v <= hi + step / 2; v += step) yTicks.push(+v.toFixed(6))
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: lo, y1: hi, yTicks }
  }, [series, zero])

  const sx = (x: number) => P.l + ((x - x0) / (x1 - x0 || 1)) * (W - P.l - P.r)
  const sy = (y: number) => H - P.b - ((y - y0) / (y1 - y0 || 1)) * (H - P.t - P.b)
  const path = (s: Series) => s.pts.reduce((d, [x, y], i) => (y == null ? d : d + (i && s.pts[i - 1][1] != null ? 'L' : 'M') + sx(x).toFixed(1) + ' ' + sy(y).toFixed(1)), '')

  // hover snaps to the nearest x of the first series
  const xsAll = series[0].pts.map((p) => p[0])
  const near = (px: number) => {
    const x = x0 + ((px - P.l) / (W - P.l - P.r)) * (x1 - x0)
    return xsAll.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a))
  }
  const at = (s: Series, x: number) => s.pts.find((p) => p[0] === x)?.[1]
  const move = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
    setHx(near(((e.clientX - r.left) / r.width) * W))
  }
  const key = (e: React.KeyboardEvent) => {
    const i = hx == null ? xsAll.length - 1 : xsAll.indexOf(hx)
    if (e.key === 'ArrowLeft') setHx(xsAll[Math.max(0, i - 1)])
    else if (e.key === 'ArrowRight') setHx(xsAll[Math.min(xsAll.length - 1, i + 1)])
    else return
    e.preventDefault()
  }
  const tipLeft = hx != null && sx(hx) > W * 0.6

  return (
    <figure className="chart">
      {series.length > 1 && (
        <ul className="chart__legend" aria-label="Legend">
          {series.map((s) => <li key={s.name}><i style={{ background: s.color }} className={s.dash ? 'dash' : ''} />{s.name}</li>)}
        </ul>
      )}
      <div ref={box} className="chart__plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={id} tabIndex={0} onKeyDown={key} onBlur={() => setHx(null)}>
          <title id={id}>{title}. Use left and right arrow keys to read values.</title>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={P.l} x2={W - P.r} y1={sy(v)} y2={sy(v)} className={zero && v === 0 ? 'chart__zero' : 'chart__grid'} />
              <text x={P.l - 8} y={sy(v) + 4} textAnchor="end" className="chart__tick">{yFmt(v)}</text>
            </g>
          ))}
          {xTicks.map((x) => <text key={x} x={sx(x)} y={H - 6} textAnchor="middle" className="chart__tick">{xFmt(x)}</text>)}
          {series.map((s) => <path key={s.name} d={path(s)} stroke={s.color} strokeDasharray={s.dash ? '4 4' : undefined} className="chart__line" />)}
          {hx != null && (
            <g pointerEvents="none">
              <line x1={sx(hx)} x2={sx(hx)} y1={P.t} y2={H - P.b} className="chart__cross" />
              {series.map((s) => { const v = at(s, hx); return v == null ? null : <circle key={s.name} cx={sx(hx)} cy={sy(v)} r={4.5} fill={s.color} className="chart__dot" /> })}
            </g>
          )}
          <rect x={P.l} y={P.t} width={W - P.l - P.r} height={H - P.t - P.b} fill="transparent" onPointerMove={move} onPointerLeave={() => setHx(null)} />
        </svg>
        {hx != null && (
          <div className="chart__tip mono" style={{ left: `${(sx(hx) / W) * 100}%`, transform: `translateX(${tipLeft ? 'calc(-100% - 12px)' : '12px'})` }}>
            <b>{xFmt(hx)}</b>
            {series.map((s) => { const v = at(s, hx); return v == null ? null : <span key={s.name}><i style={{ background: s.color }} />{s.name} {yFmt(v)}</span> })}
          </div>
        )}
      </div>
      <details className="chart__table">
        <summary className="mono">Data table</summary>
        <div className="chart__scroll">
          <table>
            <thead><tr><th scope="col">x</th>{series.map((s) => <th key={s.name} scope="col">{s.name}</th>)}</tr></thead>
            <tbody>
              {xsAll.map((x) => <tr key={x}><th scope="row">{xFmt(x)}</th>{series.map((s) => { const v = at(s, x); return <td key={s.name}>{v == null ? '' : yFmt(v)}</td> })}</tr>)}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}

function niceStep(raw: number) {
  const p = 10 ** Math.floor(Math.log10(raw || 1))
  const n = raw / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}
