import { CSSProperties, useState } from 'react'
import { LAYERS } from '../data/layers'
import { REGIONS } from '../data/regions'
import { SOURCES } from '../data/sources'
import { co2, eonet, gistemp, marine, quakes } from '../data/feeds'
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
  const pick = LAYERS.filter((l) => l.group === 'base' || l.group === 'land')
  return (
    <section id="explorer" data-section="explorer" className="sec sec--explorer" aria-labelledby="h-explorer">
      <Snap src={snapshot(['VIIRS_NOAA20_CorrectedReflectance_TrueColor', 'Coastlines_15m'], [62, 8, 102, 23], 1600, 600, t)}
        alt={`True-colour satellite view of South Asia and the Bay of Bengal on ${t}`} w={1600} h={600}
        caption={`South Asia, ${t}. VIIRS NOAA-20 true colour via NASA GIBS.`} />
      <div className="sec__body">
        <h2 id="h-explorer" className="h2">Every layer, one globe.</h2>
        <p className="lead">Switch between true colour, vegetation, land temperature, night lights, population and elevation. Daily imagery goes back to 2000.</p>
        <ul className="chips" aria-label="Open the globe with a layer">
          {pick.map((l) => <li key={l.id}><a className="chip" href={`#app/explorer?l=${l.id}`}>{l.title}</a></li>)}
        </ul>
      </div>
    </section>
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

export function Monitor() {
  const [x, setX] = useState(50)
  const bbox: [number, number, number, number] = [66, 5, 92, 31]
  const a = '2026-05-09', b = '2026-09-14'
  const img = (t: string) => snapshot(['BlueMarble_ShadedRelief_Bathymetry', 'MODIS_Terra_L3_NDVI_16Day', 'Coastlines_15m'], bbox, 900, 900, t)
  return (
    <section id="monitor" data-section="monitor" className="sec sec--center" aria-labelledby="h-monitor">
      <h2 id="h-monitor" className="h2">The same place, months or years apart.</h2>
      <p className="lead">Drag the divider. South Asia before the monsoon and after it, measured as vegetation index.</p>
      <div className="compare" style={{ '--x': `${x}%` } as CSSProperties}>
        <img src={img(b)} alt={`Vegetation index over South Asia, 16 days from ${b}`} width={900} height={900} loading="lazy" />
        <img className="compare__top" src={img(a)} alt={`Vegetation index over South Asia, 16 days from ${a}`} width={900} height={900} loading="lazy" />
        <span className="compare__tag compare__tag--l mono">{a}</span>
        <span className="compare__tag compare__tag--r mono">{b}</span>
        <input type="range" min={0} max={100} value={x} onChange={(e) => setX(+e.target.value)} aria-label="Compare position" />
      </div>
      <p className="note">MODIS Terra NDVI, 16-day composites, NASA GIBS. Darker green is denser, healthier vegetation.</p>
      <a className="btn btn--solid" href="#app/monitor">Open Monitor</a>
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

export function Observatory() {
  const g = useData((s) => gistemp(s), [])
  const c = useData((s) => co2(s), [])
  const last = g.data?.annual.at(-1)
  const lc = c.data?.at(-1)
  return (
    <section id="observatory" data-section="observatory" className="sec sec--obs" aria-labelledby="h-obs">
      <div className="obs__head">
        <h2 id="h-obs" className="h2">Measured, not modelled.</h2>
        <dl className="stats">
          <div><dt>Global temperature anomaly, {last?.[0] ?? 'latest year'}</dt><dd>{last ? `${last[1] > 0 ? '+' : ''}${last[1].toFixed(2)} °C` : g.error ? 'Unavailable' : <span className="skel" />}</dd></div>
          <div><dt>CO₂ at Mauna Loa, {lc ? `${lc.y}-${String(lc.m).padStart(2, '0')}` : 'latest month'}</dt><dd>{lc ? `${lc.ppm.toFixed(1)} ppm` : c.error ? 'Unavailable' : <span className="skel" />}</dd></div>
        </dl>
      </div>
      {g.data
        ? <Chart title="Global land-ocean temperature anomaly, annual mean, relative to 1951-1980" zero height={240}
            series={[{ name: 'Annual anomaly', color: C1, pts: g.data.annual }]}
            xFmt={(x) => String(x)} xTicks={[1880, 1920, 1960, 2000, g.data.annual.at(-1)![0]]} yFmt={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}°`} />
        : <div className="chart chart--skel">{g.error ? <p className="err">GISTEMP unavailable ({g.error}).</p> : null}</div>}
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
