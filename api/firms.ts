import { guarded } from './_guard.js'

/** NASA FIRMS VIIRS NOAA-21 active fires, last 24 h, worldwide. The map key stays server-side. */
export async function GET(req: Request) {
  const key = process.env.FIRMS_MAP_KEY
  if (!key) return Response.json({ error: 'not-configured' }, { status: 503 })
  // FIRMS allows 5000 transactions / 10 min per key; this makes at most one upstream call per 30 min per instance
  return guarded(req, 'firms', 30 * 60_000, async () => {
    const r = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_NOAA21_NRT/world/1`)
    const text = await r.text()
    if (!r.ok || !text.startsWith('latitude')) throw new Error(`FIRMS responded ${r.status}`) // the body can echo the key's URL, so it is not forwarded
    const [head, ...lines] = text.trim().split('\n')
    if (!lines.length) throw new Error('FIRMS returned no detections') // e.g. a satellite feed that has stopped; avoids NaN dates below
    const h = head.split(',')
    const [la, lo, frp, d, t, conf] = ['latitude', 'longitude', 'frp', 'acq_date', 'acq_time', 'confidence'].map((k) => h.indexOf(k))
    // compact rows: [lat, lon, frp MW, minutes since the start of the window], low-confidence detections dropped
    const rows = lines.map((l) => l.split(',')).filter((c) => c[conf] !== 'l')
    const when = rows.map((c) => Date.parse(`${c[d]}T${c[t].padStart(4, '0').replace(/(\d\d)(\d\d)/, '$1:$2')}Z`))
    const t0 = when.reduce((a, b) => Math.min(a, b), Infinity) // no spread: 50k+ rows would overflow the stack
    const pts = rows.map((c, i) => [+(+c[la]).toFixed(3), +(+c[lo]).toFixed(3), +(+c[frp]).toFixed(1), Math.round((when[i] - t0) / 6e4)])
    return { source: 'NASA FIRMS VIIRS_NOAA21_NRT', start: new Date(t0).toISOString(), count: pts.length, pts }
  }, 'public, s-maxage=1800, stale-while-revalidate=3600')
}
