/** NASA GISTEMP v4 global land-ocean index. The CSV has no CORS header, so it comes through here. */
const SRC = 'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv'

export async function GET() {
  const r = await fetch(SRC, { headers: { 'user-agent': 'Mozilla/5.0 (POLARIS open data viewer)' } }) // GISS drops requests without a UA
  if (!r.ok) return Response.json({ error: `GISTEMP responded ${r.status}` }, { status: 502 })
  const rows = (await r.text()).split('\n').map((l) => l.split(',')).filter((c) => /^\d{4}$/.test(c[0]))
  const num = (v: string) => (v.trim() === '***' ? null : Number(v))
  const annual = rows.map((c) => [Number(c[0]), num(c[13])]).filter((a) => a[1] !== null)
  const monthly = rows.flatMap((c) => c.slice(1, 13).map((v, m) => [Number(c[0]), m + 1, num(v)])).filter((a) => a[2] !== null)
  return Response.json(
    { source: SRC, baseline: '1951-1980', unit: '°C', annual, monthly: monthly.slice(-36) },
    { headers: { 'cache-control': 'public, s-maxage=43200, stale-while-revalidate=86400' } },
  )
}
