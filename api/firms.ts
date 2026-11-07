/** NASA FIRMS VIIRS S-NPP active fires, last 24 h, worldwide. The map key stays server-side. */
export async function GET() {
  const key = process.env.FIRMS_MAP_KEY
  if (!key) return Response.json({ error: 'not-configured' }, { status: 503 })
  const r = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/world/1`)
  const text = await r.text()
  if (!r.ok || !text.startsWith('latitude')) return Response.json({ error: `FIRMS: ${text.slice(0, 120)}` }, { status: 502 })
  const [head, ...lines] = text.trim().split('\n')
  const h = head.split(',')
  const [la, lo, frp, d, t, conf] = ['latitude', 'longitude', 'frp', 'acq_date', 'acq_time', 'confidence'].map((k) => h.indexOf(k))
  // compact rows: [lat, lon, frp MW, minutes since the start of the window], low-confidence detections dropped
  const rows = lines.map((l) => l.split(',')).filter((c) => c[conf] !== 'l')
  const when = rows.map((c) => Date.parse(`${c[d]}T${c[t].padStart(4, '0').replace(/(\d\d)(\d\d)/, '$1:$2')}Z`))
  const t0 = when.reduce((a, b) => Math.min(a, b), Infinity) // no spread: 50k+ rows would overflow the stack
  const pts = rows.map((c, i) => [+(+c[la]).toFixed(3), +(+c[lo]).toFixed(3), +(+c[frp]).toFixed(1), Math.round((when[i] - t0) / 6e4)])
  return Response.json(
    { source: 'NASA FIRMS VIIRS_SNPP_NRT', start: new Date(t0).toISOString(), count: pts.length, pts },
    { headers: { 'cache-control': 'public, s-maxage=1800, stale-while-revalidate=3600' } },
  )
}
