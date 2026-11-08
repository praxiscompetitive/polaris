/**
 * Protects the upstream keys and sources behind the serverless functions.
 * Files starting with "_" are not routes on Vercel.
 *
 * ponytail: state lives in each warm function instance, so these limits are per instance, not global.
 * With the CDN cache in front (s-maxage) that keeps upstream traffic far below FIRMS' 5000 requests / 10 min.
 * For a hard global limit, move the counters to Vercel KV or Upstash Redis.
 */

const hits = new Map<string, number[]>()

/** Per-client sliding window. Returns a 429 response when the client is over the limit, else null. */
export function limited(req: Request, max = 30, windowMs = 60_000): Response | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'
  const now = Date.now()
  const h = (hits.get(ip) ?? []).filter((t) => now - t < windowMs)
  if (h.length >= max) {
    return Response.json({ error: 'rate-limited' }, { status: 429, headers: { 'retry-after': String(Math.ceil(windowMs / 1000)) } })
  }
  h.push(now)
  hits.set(ip, h)
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > windowMs) hits.delete(k) // keep the map bounded
  return null
}

const store = new Map<string, { at: number; v: unknown }>()
const inflight = new Map<string, Promise<unknown>>()
let spent: number[] = []

/**
 * Cache an upstream fetch for `ttlMs`, share one in-flight call between concurrent requests, and spend at most
 * `budget` upstream calls per 10 minutes. Over budget: serve the stale value, or fail if there is none.
 * Failed calls still count against the budget, so errors cannot turn into a retry storm.
 */
export function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>, budget = 12): Promise<T> {
  const now = Date.now()
  const hit = store.get(key)
  if (hit && now - hit.at < ttlMs) return Promise.resolve(hit.v as T)
  const run = inflight.get(key)
  if (run) return run as Promise<T>
  spent = spent.filter((t) => now - t < 600_000)
  if (spent.length >= budget) return hit ? Promise.resolve(hit.v as T) : Promise.reject(new Error('upstream budget exhausted, try later'))
  spent.push(now)
  const p = fn()
    .then((v) => (store.set(key, { at: Date.now(), v }), v))
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

/** Run `fn` through the guard and turn failures into a JSON 502 without leaking internals. */
export async function guarded(req: Request, key: string, ttlMs: number, fn: () => Promise<unknown>, cache: string): Promise<Response> {
  const over = limited(req)
  if (over) return over
  try {
    return Response.json(await memo(key, ttlMs, fn), { headers: { 'cache-control': cache } })
  } catch (e) {
    return Response.json({ error: (e as Error).message.slice(0, 160) }, { status: 502 })
  }
}
