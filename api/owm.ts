import { limited, memo } from './_guard.js'

/**
 * OpenWeatherMap weather map tiles, proxied so the API key never reaches the browser.
 * GET /api/owm?l=<layer>&z=<z>&x=<x>&y=<y>
 * Free plan: 60 calls/minute, 1,000,000/month. Tiles are cached 10 minutes at the CDN and in memory,
 * and this instance makes at most 50 upstream calls per minute (stale tiles are served beyond that).
 */
const LAYERS = new Set(['clouds_new', 'precipitation_new', 'pressure_new', 'wind_new', 'temp_new'])
const int = (v: string | null, max: number) => (v !== null && /^\d{1,7}$/.test(v) && +v < max ? +v : null)

export async function GET(req: Request) {
  const key = process.env.OPENWEATHER_API_KEY
  if (!key) return Response.json({ error: 'not-configured' }, { status: 503 })
  const over = limited(req, 300, 60_000, 'owm') // a map view asks for dozens of tiles at once
  if (over) return over
  const q = new URL(req.url).searchParams
  const l = q.get('l') ?? ''
  const z = int(q.get('z'), 10), x = z === null ? null : int(q.get('x'), 2 ** z), y = z === null ? null : int(q.get('y'), 2 ** z)
  if (!LAYERS.has(l) || z === null || x === null || y === null) return Response.json({ error: 'bad-request' }, { status: 400 })
  try {
    const png = await memo(`owm/${l}/${z}/${x}/${y}`, 10 * 60_000, async () => {
      const r = await fetch(`https://tile.openweathermap.org/map/${l}/${z}/${x}/${y}.png?appid=${key}`)
      if (!r.ok) throw new Error(`OpenWeather responded ${r.status}`) // body not forwarded: it can echo the key
      return new Uint8Array(await r.arrayBuffer())
    }, 50, 60_000, 'owm')
    return new Response(png as BodyInit, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=1200' } })
  } catch (e) {
    return Response.json({ error: (e as Error).message.slice(0, 120) }, { status: 502 })
  }
}
