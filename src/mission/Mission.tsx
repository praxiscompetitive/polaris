import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, LinkSimple, SlidersHorizontal, X } from '@phosphor-icons/react'
import { Layer, layer, LAYERS } from '../data/layers'
import { region, REGIONS } from '../data/regions'
import { source } from '../data/sources'
import { marine, weather } from '../data/feeds'
import { Cam, Link, serialize, View, VIEWS } from '../lib/deeplink'
import { fmtLL } from '../components/Hero'
import { go, originOf } from '../components/Transition'
import Globe, { Cesium, Stack } from './Globe'
import LayerPanel from './views/Layers'
import Monitor from './views/Monitor'
import Events, { EonetOverlay, EvDetail, Picked } from './views/Events'
import Observatory from './views/Observatory'
import RegionPanel from './views/Region'

export type MState = Link & { o: number }
export type VP = { st: MState; set: (p: Partial<MState>) => void; viewer: Cesium.Viewer; mobile: boolean; fly: (c: Cam) => void }

const LK = REGIONS[0]
const DEFAULTS: Record<View, Partial<MState>> = {
  explorer: { l: ['viirs', 'labels'], c: [78, 18, 16e6] },
  ocean: { l: ['relief', 'sst', 'coastlines'], c: [78, 2, 9e6], o: 0.85 },
  monitor: { l: ['relief', 'ndvi', 'coastlines'], t: '2026-05-09', cmp: '2026-09-14', c: [80, 19, 5.5e6] },
  events: { l: ['nightlights'], c: [40, 20, 22e6] },
  observatory: { l: ['bluemarble'], c: [20, 10, 24e6] },
  region: { l: ['viirs', 'sst', 'coastlines'], r: LK.id, c: LK.cam, o: 0.7 },
}
export const TITLES: Record<View, string> = { explorer: 'Explorer', ocean: 'Ocean', monitor: 'Monitor', events: 'Events', observatory: 'Observatory', region: 'Sri Lanka' }

function withDefaults(k: Link): MState {
  const d = DEFAULTS[k.view]
  const r = k.view === 'region' ? region(k.r ?? LK.id) ?? LK : undefined
  return {
    view: k.view,
    l: k.l.length ? k.l : d.l!,
    t: k.t ?? (k.l.length ? undefined : d.t),
    cmp: k.cmp ?? (k.l.length ? undefined : d.cmp),
    c: k.c ?? (r ? r.cam : d.c),
    o: k.o ?? d.o ?? 1,
    r: r?.id ?? k.r,
  }
}

/** Order the selection into a draw stack: one base, data overlays, the compared layer twice (left/right), reference on top. */
function buildStack(st: MState): Stack {
  const sel = st.l.map(layer).filter((l): l is Layer => !!l)
  const base = sel.find((l) => !l.overlay) ?? layer('bluemarble')!
  const over = LAYERS.filter((l) => l.overlay && sel.includes(l))
  const data = over.filter((l) => l.group !== 'reference'), ref = over.filter((l) => l.group === 'reference')
  const cmpL = st.view === 'monitor' && st.cmp ? [...data].reverse().find((l) => l.from) ?? (base.from ? base : undefined) : undefined
  const s: Stack = []
  if (cmpL === base) s.push({ layer: base, t: st.t, side: 'left' }, { layer: base, t: st.cmp, side: 'right' })
  else s.push({ layer: base, t: st.t })
  for (const l of data) {
    if (l === cmpL) s.push({ layer: l, t: st.t, side: 'left' }, { layer: l, t: st.cmp, side: 'right' })
    else s.push({ layer: l, t: st.t })
  }
  return [...s, ...ref.map((l) => ({ layer: l }))]
}

type Probe = { lat: number; lon: number; loading?: boolean; sea?: { sst: number | null; cur: number | null; dir: number | null; wave: number | null }; land?: { temp: number; rh: number; wind: number }; time?: string; error?: string }

