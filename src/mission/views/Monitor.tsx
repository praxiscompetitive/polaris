import { latest, layer, LAYERS } from '../../data/layers'
import { REGIONS } from '../../data/regions'
import type { Cam } from '../../lib/deeplink'
import type { MState, VP } from '../Mission'

type Preset = { name: string; why: string; l: string[]; t: string; cmp: string; c: Cam }
const PRESETS: Preset[] = [
  { name: 'Monsoon greening, South Asia', why: 'Vegetation index before and after the summer monsoon.', l: ['relief', 'ndvi', 'coastlines'], t: '2026-05-09', cmp: '2026-09-14', c: [80, 19, 5_500_000] },
  { name: 'Forest clearing, Rondônia', why: 'True colour, two dry seasons 23 years apart.', l: ['truecolor', 'coastlines'], t: '2002-08-01', cmp: '2025-08-01', c: [-63, -10.5, 900_000] },
  { name: 'Growing night lights, India', why: 'Black Marble 2012 against 2016.', l: ['nightlights', 'coastlines'], t: '2012-01-01', cmp: '2016-01-01', c: [80, 22, 4_000_000] },
  { name: 'Monsoon chlorophyll, Sri Lanka', why: 'Ocean colour in the southwest and northeast monsoons.', l: ['relief', 'chl', 'coastlines'], t: '2025-08-20', cmp: '2026-01-20', c: REGIONS[0].cam },
  { name: 'Marine heat, year on year', why: 'Sea surface temperature anomaly, same day a year apart.', l: ['relief', 'ssta', 'coastlines'], t: '2025-11-01', cmp: '2026-11-01', c: [-150, 0, 14_000_000] },
  { name: 'Arctic melt season, Greenland', why: 'True colour in March and August.', l: ['truecolor', 'coastlines'], t: '2026-03-15', cmp: '2026-08-15', c: [-42, 72, 4_000_000] },
]
const TEMPORAL = LAYERS.filter((l) => l.from && l.group !== 'reference')

/** Two dates of one layer, split down the middle of the globe. */
export default function Monitor({ st, set, fly }: VP) {
  const cmpId = [...st.l].reverse().find((id) => layer(id)?.from && layer(id)?.overlay) ?? st.l.find((id) => layer(id)?.from) ?? ''
  const L = layer(cmpId)
  const pick = (id: string) => {
    const l = layer(id)!
    set({ l: l.overlay ? ['relief', id, 'coastlines'] : [id, 'coastlines'], t: undefined, cmp: undefined, ...(l.years ? { t: '2012-01-01', cmp: '2016-01-01' } : {}) })
  }
  const apply = (p: Preset) => { set({ l: p.l, t: p.t, cmp: p.cmp } as Partial<MState>); fly(p.c) }

  return (
    <>
      <fieldset className="pgroup">
        <legend>Compare</legend>
        <label className="pfield">Layer
          <select value={cmpId} onChange={(e) => pick(e.target.value)}>
            {!L && <option value="">Choose a layer</option>}
            {TEMPORAL.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </label>
        {L && (L.years
          ? <div className="prow">{(['t', 'cmp'] as const).map((k, i) => (
              <label key={k} className="pfield">{i ? 'Right' : 'Left'}
                <select value={(st[k] ?? '').slice(0, 4)} onChange={(e) => set({ [k]: `${e.target.value}-01-01` })}>
                  {L.years!.map((y) => <option key={y}>{y}</option>)}
                </select>
              </label>))}
            </div>
          : <div className="prow">{(['t', 'cmp'] as const).map((k, i) => (
              <label key={k} className="pfield">{i ? 'Right' : 'Left'}
                <input type="date" min={L.from} max={latest(L)} value={st[k] ?? ''} onChange={(e) => set({ [k]: e.target.value || undefined })} />
              </label>))}
            </div>)}
        <button className="pbtn" onClick={() => set({ t: st.cmp, cmp: st.t })} disabled={!st.cmp}>Swap sides</button>
        {!st.cmp && <p className="note">Pick a right-hand date to split the globe.</p>}
      </fieldset>
      <fieldset className="pgroup">
        <legend>Stories to start from</legend>
        <ul className="presets">
          {PRESETS.map((p) => (
            <li key={p.name}><button onClick={() => apply(p)}><b>{p.name}</b><small>{p.why} {p.t} and {p.cmp}.</small></button></li>
          ))}
        </ul>
      </fieldset>
    </>
  )
}
