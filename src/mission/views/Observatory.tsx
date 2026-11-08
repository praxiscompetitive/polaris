import { ReactNode } from 'react'
import { co2, eonet, fires, gistemp, sstDaily } from '../../data/feeds'
import { source } from '../../data/sources'
import { useData } from '../../lib/api'
import Chart from '../../components/Chart'

const C1 = '#2399ba', C2 = '#be781f', REF = '#8799a8' // C1/C2 validated categorical pair; REF is a neutral reference line
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const doyTicks = [0, 59, 120, 181, 243, 304, 365]
const doyFmt = (d: number) => { const t = new Date(Date.UTC(2001, 0, 1) + d * 864e5); return `${MONTHS[t.getUTCMonth()]} ${t.getUTCDate()}` }
const now = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

function Card({ title, src, period, method, children, wide }: { title: string; src: string; period: string; method: string; children: ReactNode; wide?: boolean }) {
  const s = source(src)
  return (
    <article className={`ocard ${wide ? 'ocard--wide' : ''}`}>
      <h3>{title}</h3>
      {children}
      <dl className="ocard__meta">
        <div><dt>Source</dt><dd><a href={s.url} target="_blank" rel="noreferrer">{s.provider}</a></dd></div>
        <div><dt>Period</dt><dd>{period}</dd></div>
        <div><dt>Method</dt><dd>{method}</dd></div>
      </dl>
    </article>
  )
}
const Fail = ({ e }: { e?: string }) => (e ? <p className="err">Could not load: {e}</p> : <div className="chart chart--skel" />)

/** Global indicators. Every number carries its source, period and method; nothing is computed from imagery. */
export default function Observatory() {
  const g = useData((s) => gistemp(s), [])
  const c = useData((s) => co2(s), [])
  const sst = useData((s) => sstDaily(s), [])
  const fi = useData((s) => fires(s), [])
  const ev = useData((s) => eonet(30, s), [])
  const opened = now()

  const lastY = g.data?.annual.at(-1), lastM = g.data?.monthly.at(-1)
  const lc = c.data?.at(-1), ten = c.data?.find((r) => r.y === (lc?.y ?? 0) - 10 && r.m === lc?.m)
  const sstToday = sst.data && (() => { const i = sst.data.data.findLastIndex((v) => v != null); return { i, v: sst.data.data[i]!, clim: sst.data.climatology.data[i] } })()
  const cats = new Map<string, Set<string>>()
  ev.data?.filter((e) => !e.closed).forEach((e) => cats.set(e.catTitle, (cats.get(e.catTitle) ?? new Set()).add(e.id)))

  return (
    <div className="obs" role="region" aria-label="Observatory">
      <header className="obs__top">
        <h2>Observatory</h2>
        <p>Global indicators from the agencies that measure them. Loaded {opened} UTC.</p>
      </header>
      <div className="obs__grid">
        <Card wide title="Global surface temperature anomaly" src="gistemp" period={`Annual means 1880-${lastY?.[0] ?? '…'}; monthly to ${lastM ? `${lastM[0]}-${String(lastM[1]).padStart(2, '0')}` : '…'}`}
          method="Land stations and ocean SST combined, relative to the 1951-1980 average.">
          {lastY && lastM && <p className="big">{lastY[1] > 0 ? '+' : ''}{lastY[1].toFixed(2)} °C <small>in {lastY[0]}; latest month {lastM[2] > 0 ? '+' : ''}{lastM[2].toFixed(2)} °C</small></p>}
          {g.data ? <Chart title="Global temperature anomaly, annual" zero series={[{ name: 'Annual anomaly', color: C1, pts: g.data.annual }]}
            xFmt={String} xTicks={[1880, 1920, 1960, 2000, lastY![0]]} yFmt={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}°`} /> : <Fail e={g.error} />}
        </Card>

        <Card title="Atmospheric CO₂, Mauna Loa" src="noaa-co2" period={lc ? `Monthly, March 1958 to ${lc.y}-${String(lc.m).padStart(2, '0')}` : 'Monthly since 1958'}
          method="Dry-air mole fraction. Trend line removes the seasonal cycle.">
          {lc && <p className="big">{lc.ppm.toFixed(1)} ppm {ten && <small>{(lc.ppm - ten.ppm).toFixed(1)} ppm more than ten years earlier</small>}</p>}
          {c.data ? <Chart title="Monthly mean CO2 at Mauna Loa" height={220}
            series={[{ name: 'Monthly mean', color: C1, pts: c.data.map((r) => [r.t, r.ppm]) }, { name: 'Seasonally adjusted', color: C2, dash: true, pts: c.data.map((r) => [r.t, Number.isNaN(r.trend) ? null : r.trend]) }]}
            xFmt={(x) => String(Math.floor(x))} xTicks={[1960, 1980, 2000, 2020]} yFmt={(v) => `${v.toFixed(0)}`} /> : <Fail e={c.error} />}
        </Card>

        <Card title="World sea surface temperature, daily" src="oisst" period={sst.data ? `${sst.data.year} to date, against ${sst.data.previous.year} and 1991-2020` : 'Daily'}
          method="Area-weighted mean, 60°S to 60°N. The most recent days are preliminary.">
          {sstToday && <p className="big">{sstToday.v.toFixed(2)} °C <small>{doyFmt(sstToday.i)}; {sstToday.clim != null ? `${(sstToday.v - sstToday.clim) > 0 ? '+' : ''}${(sstToday.v - sstToday.clim).toFixed(2)} °C against 1991-2020` : ''}</small></p>}
          {sst.data ? <Chart title="Daily world sea surface temperature" height={220} xFmt={doyFmt} xTicks={doyTicks} yFmt={(v) => `${v.toFixed(1)}°`}
            series={[
              { name: String(sst.data.year), color: C1, pts: sst.data.data.map((v, i) => [i, v]) },
              { name: String(sst.data.previous.year), color: C2, pts: sst.data.previous.data.map((v, i) => [i, v]) },
              { name: '1991-2020 mean', color: REF, dash: true, pts: sst.data.climatology.data.map((v, i) => [i, v]) },
            ]} /> : <Fail e={sst.error} />}
        </Card>

        <Card title="Active fires, last 24 hours" src="firms" period={fi.data ? `Since ${fi.data.start.slice(0, 16).replace('T', ' ')} UTC` : 'Rolling 24 hours'}
          method="VIIRS NOAA-21 375 m thermal anomalies, nominal and high confidence only.">
          {fi.data ? <p className="big">{fi.data.count.toLocaleString()} <small>detections worldwide</small></p>
            : fi.error === 'not-configured' ? <p className="note">Set FIRMS_MAP_KEY on the server to show this count.</p> : <Fail e={fi.error} />}
        </Card>

        <Card title="Open natural events" src="eonet" period="Events active in the last 30 days" method="Curated by NASA from agency reports (GDACS, IRWIN, JTWC and others).">
          {ev.data ? (
            <table className="otable"><tbody>
              {[...cats].sort((a, b) => b[1].size - a[1].size).map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v.size}</td></tr>)}
            </tbody></table>
          ) : <Fail e={ev.error} />}
        </Card>
      </div>
    </div>
  )
}
