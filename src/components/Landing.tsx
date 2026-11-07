import { CSSProperties, useState } from 'react'
import { Layer, LAYERS } from '../data/layers'
import { REGIONS } from '../data/regions'
import { SOURCES } from '../data/sources'
import { co2, eonet, gistemp, marine, quakes, sstDaily } from '../data/feeds'
import { useData } from '../lib/api'
import { daysAgo, snapshot } from '../lib/wms'
import Chart from './Chart'

/** The five experiences, the featured region and the sources, as landing sections. Shared by desktop and mobile. */

const C1 = '#2399ba' // chart palette, validated against #071526
const LK = REGIONS[0]

function Snap({ src, alt, w, h, caption }: { src: string; alt: string; w: number; h: number; caption: string }) {
  const [state, setState] = useState<'load' | 'ok' | 'err'>('load')
  return (
    <figure className={`snap snap--${state}`}>
      <div className="snap__frame" style={{ aspectRatio: `${w} / ${h}` }}>
        {state !== 'err'
          ? <img src={src} alt={alt} width={w} height={h} loading="lazy" decoding="async" onLoad={() => setState('ok')} onError={() => setState('err')} />
          : <p className="snap__err">NASA GIBS did not return this image. The layer is still available on the globe.</p>}
      </div>
      <figcaption className="mono">{caption}</figcaption>
    </figure>
  )
}