export default function Mission({ link, mobile }: { link: Link; mobile: boolean }) {
  const [st, setSt] = useState(() => withDefaults(link))
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null)
  const [camKey, setCamKey] = useState('init')
  const [split, setSplit] = useState(0.5)
  const [probe, setProbe] = useState<Probe | null>(null)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [panel, setPanel] = useState(!mobile)
  const [copied, setCopied] = useState(false)
  const stRef = useRef(st)
  stRef.current = st
  const root = useRef<HTMLDivElement>(null)

  const set = useCallback((p: Partial<MState>) => setSt((s) => ({ ...s, ...p })), [])
  const fly = useCallback((c: Cam) => { setSt((s) => ({ ...s, c })); setCamKey(String(Math.random())) }, [])

  // external navigation (tabs, terminal, back/forward, pasted link) re-seeds the state
  const ext = serialize(link)
  useEffect(() => {
    if (ext === serialize(stRef.current)) return
    const next = withDefaults(link)
    setSt(next)
    setProbe(null); setPicked(null)
    if (next.c) setCamKey(ext)
  }, [ext])

  // our own changes write the URL without adding history entries: the address bar is always a shareable link
  useEffect(() => {
    const h = serialize(st)
    if (location.hash !== h) history.replaceState(history.state, '', h)
  }, [st])

  // focus the dialog on open, Escape closes, the landing page is inert underneath
  useEffect(() => {
    root.current?.focus()
    const page = document.getElementById('root')! // the mission is portalled to <body>, so the whole page can go inert
    page.inert = true
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !(e.target as HTMLElement).closest('input, select')) close() }
    addEventListener('keydown', key)
    return () => { page.inert = false; removeEventListener('keydown', key) }
  }, [])

  // the same circular transition as the pages: closing, and moving between views
  const close = (o?: { x: number; y: number }) => go(() => { location.hash = `#${stRef.current.view}` }, TITLES[stRef.current.view].toUpperCase(), o ?? { x: 60, y: 28 })
  const tab = (v: View, o: { x: number; y: number }) => go(() => { location.hash = serialize({ view: v, l: [] }) }, TITLES[v].toUpperCase(), o)
  const share = async () => {
    try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { prompt('Copy this link', location.href) }
  }

  const onPick = useCallback(async ({ lat, lon, id }: { lat: number; lon: number; id?: unknown }) => {
    if (stRef.current.view === 'observatory') return
    if (id && typeof id === 'object' && 'kind' in (id as object)) { setPicked(id as Picked); setProbe(null); return }
    setPicked(null)
    setProbe({ lat, lon, loading: true })
    try {
      const [m] = await marine([{ lat, lon }])
      if (m.sst != null) return setProbe({ lat, lon, sea: m, time: m.time })
      const [w] = await weather([{ name: '', lat, lon }])
      setProbe({ lat, lon, land: w, time: w.time })
    } catch (e) {
      setProbe({ lat, lon, error: (e as Error).message })
    }
  }, [])

  const stack = useMemo(() => buildStack(st), [st])
  const comparing = stack.some((s) => s.side)
  const legends = [...new Map(stack.filter((s) => s.layer.overlay && s.layer.group !== 'reference').map((s) => [s.layer.id, s.layer])).values()]
  const vp: VP | null = viewer && { st, set, viewer, mobile, fly }

  return (
    <div ref={root} className={`mission ${mobile ? 'mission--mobile' : ''} mission--${st.view}`} role="dialog" aria-modal="true" aria-label={`POLARIS ${TITLES[st.view]}`} tabIndex={-1}>
      <Globe stack={stack} opacity={st.o} cam={st.c} camKey={camKey} split={split} mobile={mobile}
        onReady={setViewer} onCamera={(c) => setSt((s) => ({ ...s, c }))} onPick={onPick} />

      <header className="mbar">
        <button className="mbar__back" onClick={(e) => close(originOf(e.currentTarget))} aria-label="Close and return to the overview"><ArrowLeft size={18} /><img src="/brand/icon-180.png" alt="" width={26} height={26} /><span>POLARIS</span></button>
        <nav className="mbar__tabs" aria-label="Views">
          {VIEWS.map((v) => <button key={v} aria-current={st.view === v ? 'page' : undefined} onClick={(e) => tab(v, originOf(e.currentTarget))}>{TITLES[v]}</button>)}
        </nav>
        <button className="mbar__share" onClick={share} aria-live="polite">{copied ? <><Check size={16} /> Copied</> : <><LinkSimple size={16} /> Share view</>}</button>
      </header>

      {vp && (
        <>
          {mobile && <button className="panel__toggle" aria-expanded={panel} onClick={() => setPanel(!panel)}><SlidersHorizontal size={18} /> {panel ? 'Hide controls' : 'Controls'}</button>}
          <aside className={`panel ${panel ? 'is-open' : ''}`} aria-label={`${TITLES[st.view]} controls`}>
            {st.view === 'explorer' && <><LayerPanel {...vp} groups={['base', 'land', 'weather', 'hazard', 'reference']} places /><EonetToggle {...vp} /></>}
            {st.view === 'ocean' && <LayerPanel {...vp} groups={['base', 'ocean', 'reference']} places="ocean" />}
            {st.view === 'monitor' && <Monitor {...vp} />}
            {st.view === 'events' && <Events {...vp} />}
            {st.view === 'region' && <RegionPanel {...vp} />}
          </aside>
          {st.view === 'observatory' && <Observatory />}
        </>
      )}

      {st.view !== 'observatory' && <Hint mobile={mobile} />}
      {comparing && <Divider split={split} setSplit={setSplit} left={st.t ?? 'latest'} right={st.cmp!} />}

      {legends.length > 0 && st.view !== 'observatory' && (
        <section className="legend" aria-label="Legend">
          {legends.map((l) => (
            <div key={l.id} className="legend__item">
              <b>{l.title}</b>
              {l.legend && <img src={l.legend} alt={`Colour scale for ${l.title}`} loading="lazy" />}
              <p>{l.res} · {l.period}. <a href={source(l.src).url} target="_blank" rel="noreferrer">{source(l.src).provider}</a></p>
            </div>
          ))}
        </section>
      )}

      {probe && (
        <section className="probe" aria-live="polite" aria-label="Point readout">
          <button className="probe__x" onClick={() => setProbe(null)} aria-label="Close readout"><X size={14} /></button>
          <p className="mono">{fmtLL(probe.lat, probe.lon)}</p>
          {probe.loading && <p className="skel" />}
          {probe.error && <p className="err">Readout unavailable: {probe.error}</p>}
          {probe.sea && (
            <dl>
              <div><dt>Sea surface temp.</dt><dd>{probe.sea.sst?.toFixed(1)} °C</dd></div>
              {probe.sea.cur != null && <div><dt>Current</dt><dd>{probe.sea.cur.toFixed(1)} km/h toward {probe.sea.dir}°</dd></div>}
              {probe.sea.wave != null && <div><dt>Wave height</dt><dd>{probe.sea.wave.toFixed(1)} m</dd></div>}
            </dl>
          )}
          {probe.land && (
            <dl>
              <div><dt>Air temperature</dt><dd>{probe.land.temp.toFixed(1)} °C</dd></div>
              <div><dt>Humidity</dt><dd>{probe.land.rh}%</dd></div>
              <div><dt>Wind</dt><dd>{probe.land.wind.toFixed(0)} km/h</dd></div>
            </dl>
          )}
          {probe.time && <p className="note">Model values (Open-Meteo), {probe.time.replace('T', ' ')} UTC. Not read from the map colours.</p>}
        </section>
      )}
      {picked && <EvDetail p={picked} onClose={() => setPicked(null)} />}
    </div>
  )
}

