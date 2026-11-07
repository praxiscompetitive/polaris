import { useState } from 'react'
import { layer } from '../../data/layers'
import { region, REGIONS } from '../../data/regions'
import { marine, weather } from '../../data/feeds'
import { useData } from '../../lib/api'
import { serialize } from '../../lib/deeplink'
import Chart from '../../components/Chart'
import type { VP } from '../Mission'

/** A featured-region report: live coastal and inland readings, the layers that matter here, and where to look. */
export default function RegionPanel({ st, set, fly }: VP) {
  const r = region(st.r ?? '') ?? REGIONS[0]
  const sea = useData((s) => marine(r.coast, 30, s), [r.id])
  const land = useData((s) => weather(r.land, s), [r.id])
  const [pt, setPt] = useState(0)
  const series = sea.data?.[pt]?.daily

  const toggle = (id: string) => set({ l: st.l.includes(id) ? st.l.filter((x) => x !== id) : [...st.l, id] })

  return (
    <>
      <header className="rhead">
        <p className="mono">{r.sub}</p>
        <h2>{r.title}</h2>
        <button className="pbtn" onClick={() => fly(r.cam)}>Recentre</button>
      </header>

      <fieldset className="pgroup">
        <legend>Layers for this region</legend>
        {r.layers.map((id) => { const l = layer(id)!; return (
          <label key={id} className="pcheck"><input type="checkbox" checked={st.l.includes(id)} onChange={() => toggle(id)} /><span>{l.title}<small>{l.res} · {l.period}</small></span></label>
        ) })}
      </fieldset>

      <fieldset className="pgroup">
        <legend>Coastal sea surface temperature</legend>
        {sea.error && <p className="err">Open-Meteo unavailable ({sea.error}).</p>}
        <table className="otable">
          <tbody>
            {r.coast.map((p, i) => (
              <tr key={p.name} className={i === pt ? 'on' : ''}>
                <th scope="row"><button onClick={() => { setPt(i); fly([p.lon, p.lat, 250_000]) }}>{p.name}</button></th>
                <td>{sea.data?.[i]?.sst != null ? `${sea.data[i].sst!.toFixed(1)} °C` : sea.loading ? <span className="skel" /> : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {series && series.length > 1 && (
          <Chart title={`Daily mean sea surface temperature off ${r.coast[pt].name}, last 30 days`} height={160}
            series={[{ name: `Off ${r.coast[pt].name}`, color: '#2399ba', pts: series.map((d, i) => [i, d.v]) }]}
            xFmt={(i) => series[i]?.t.slice(5) ?? ''} xTicks={[0, Math.floor(series.length / 2), series.length - 1]} yFmt={(v) => `${v.toFixed(1)}°`} />
        )}
        <p className="note">Model values (Open-Meteo Marine). Tap any sea point on the globe for another readout.</p>
      </fieldset>

      <fieldset className="pgroup">
        <legend>Inland conditions now</legend>
        {land.error && <p className="err">Open-Meteo unavailable ({land.error}).</p>}
        <table className="otable">
          <thead><tr><th scope="col">Place</th><th scope="col">Air</th><th scope="col">Humidity</th><th scope="col">Rain</th></tr></thead>
          <tbody>
            {r.land.map((p, i) => { const w = land.data?.[i]; return (
              <tr key={p.name}><th scope="row">{p.name}</th><td>{w ? `${w.temp.toFixed(0)} °C` : '-'}</td><td>{w ? `${w.rh}%` : '-'}</td><td>{w ? `${w.rain} mm` : '-'}</td></tr>
            ) })}
          </tbody>
        </table>
      </fieldset>

      <fieldset className="pgroup">
        <legend>Where to look</legend>
        <ul className="presets">
          {r.look.map((k) => (
            <li key={k.title}>
              <a href={serialize(k.cmp
                ? { view: 'monitor', l: ['relief', k.l, 'coastlines'], t: k.t, cmp: k.cmp, c: r.cam }
                : { view: 'explorer', l: ['viirs', k.l, 'labels'], c: r.cam })}>
                <b>{k.title}</b><small>{k.body}</small>
              </a>
            </li>
          ))}
        </ul>
        <p className="note">Forest-loss statistics by district are on the <a href="https://www.globalforestwatch.org/dashboards/country/LKA/" target="_blank" rel="noreferrer">Global Forest Watch dashboard for Sri Lanka</a>. POLARIS does not restate them without a live source.</p>
      </fieldset>
    </>
  )
}
