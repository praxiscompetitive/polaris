import { FormEvent, useState } from 'react'
import { Group, GROUPS, latest, layer, LAYERS } from '../../data/layers'
import { REGIONS } from '../../data/regions'
import { source } from '../../data/sources'
import type { Cam } from '../../lib/deeplink'
import type { VP } from '../Mission'

const PLACES: Record<'land' | 'ocean', { name: string; c: Cam }[]> = {
  land: [
    { name: 'Sri Lanka', c: REGIONS[0].cam },
    { name: 'Himalaya', c: [86, 28.5, 1_400_000] },
    { name: 'Amazon basin', c: [-60, -5, 3_500_000] },
    { name: 'Sahara', c: [10, 23, 5_500_000] },
    { name: 'Greenland', c: [-42, 72, 3_500_000] },
  ],
  ocean: [
    { name: 'Indian Ocean', c: [78, 2, 9_000_000] },
    { name: 'Niño 3.4 (Pacific)', c: [-145, 0, 9_000_000] },
    { name: 'Gulf Stream', c: [-68, 37, 3_500_000] },
    { name: 'Arabian Sea', c: [62, 15, 3_200_000] },
    { name: 'Great Barrier Reef', c: [148, -18, 2_200_000] },
  ],
}

/** Pick one base, any overlays (one at a time on phones), a date, an opacity, a place. */
export default function LayerPanel({ st, set, mobile, fly, groups, places }: VP & { groups: Group[]; places?: true | 'ocean' }) {
  const sel = st.l.map(layer).filter((l) => !!l)
  const temporal = sel.filter((l) => l!.from)
  const min = temporal.reduce((m, l) => (l!.from! < m ? l!.from! : m), '9999')
  const max = temporal.length ? latest(temporal[0]!) : ''

  const toggle = (id: string) => {
    const l = layer(id)!
    if (!l.overlay) return set({ l: [id, ...st.l.filter((x) => layer(x)?.overlay)] })
    if (st.l.includes(id)) return set({ l: st.l.filter((x) => x !== id) })
    // phones keep one data overlay at a time: fewer tiles, a readable legend
    const keep = mobile && l.group !== 'reference' ? st.l.filter((x) => !layer(x)?.overlay || layer(x)!.group === 'reference') : st.l
    set({ l: [...keep, id] })
  }

  return (
    <>
      {GROUPS.filter((g) => groups.includes(g.id)).map((g) => (
        <fieldset key={g.id} className="pgroup">
          <legend>{g.title}</legend>
          {LAYERS.filter((l) => l.group === g.id).map((l) => (
            <label key={l.id} className="pcheck" title={l.method}>
              <input type={l.overlay ? 'checkbox' : 'radio'} name={l.overlay ? undefined : 'base'} checked={st.l.includes(l.id)} onChange={() => toggle(l.id)} />
              <span>{l.title}<small>{l.res} · {l.period}</small></span>
            </label>
          ))}
        </fieldset>
      ))}

      <fieldset className="pgroup">
        <legend>Date</legend>
        {temporal.length ? (
          <div className="prow">
            <input type="date" value={st.t ?? ''} min={min} max={max} onChange={(e) => set({ t: e.target.value || undefined })} aria-label="Imagery date" />
            <button className="pbtn" onClick={() => set({ t: undefined })} disabled={!st.t}>Latest</button>
          </div>
        ) : <p className="note">The selected layers are static.</p>}
        {temporal.length > 0 && <p className="note">Earliest for this selection: {min}. Composites snap to their period; cloud and orbit gaps are real.</p>}
      </fieldset>

      {sel.some((l) => l!.overlay) && (
        <fieldset className="pgroup">
          <legend>Overlay opacity</legend>
          <input type="range" min={0.1} max={1} step={0.05} value={st.o} onChange={(e) => set({ o: +e.target.value })} aria-label="Overlay opacity" />
        </fieldset>
      )}

      {places && <Places list={PLACES[places === 'ocean' ? 'ocean' : 'land']} fly={fly} />}

      <details className="pgroup pinfo">
        <summary>About these layers</summary>
        {sel.map((l) => (
          <p key={l!.id}><b>{l!.title}.</b> {l!.method} <a href={source(l!.src).url} target="_blank" rel="noreferrer">{source(l!.src).provider}</a>.</p>
        ))}
      </details>
    </>
  )
}

export function Places({ list, fly }: { list: { name: string; c: Cam }[]; fly: (c: Cam) => void }) {
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const go = (e: FormEvent) => {
    e.preventDefault()
    const m = q.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/)
    const lat = Number(m?.[1]), lon = Number(m?.[2])
    if (!m || Math.abs(lat) > 90 || Math.abs(lon) > 180) return setErr('Enter latitude, longitude, for example 7.29, 80.63')
    setErr('')
    fly([lon, lat, 900_000])
  }
  return (
    <fieldset className="pgroup">
      <legend>Go to</legend>
      <div className="pills">{list.map((p) => <button key={p.name} className="pill" onClick={() => fly(p.c)}>{p.name}</button>)}</div>
      <form onSubmit={go} className="prow">
        <label className="sr" htmlFor="coord">Coordinates</label>
        <input id="coord" value={q} onChange={(e) => setQ(e.target.value)} placeholder="lat, lon" inputMode="decimal" aria-invalid={!!err} aria-describedby="coord-err" />
        <button className="pbtn" type="submit">Go</button>
      </form>
      <p id="coord-err" className="err" role="alert">{err}</p>
    </fieldset>
  )
}
