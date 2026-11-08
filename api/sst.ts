import { guarded } from './_guard.js'

/** Daily world SST (60°S-60°N, NOAA OISST v2.1) from Climate Reanalyzer, which refuses requests without a browser UA. */
const SRC = 'https://climatereanalyzer.org/clim/sst_daily/json_2clim/oisst2.1_world2_sst_day.json'
type Series = { name: string; data: (number | null)[] }

export function GET(req: Request) {
  return guarded(req, 'sst', 6 * 3600_000, async () => {
    const r = await fetch(SRC, { headers: { 'user-agent': 'Mozilla/5.0 (POLARIS open data viewer)' } })
    if (!r.ok) throw new Error(`Climate Reanalyzer responded ${r.status}`)
    const all: Series[] = await r.json()
    const years = all.filter((s) => /^\d{4}$/.test(s.name))
    const cur = years.at(-1)!
    const prelim = all.find((s) => s.name === 'Preliminary')?.data ?? []
    // final values first; preliminary fills the most recent days
    const data = cur.data.map((v, i) => v ?? prelim[i] ?? null)
    const firstPrelim = cur.data.findIndex((v, i) => v === null && prelim[i] != null)
    const record = years.slice(0, -1).reduce((best, s) => (Math.max(...s.data.map((v) => v ?? -99)) > Math.max(...best.data.map((v) => v ?? -99)) ? s : best))
    return {
      source: SRC, unit: '°C',
      year: Number(cur.name), data, preliminaryFrom: firstPrelim,
      previous: { year: Number(years.at(-2)!.name), data: years.at(-2)!.data },
      record: { year: Number(record.name), data: record.data },
      climatology: { name: '1991-2020', data: all.find((s) => s.name === '1991-2020')?.data ?? [] },
    }
  }, 'public, s-maxage=21600, stale-while-revalidate=86400')
}
