import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, X } from '@phosphor-icons/react'
import { eonet, Ev, fires, quakes } from '../../data/feeds'
import { useData } from '../../lib/api'
import { Cesium } from '../Globe'
import type { VP } from '../Mission'

/** Fixed category order and colours, validated (CVD and contrast) against the midnight surface. */
const CATS = [
  { id: 'earthquakes', title: 'Earthquakes', color: '#3987e5' },
  { id: 'wildfires', title: 'Wildfires', color: '#d95926' },
  { id: 'floods', title: 'Floods', color: '#199e70' },
  { id: 'severeStorms', title: 'Severe storms', color: '#c98500' },
  { id: 'volcanoes', title: 'Volcanoes', color: '#d55181' },
  { id: 'other', title: 'Other (ice, dust, drought, landslides)', color: '#2399ba' },
] as const
const catOf = (c: string) => (CATS.some((k) => k.id === c) ? c : 'other')
const colorOf = (c: string) => CATS.find((k) => k.id === catOf(c))!.color

export type Picked = { kind: 'eonet' | 'quake' | 'fire'; title: string; sub: string; time?: number; link?: string; src: string }
type Pt = { lat: number; lon: number; color: string; size: number; id: Picked }

/** One primitive collection per call site: tens of thousands of points stay at 60 fps, no DOM. */
function usePoints(viewer: Cesium.Viewer, pts: Pt[]) {
  const col = useRef<Cesium.PointPrimitiveCollection | null>(null)
  useEffect(() => {
    col.current = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection())
    return () => { if (!viewer.isDestroyed()) viewer.scene.primitives.remove(col.current!); viewer.isDestroyed() || viewer.scene.requestRender() }
  }, [viewer])
  useEffect(() => {
    const c = col.current!
    c.removeAll()
    const ring = Cesium.Color.fromCssColorString('#071526')
    for (const p of pts)
      c.add({ position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat), color: Cesium.Color.fromCssColorString(p.color), pixelSize: p.size,
        outlineColor: ring, outlineWidth: p.size > 4 ? 2 : 0, id: p.id, disableDepthTestDistance: 0 })
    viewer.scene.requestRender()
  }, [pts, viewer])
}

const evPick = (e: Ev): Picked => ({ kind: 'eonet', title: e.title, sub: `${e.catTitle}${e.mag ? `, ${e.mag}` : ''}${e.closed ? ', closed' : ', open'}`, time: e.time, link: e.link, src: `EONET via ${e.src}` })

/** Explorer's light overlay: open EONET events from the last 30 days. */
export function EonetOverlay({ viewer }: { viewer: Cesium.Viewer }) {
  const d = useData((s) => eonet(30, s), [])
  const pts = useMemo(() => (d.data ?? []).filter((e) => !e.closed).map((e) => ({ lat: e.lat, lon: e.lon, color: colorOf(e.cat), size: 8, id: evPick(e) })), [d.data])
  usePoints(viewer, pts)
  return <p className="note">{d.loading ? 'Loading events.' : d.error ? `EONET unavailable (${d.error}).` : `${new Set(d.data!.filter((e) => !e.closed).map((e) => e.id)).size} open events. Select one on the globe.`}</p>
}

const DAY = 864e5
const fmtDate = (t: number) => new Date(t).toISOString().slice(0, 10)

