import { get, json } from '../lib/api'
import { rows } from '../lib/csv'
import type { Point } from './regions'

/* ---------- natural events ---------- */
export type Ev = { id: string; title: string; cat: string; catTitle: string; time: number; lat: number; lon: number; mag?: string; link: string; src: string; closed: boolean }

const centroid = (g: { type: string; coordinates: any }): [number, number] => {
  if (g.type === 'Point') return g.coordinates
  const ring: [number, number][] = g.type === 'Polygon' ? g.coordinates[0] : g.coordinates
  return [ring.reduce((a, p) => a + p[0], 0) / ring.length, ring.reduce((a, p) => a + p[1], 0) / ring.length]
}
const unamp = (s: string) => s.replace(/&amp;/g, '&')

/** EONET v3: one feature per event position, so storms come back as tracks. */
export async function eonet(days: number, s?: AbortSignal): Promise<Ev[]> {
  const d = await json<{ features: any[] }>(`https://eonet.gsfc.nasa.gov/api/v3/events/geojson?status=all&days=${days}`, s)
  return d.features.map((f) => {
    const p = f.properties, [lon, lat] = centroid(f.geometry)
    return {
      id: p.id, title: p.title, cat: p.categories[0].id, catTitle: p.categories[0].title, time: Date.parse(p.date), lat, lon,
      mag: p.magnitudeValue != null ? `${p.magnitudeValue} ${p.magnitudeUnit}` : undefined,
      link: unamp(p.sources?.[0]?.url ?? `https://eonet.gsfc.nasa.gov/api/v3/events/${p.id}`), src: p.sources?.map((x: any) => x.id).join(', ') ?? 'EONET', closed: !!p.closed,
    }
  })
}

export type Quake = { id: string; mag: number; place: string; time: number; lat: number; lon: number; depth: number; url: string }
export async function quakes(feed: 'day' | 'week' | 'month', s?: AbortSignal): Promise<Quake[]> {
  const d = await json<{ features: any[] }>(`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_${feed}.geojson`, s)
  return d.features.map((f) => ({
    id: f.id, mag: f.properties.mag, place: f.properties.place ?? 'Unnamed location', time: f.properties.time, url: f.properties.url,
    lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], depth: f.geometry.coordinates[2],
  }))
}

export type Fires = { start: string; count: number; pts: [lat: number, lon: number, frp: number, min: number][] }
export const fires = (s?: AbortSignal) => json<Fires>('/api/firms', s)

/* ---------- climate indicators ---------- */
export type Gistemp = { baseline: string; annual: [number, number][]; monthly: [number, number, number][] }
export const gistemp = (s?: AbortSignal) => json<Gistemp>('/api/gistemp', s)

export type SstDaily = { year: number; data: (number | null)[]; preliminaryFrom: number; previous: { year: number; data: (number | null)[] }; record: { year: number; data: (number | null)[] }; climatology: { name: string; data: (number | null)[] } }
export const sstDaily = (s?: AbortSignal) => json<SstDaily>('/api/sst', s)

/** NOAA GML sends CORS headers, so CO₂ comes straight from the source. Columns: year, month, decimal, average, deseasonalized. */
type Co2 = { y: number; m: number; t: number; ppm: number; trend: number }[]
let co2p: Promise<Co2> | null = null // one download per session, shared by ticker, section and Observatory
export function co2(s?: AbortSignal): Promise<Co2> {
  co2p ??= get('https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.csv').then((r) => r.text())
    .then((t) => rows(t).filter((r) => !Number.isNaN(r[3])).map((r) => ({ y: r[0], m: r[1], t: r[2], ppm: r[3], trend: r[4] })))
    .catch((e) => { co2p = null; throw e })
  return s ? new Promise((ok, no) => { s.addEventListener('abort', () => no(new Error('Cancelled')), { once: true }); co2p!.then(ok, no) }) : co2p
}

/* ---------- point readouts (model data, labelled as such) ---------- */
export type Marine = { sst: number | null; cur: number | null; dir: number | null; wave: number | null; time: string; daily?: { t: string; v: number }[] }
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length

export async function marine(pts: Point[] | { lat: number; lon: number }[], past = 0, s?: AbortSignal): Promise<Marine[]> {
  const q = `latitude=${pts.map((p) => p.lat.toFixed(3)).join(',')}&longitude=${pts.map((p) => p.lon.toFixed(3)).join(',')}`
  const h = past ? `&hourly=sea_surface_temperature&past_days=${past}&forecast_days=1` : ''
  const d = await json<any>(`https://marine-api.open-meteo.com/v1/marine?${q}&current=sea_surface_temperature,ocean_current_velocity,ocean_current_direction,wave_height${h}`, s)
  return (Array.isArray(d) ? d : [d]).map((r) => {
    let daily: Marine['daily']
    if (r.hourly) {
      const by = new Map<string, number[]>()
      r.hourly.time.forEach((t: string, i: number) => { const v = r.hourly.sea_surface_temperature[i]; if (v != null) by.set(t.slice(0, 10), [...(by.get(t.slice(0, 10)) ?? []), v]) })
      daily = [...by].map(([t, v]) => ({ t, v: mean(v) }))
    }
    return { sst: r.current.sea_surface_temperature, cur: r.current.ocean_current_velocity, dir: r.current.ocean_current_direction, wave: r.current.wave_height, time: r.current.time, daily }
  })
}

export type Weather = { temp: number; rh: number; rain: number; wind: number; time: string }
export async function weather(pts: Point[], s?: AbortSignal): Promise<Weather[]> {
  const q = `latitude=${pts.map((p) => p.lat).join(',')}&longitude=${pts.map((p) => p.lon).join(',')}`
  const d = await json<any>(`https://api.open-meteo.com/v1/forecast?${q}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m`, s)
  return (Array.isArray(d) ? d : [d]).map((r) => ({ temp: r.current.temperature_2m, rh: r.current.relative_humidity_2m, rain: r.current.precipitation, wind: r.current.wind_speed_10m, time: r.current.time }))
}
