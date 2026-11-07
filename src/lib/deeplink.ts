/** Mission views live in the hash: #app/<view>?l=a,b&t=YYYY-MM-DD&c=lon,lat,height,heading,pitch&cmp=YYYY-MM-DD&o=0.8&r=<region> */
export const VIEWS = ['explorer', 'ocean', 'monitor', 'events', 'observatory', 'region'] as const
export type View = (typeof VIEWS)[number]
export type Cam = [lon: number, lat: number, height: number, heading?: number, pitch?: number]
export type Link = { view: View; l: string[]; t?: string; cmp?: string; c?: Cam; o?: number; r?: string }

const DATE = /^\d{4}-\d{2}-\d{2}$/

export function parse(hash: string): Link | null {
  const m = hash.match(/^#app\/([a-z]+)(?:\?(.*))?$/)
  if (!m || !(VIEWS as readonly string[]).includes(m[1])) return null
  const q = new URLSearchParams(m[2] ?? '')
  const c = q.get('c')?.split(',').map(Number)
  const o = Number(q.get('o'))
  return {
    view: m[1] as View,
    l: (q.get('l') ?? '').split(',').filter((s) => /^[\w-]+$/.test(s)),
    t: DATE.test(q.get('t') ?? '') ? q.get('t')! : undefined,
    cmp: DATE.test(q.get('cmp') ?? '') ? q.get('cmp')! : undefined,
    c: c && c.length >= 3 && c.every(Number.isFinite) && Math.abs(c[1]) <= 90 && c[2] > 0 ? (c.slice(0, 5) as Cam) : undefined,
    o: o > 0 && o <= 1 ? o : undefined,
    r: q.get('r')?.match(/^[\w-]+$/)?.[0],
  }
}

export function serialize(k: Link) {
  const q: string[] = []
  if (k.l.length) q.push(`l=${k.l.join(',')}`)
  if (k.t) q.push(`t=${k.t}`)
  if (k.cmp) q.push(`cmp=${k.cmp}`)
  if (k.c) q.push(`c=${(k.c as number[]).map((v, i) => (i < 2 ? v.toFixed(3) : i === 2 ? Math.round(v) : v.toFixed(2))).join(',')}`)
  if (k.o !== undefined && k.o !== 1) q.push(`o=${k.o}`)
  if (k.r) q.push(`r=${k.r}`)
  return `#app/${k.view}${q.length ? '?' + q.join('&') : ''}`
}