export default function Events({ viewer, fly }: VP) {
  const [days, setDays] = useState(30)
  const [upto, setUpto] = useState(days)
  const [playing, setPlaying] = useState(false)
  const [off, setOff] = useState<Set<string>>(new Set())
  const ev = useData((s) => eonet(days, s), [days])
  const eq = useData((s) => quakes(days <= 1 ? 'day' : days <= 7 ? 'week' : 'month', s), [days])
  const fi = useData((s) => fires(s), [])
  const start = Date.now() - days * DAY
  const cut = start + upto * DAY

  useEffect(() => setUpto(days), [days])
  useEffect(() => {
    if (!playing) return
    const step = Math.max(1, Math.round(days / 60))
    const id = setInterval(() => setUpto((u) => { if (u >= days) { setPlaying(false); return days } return Math.min(days, u + step) }), 120)
    return () => clearInterval(id)
  }, [playing, days])

  const shown = useMemo(() => (ev.data ?? []).filter((e) => e.time >= start && e.time <= cut && !off.has(catOf(e.cat))), [ev.data, cut, off])
  const qs = useMemo(() => (off.has('earthquakes') ? [] : (eq.data ?? []).filter((q) => q.time >= start && q.time <= cut)), [eq.data, cut, off])
  const pts = useMemo<Pt[]>(() => [
    ...(!off.has('wildfires') && upto === days ? (fi.data?.pts ?? []).map(([lat, lon, frp]) => ({ lat, lon, color: colorOf('wildfires'), size: 3,
      id: { kind: 'fire' as const, title: 'Active fire detection', sub: `Fire radiative power ${frp} MW`, src: 'NASA FIRMS, VIIRS S-NPP, last 24 h' } })) : []),
    ...shown.map((e) => ({ lat: e.lat, lon: e.lon, color: colorOf(e.cat), size: 8, id: evPick(e) })),
    ...qs.map((q) => ({ lat: q.lat, lon: q.lon, color: colorOf('earthquakes'), size: Math.max(5, (q.mag - 2) * 4),
      id: { kind: 'quake' as const, title: `M${q.mag.toFixed(1)} ${q.place}`, sub: `Depth ${q.depth.toFixed(0)} km`, time: q.time, link: q.url, src: 'USGS' } })),
  ], [shown, qs, fi.data, off, upto, days])
  usePoints(viewer, pts)

  const counts = new Map<string, number>()
  shown.forEach((e) => counts.set(catOf(e.cat), (counts.get(catOf(e.cat)) ?? 0) + 1))
  const latest = [...new Map([...shown].sort((a, b) => a.time - b.time).map((e) => [e.id, e])).values()].sort((a, b) => b.time - a.time).slice(0, 40)
  const toggle = (id: string) => setOff((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <>
      <fieldset className="pgroup">
        <legend>Window</legend>
        <div className="pills" role="radiogroup" aria-label="Time window">
          {[7, 30, 90, 365].map((d) => <button key={d} role="radio" aria-checked={days === d} className="pill" onClick={() => setDays(d)}>{d} days</button>)}
        </div>
        <div className="prow">
          <button className="pbtn" onClick={() => { if (upto >= days) setUpto(0); setPlaying(!playing) }} aria-label={playing ? 'Pause timeline' : 'Play timeline'}>
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <input type="range" min={0} max={days} value={upto} onChange={(e) => { setPlaying(false); setUpto(+e.target.value) }} aria-label="Show events up to date" aria-valuetext={fmtDate(cut)} />
        </div>
        <p className="note">Up to {fmtDate(cut)}. {days > 30 && 'USGS summary feeds cover the last 30 days only. '}Fire hotspots show the last 24 hours, at the end of the timeline.</p>
      </fieldset>

      <fieldset className="pgroup">
        <legend>Categories</legend>
        {CATS.map((c) => (
          <label key={c.id} className="pcheck">
            <input type="checkbox" checked={!off.has(c.id)} onChange={() => toggle(c.id)} />
            <i className="swatch" style={{ background: c.color }} />
            <span>{c.title}<small>{c.id === 'earthquakes' ? `${qs.length} M2.5+ (USGS)` : `${counts.get(c.id) ?? 0} positions (EONET)`}{c.id === 'wildfires' && fi.data ? `, ${fi.data.count.toLocaleString()} hotspots (FIRMS)` : ''}</small></span>
          </label>
        ))}
        {ev.error && <p className="err">EONET: {ev.error}</p>}
        {eq.error && <p className="err">USGS: {eq.error}</p>}
        {fi.error && <p className="note">{fi.error === 'not-configured' ? 'FIRMS hotspots need FIRMS_MAP_KEY on the server.' : `FIRMS: ${fi.error}`}</p>}
        {(ev.loading || eq.loading) && <p className="note">Loading feeds.</p>}
      </fieldset>

      <fieldset className="pgroup">
        <legend>Most recent</legend>
        {latest.length === 0 && !ev.loading && <p className="note">No events in this window and selection.</p>}
        <ul className="evlist">
          {latest.map((e) => (
            <li key={e.id}>
              <button onClick={() => fly([e.lon, e.lat, 1_500_000])}>
                <i className="swatch" style={{ background: colorOf(e.cat) }} />
                <span>{e.title}<small>{fmtDate(e.time)}, {e.catTitle}</small></span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
    </>
  )
}

export function EvDetail({ p, onClose }: { p: Picked; onClose: () => void }) {
  return (
    <section className="probe" aria-live="polite" aria-label="Event details">
      <button className="probe__x" onClick={onClose} aria-label="Close details"><X size={14} /></button>
      <h3>{p.title}</h3>
      <p>{p.sub}</p>
      {p.time && <p className="mono">{new Date(p.time).toISOString().replace('T', ' ').slice(0, 16)} UTC</p>}
      <p className="note">Source: {p.src}. {p.link && <a href={p.link} target="_blank" rel="noreferrer">Original report</a>}</p>
    </section>
  )
}