export function Explorer() {
  const t = daysAgo(2)
  // ten layers: two rows of five on wide screens. MODIS true colour is left to the globe (VIIRS covers the same look)
  const pick = LAYERS.filter((l) => (l.group === 'base' || l.group === 'land') && l.id !== 'truecolor')
  return (
    <section id="explorer" data-section="explorer" className="sec sec--explorer" aria-labelledby="h-explorer">
      <Snap src={snapshot(['VIIRS_NOAA20_CorrectedReflectance_TrueColor', 'Coastlines_15m'], [62, 8, 102, 23], 1600, 600, t)}
        alt={`True-colour satellite view of South Asia and the Bay of Bengal on ${t}`} w={1600} h={600}
        caption={`South Asia, ${t}. VIIRS NOAA-20 true colour via NASA GIBS.`} />
      <div className="sec__body">
        <h2 id="h-explorer" className="h2">Every layer, one globe.</h2>
        <p className="lead">Switch between true colour, vegetation, land temperature, night lights, population and elevation. Daily imagery goes back to 2000.</p>
      </div>
      <ul className="gallery" aria-label="Open the globe with a layer">
        {pick.map((l) => (
          <li key={l.id}>
            <a href={`#app/explorer?l=${l.overlay ? `relief,${l.id}` : l.id}`} className="gallery__card">
              <Thumb l={l} />
              <span className="gallery__t">{l.title}</span>
              <span className="gallery__m mono">{l.res}, {l.period.toLowerCase()}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** A whole-Earth thumbnail of the layer itself, straight from GIBS (overlays drawn on shaded relief). */
function Thumb({ l }: { l: Layer }) {
  const [err, setErr] = useState(false)
  const src = l.kind === 'gibs'
    ? snapshot(l.overlay ? ['BlueMarble_ShadedRelief_Bathymetry', l.ref] : [l.ref], [-180, -90, 180, 90], 480, 240, l.step === 'P1D' ? daysAgo(2) : undefined) // daily: a complete day; composites: GIBS default (newest)
    : null
  return (
    <span className="gallery__img">
      {src && !err && <img src={src} alt="" width={480} height={240} loading="lazy" decoding="async" onError={() => setErr(true)} />}
      {!src && <>{/* plain XYZ layers: their own z0 tile over the matching Web Mercator base tile */}
        <img src="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/default/GoogleMapsCompatible_Level8/0/0/0.jpeg" alt="" width={256} height={256} loading="lazy" />
        <img src={l.ref.replace('{z}/{x}/{y}', '0/0/0')} alt="" width={256} height={256} loading="lazy" className="gallery__over" />
      </>}
    </span>
  )
}

/** One live ticker: real readings from five agencies. Pauses on hover and focus; static under reduced motion. */
export function LiveStrip() {
  const ev = useData((s) => eonet(30, s), [])
  const eq = useData((s) => quakes('week', s), [])
  const c = useData((s) => co2(s), [])
  const g = useData((s) => gistemp(s), [])
  const m = useData((s) => marine([LK.coast[1]], 0, s), [])
  const open = ev.data?.filter((e) => !e.closed)
  const fires = open && new Set(open.filter((e) => e.cat === 'wildfires').map((e) => e.id)).size
  const storms = open && new Set(open.filter((e) => e.cat === 'severeStorms').map((e) => e.id)).size
  const big = eq.data?.reduce((p, q) => (q.mag > p.mag ? q : p))
  const lc = c.data?.at(-1), ly = g.data?.annual.at(-1)
  const items = [
    eq.data && { k: 'USGS', v: `${eq.data.length} earthquakes of M2.5+ in the last 7 days` },
    big && { k: 'USGS', v: `Largest this week: M${big.mag.toFixed(1)}, ${big.place}` },
    fires != null && { k: 'NASA EONET', v: `${fires} wildfires open` },
    storms != null && { k: 'NASA EONET', v: `${storms} severe storms tracked` },
    lc && { k: 'NOAA', v: `CO₂ at Mauna Loa ${lc.ppm.toFixed(1)} ppm (${lc.y}-${String(lc.m).padStart(2, '0')})` },
    ly && { k: 'NASA GISS', v: `${ly[0]} was ${ly[1] > 0 ? '+' : ''}${ly[1].toFixed(2)} °C against 1951-1980` },
    m.data?.[0]?.sst != null && { k: 'Open-Meteo', v: `Sea off Galle ${m.data[0].sst.toFixed(1)} °C now (model)` },
  ].filter(Boolean) as { k: string; v: string }[]
  if (!items.length) return <div className="strip strip--load" aria-hidden="true"><span className="skel" /></div>
  const row = (hidden?: boolean) => (
    <ul className="strip__row" aria-hidden={hidden || undefined}>
      {items.map((i, n) => <li key={n}><b className="mono">{i.k}</b> {i.v}</li>)}
    </ul>
  )
  return (
    <div className="strip" role="region" aria-label="Live readings" tabIndex={0}>
      <div className="strip__track">{row()}{row(true)}</div>
    </div>
  )
}

export function Ocean() {
  const t = daysAgo(3)
  const galle = LK.coast[1]
  const m = useData((s) => marine([galle], 0, s), [])
  const now = m.data?.[0]
  return (
    <section id="ocean" data-section="ocean" className="sec sec--split" aria-labelledby="h-ocean">
      <Snap src={snapshot(['BlueMarble_ShadedRelief_Bathymetry', 'GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies', 'Coastlines_15m'], [55, -20, 105, 30], 800, 800, t)}
        alt={`Sea surface temperature anomaly across the northern Indian Ocean on ${t}. Red is warmer than normal, blue cooler.`} w={800} h={800}
        caption={`Sea surface temperature anomaly, ${t}. JPL MUR via NASA GIBS.`} />
      <div className="sec__body">
        <h2 id="h-ocean" className="h2">The ocean, read from orbit.</h2>
        <p className="lead">Temperature, anomaly, chlorophyll, salinity and surface currents, with a readout wherever you tap the sea.</p>
        <dl className="readings" aria-live="polite">
          <div><dt>Sea surface off Galle</dt><dd>{now?.sst != null ? `${now.sst.toFixed(1)} °C` : m.error ? 'Unavailable' : <span className="skel" />}</dd></div>
          <div><dt>Surface current</dt><dd>{now?.cur != null ? `${now.cur.toFixed(1)} km/h` : m.error ? 'Unavailable' : <span className="skel" />}</dd></div>
          <div><dt>Wave height</dt><dd>{now?.wave != null ? `${now.wave.toFixed(1)} m` : m.error ? 'Unavailable' : <span className="skel" />}</dd></div>
        </dl>
        <p className="note">Readouts are model values from Open-Meteo{now ? `, ${now.time.replace('T', ' ')} UTC` : ''}.</p>
        <a className="btn btn--solid" href="#app/ocean">Open Ocean</a>
      </div>
    </section>
  )
}

const STORIES = [
  { name: 'Monsoon greening', where: 'South Asia', why: 'Vegetation index before the summer monsoon and after it.', layers: ['BlueMarble_ShadedRelief_Bathymetry', 'MODIS_Terra_L3_NDVI_16Day', 'Coastlines_15m'],
    bbox: [66, 5, 92, 31], a: '2026-05-09', b: '2026-09-14', link: '#app/monitor?l=relief,ndvi,coastlines&t=2026-05-09&cmp=2026-09-14&c=80.000,19.000,5500000' },
  { name: 'Forest clearing', where: 'Rondônia, Brazil', why: 'True colour in two dry seasons, 23 years apart.', layers: ['MODIS_Terra_CorrectedReflectance_TrueColor'],
    bbox: [-65, -12.5, -60, -7.5], a: '2002-08-01', b: '2025-08-01', link: '#app/monitor?l=truecolor,coastlines&t=2002-08-01&cmp=2025-08-01&c=-63.000,-10.500,900000' },
  { name: 'Growing night lights', where: 'India', why: 'Black Marble annual composites, 2012 against 2016.', layers: ['VIIRS_Black_Marble', 'Coastlines_15m'],
    bbox: [68, 6, 92, 30], a: '2012-01-01', b: '2016-01-01', link: '#app/monitor?l=nightlights,coastlines&t=2012-01-01&cmp=2016-01-01&c=80.000,22.000,4000000' },
] as const

export function Monitor() {
  const [x, setX] = useState(50)
  const [i, setI] = useState(0)
  const st = STORIES[i]
  const img = (t: string) => snapshot([...st.layers], [...st.bbox] as [number, number, number, number], 900, 900, t)
  const label = (t: string) => (st.a.endsWith('-01-01') && st.b.endsWith('-01-01') ? t.slice(0, 4) : t)
  return (
    <section id="monitor" data-section="monitor" className="sec sec--monitor" aria-labelledby="h-monitor">
      <div className="sec__body">
        <h2 id="h-monitor" className="h2">The same place, months or years apart.</h2>
        <p className="lead">Drag the divider to compare. Each story opens in Monitor on the globe, where you choose any layer and any two dates.</p>
      </div>
      <div className="monitor__grid">
        <div className="stories" role="tablist" aria-label="Stories">
          {STORIES.map((s, n) => (
            <button key={s.name} role="tab" aria-selected={n === i} aria-controls="compare" className="story" onClick={() => { setI(n); setX(50) }}>
              <b>{s.name}</b><span>{s.where}</span><small>{s.why}</small>
            </button>
          ))}
          <a className="btn btn--solid" href={st.link}>Open in Monitor</a>
        </div>
        <figure className="compare-wrap" id="compare" role="tabpanel" aria-label={`${st.name}, ${st.where}`}>
          <div className="compare" style={{ '--x': `${x}%` } as CSSProperties} key={st.name}>
            <img src={img(st.b)} alt={`${st.name}, ${st.where}, ${st.b}`} width={900} height={900} loading="lazy" />
            <img className="compare__top" src={img(st.a)} alt={`${st.name}, ${st.where}, ${st.a}`} width={900} height={900} loading="lazy" />
            <input type="range" min={0} max={100} value={x} onChange={(e) => setX(+e.target.value)} aria-label={`Compare ${label(st.a)} and ${label(st.b)}`} />
          </div>
          <figcaption className="compare__cap mono"><span>{label(st.a)}</span><span>NASA GIBS</span><span>{label(st.b)}</span></figcaption>
        </figure>
      </div>
    </section>
  )
}

export function Events() {
  const ev = useData((s) => eonet(30, s), [])
  const eq = useData((s) => quakes('week', s), [])
  const open = new Map<string, Set<string>>()
  ev.data?.filter((e) => !e.closed).forEach((e) => open.set(e.catTitle, (open.get(e.catTitle) ?? new Set()).add(e.id)))
  const cats = [...open].map(([k, v]) => [k, v.size] as const).sort((p, q) => q[1] - p[1])
  const big = eq.data?.reduce((p, q) => (q.mag > p.mag ? q : p))
  return (
    <section id="events" data-section="events" className="sec sec--events" aria-labelledby="h-events">
      <div className="sec__body">
        <h2 id="h-events" className="h2">What the planet is doing now.</h2>
        <p className="lead">Open natural events tracked by NASA EONET, and every M2.5+ earthquake USGS recorded in the last seven days.</p>
      </div>
      <div className="bento" aria-live="polite" aria-busy={ev.loading || eq.loading}>
        <article className="bento__cell bento__cell--big">
          <h3>Earthquakes, past 7 days</h3>
          {eq.data ? <p className="num">{eq.data.length}</p> : eq.error ? <p className="err">USGS feed unavailable ({eq.error}).</p> : <p className="num skel" />}
          {big && <p className="sub">Largest: M{big.mag.toFixed(1)}, {big.place}</p>}
          <EventMap quakes={eq.data} events={ev.data?.filter((e) => !e.closed)} />
        </article>
        <div className="bento__rest">
        {ev.error && <article className="bento__cell"><h3>Natural events</h3><p className="err">EONET unavailable ({ev.error}).</p></article>}
        {ev.loading && !ev.data && [0, 1, 2].map((i) => <article key={i} className="bento__cell"><h3 className="skel" /><p className="num skel" /></article>)}
        {cats.map(([k, n]) => (
          <article key={k} className="bento__cell">
            <h3>{k}</h3>
            <p className="num">{n}</p>
            <p className="sub">open now</p>
          </article>
        ))}
        </div>
      </div>
      <a className="btn btn--solid" href="#app/events">Open Events</a>
    </section>
  )
}

const EVC: Record<string, [string, string]> = { wildfires: ['#d95926', 'Wildfire'], severeStorms: ['#c98500', 'Storm'], floods: ['#199e70', 'Flood'], volcanoes: ['#d55181', 'Volcano'] }
/** Live positions on Black Marble, equirectangular so x = lon and y = lat with no projection code. */
function EventMap({ quakes: q, events }: { quakes?: { lat: number; lon: number; mag: number }[]; events?: { lat: number; lon: number; cat: string }[] }) {
  const cats = [...new Set(events?.map((e) => e.cat))].filter((c) => EVC[c])
  return (
    <figure className="evmap">
      <svg viewBox="-180 -90 360 180" role="img" aria-label="Map of this week's earthquakes and open natural events">
        <image href={snapshot(['VIIRS_Black_Marble'], [-180, -90, 180, 90], 960, 480, '2016-01-01')} x={-180} y={-90} width={360} height={180} preserveAspectRatio="none" />
        {q?.map((d, i) => <circle key={i} cx={d.lon} cy={-d.lat} r={Math.max(0.6, (d.mag - 2) * 0.55)} className="evmap__q" />)}
        {events?.map((e, i) => <circle key={'e' + i} cx={e.lon} cy={-e.lat} r={1.6} fill={EVC[e.cat]?.[0] ?? '#2399ba'} className="evmap__e" />)}
      </svg>
      <figcaption className="evmap__key">
        <span><i className="swatch" style={{ background: '#3987e5' }} />Earthquake, sized by magnitude</span>
        {cats.map((c) => <span key={c}><i className="swatch" style={{ background: EVC[c][0] }} />{EVC[c][1]}</span>)}
        {events?.some((e) => !EVC[e.cat]) && <span><i className="swatch" style={{ background: '#2399ba' }} />Other (ice, dust, drought)</span>}
      </figcaption>
    </figure>
  )
}

export function Observatory() {
  const g = useData((s) => gistemp(s), [])
  const c = useData((s) => co2(s), [])
  const sst = useData((s) => sstDaily(s), [])
  const last = g.data?.annual.at(-1)
  const lc = c.data?.at(-1)
  const si = sst.data?.data.findLastIndex((v) => v != null) ?? -1
  const sNow = si >= 0 ? sst.data!.data[si]! : undefined, sClim = si >= 0 ? sst.data!.climatology.data[si] : undefined
  return (
    <section id="observatory" data-section="observatory" className="sec sec--obs" aria-labelledby="h-obs">
      <div className="obs__head">
        <h2 id="h-obs" className="h2">Measured, not modelled.</h2>
        <dl className="stats">
          <div><dt>Global temperature anomaly, {last?.[0] ?? 'latest year'}</dt><dd>{last ? `${last[1] > 0 ? '+' : ''}${last[1].toFixed(2)} °C` : g.error ? 'Unavailable' : <span className="skel" />}</dd></div>
          <div><dt>CO₂ at Mauna Loa, {lc ? `${lc.y}-${String(lc.m).padStart(2, '0')}` : 'latest month'}</dt><dd>{lc ? `${lc.ppm.toFixed(1)} ppm` : c.error ? 'Unavailable' : <span className="skel" />}</dd></div>
        </dl>
      </div>
      <div className="obs__body">
        {g.data
          ? <Chart title="Global land-ocean temperature anomaly, annual mean, relative to 1951-1980" zero height={260}
              series={[{ name: 'Annual anomaly', color: C1, pts: g.data.annual }]}
              xFmt={(x) => String(x)} xTicks={[1880, 1920, 1960, 2000, g.data.annual.at(-1)![0]]} yFmt={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}°`} />
          : <div className="chart chart--skel">{g.error ? <p className="err">GISTEMP unavailable ({g.error}).</p> : null}</div>}
        <aside className="obs__side" aria-label="More indicators">
          <div className="obs__tile">
            <h3>CO₂ since 1958</h3>
            {c.data ? <Chart title="Monthly mean CO2 at Mauna Loa since 1958" height={120} series={[{ name: 'CO₂', color: C1, pts: c.data.map((r) => [r.t, r.ppm]) }]}
              xFmt={(x) => String(Math.floor(x))} xTicks={[1960, 1990, 2020]} yFmt={(v) => v.toFixed(0)} /> : <div className="chart chart--skel" />}
          </div>
          <div className="obs__tile obs__tile--sst">
            <h3>World ocean surface, today</h3>
            <p className="num mono">{sNow != null ? `${sNow.toFixed(2)} °C` : sst.error ? 'Unavailable' : <span className="skel" />}</p>
            {sNow != null && sClim != null && <p className="sub">{sNow - sClim > 0 ? '+' : ''}{(sNow - sClim).toFixed(2)} °C against the 1991-2020 average for this day. NOAA OISST via Climate Reanalyzer.</p>}
          </div>
        </aside>
      </div>
      <p className="note">NASA GISS GISTEMP v4, annual mean relative to 1951-1980. NOAA GML monthly mean CO₂; recent months are preliminary.</p>
      <a className="btn btn--solid" href="#app/observatory">Open Observatory</a>
    </section>
  )
}

export function Region() {
  const m = useData((s) => marine(LK.coast, 0, s), [])
  const t = daysAgo(2)
  return (
    <section id="region" data-section="region" className="sec sec--region" aria-labelledby="h-region">
      <div className="sec__body">
        <h2 id="h-region" className="h2">Sri Lanka, from orbit and from the sea.</h2>
        <p className="lead">Our first featured region: coastal water temperature, monsoon chlorophyll, vegetation and two decades of forest change.</p>
        <table className="coast">
          <caption className="mono">Sea surface temperature now (model)</caption>
          <tbody>
            {LK.coast.map((p, i) => (
              <tr key={p.name}><th scope="row">{p.name}</th><td>{m.data?.[i]?.sst != null ? `${m.data[i].sst!.toFixed(1)} °C` : m.error ? '-' : <span className="skel" />}</td></tr>
            ))}
          </tbody>
        </table>
        {m.error && <p className="err">Open-Meteo unavailable ({m.error}).</p>}
        <a className="btn btn--solid" href={`#app/region?r=${LK.id}`}>Read the report</a>
      </div>
      <Snap src={snapshot(['VIIRS_NOAA20_CorrectedReflectance_TrueColor', 'Coastlines_15m'], [78.6, 5.6, 83, 10.2], 760, 795, t)}
        alt={`Sri Lanka from orbit on ${t}, true colour`} w={760} h={795} caption={`Sri Lanka, ${t}. VIIRS NOAA-20 via NASA GIBS. Clouds are real.`} />
    </section>
  )
}

export function Sources() {
  return (
    <section id="sources" data-section="sources" className="sec sec--sources" aria-labelledby="h-sources">
      <h2 id="h-sources" className="h2">Where every number comes from.</h2>
      <p className="lead">POLARIS shows other people's measurements. These are the people, with their licences and what we use from each.</p>
      <ul className="srcgrid">
        {SOURCES.map((s) => (
          <li key={s.id}>
            <h3><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a></h3>
            <p className="mono">{s.provider}</p>
            {s.note && <p>{s.note}</p>}
            <p className="muted">{s.licence}</p>
            {LAYERS.some((l) => l.src === s.id) && <p className="muted">Layers: {LAYERS.filter((l) => l.src === s.id).map((l) => l.title).join(', ')}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