function EonetToggle(vp: VP) {
  const [on, setOn] = useState(true)
  return (
    <fieldset className="pgroup">
      <legend>Overlays</legend>
      <label className="pcheck"><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> Natural events now (NASA EONET)</label>
      {on && <EonetOverlay viewer={vp.viewer} />}
    </fieldset>
  )
}

/** First visit only: how to drive the globe. Leaves on its own after the first drag, or on dismiss. */
function Hint({ mobile }: { mobile: boolean }) {
  const [show, setShow] = useState(() => { try { return !localStorage.getItem('polaris.hint') } catch { return true } })
  useEffect(() => {
    if (!show) return
    const done = () => { setShow(false); try { localStorage.setItem('polaris.hint', '1') } catch { /* private mode */ } }
    const t = setTimeout(() => addEventListener('pointerdown', done, { once: true }), 1500)
    return () => { clearTimeout(t); removeEventListener('pointerdown', done) }
  }, [show])
  if (!show) return null
  return (
    <p className="hint" role="status">
      {mobile ? 'Drag to turn the Earth, pinch to zoom, tap for a reading.' : 'Drag to turn the Earth, scroll to zoom, right-drag to tilt, click for a reading.'}
    </p>
  )
}

/** Drag the seam of a comparison. Pointer and keyboard (arrow keys via the range input). */
function Divider({ split, setSplit, left, right }: { split: number; setSplit: (n: number) => void; left: string; right: string }) {
  const drag = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => setSplit(Math.min(0.98, Math.max(0.02, ev.clientX / innerWidth)))
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up) }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }
  return (
    <div className="divider" style={{ left: `${split * 100}%` }}>
      <span className="divider__tag divider__tag--l mono">{left}</span>
      <span className="divider__tag divider__tag--r mono">{right}</span>
      <div className="divider__handle" onPointerDown={drag}>
        <input type="range" min={2} max={98} value={Math.round(split * 100)} onChange={(e) => setSplit(+e.target.value / 100)} aria-label={`Comparison divider: ${left} on the left, ${right} on the right`} />
      </div>
    </div>
  )
}

