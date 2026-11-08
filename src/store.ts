import { useSyncExternalStore } from 'react'

export const SECTIONS = [
  { id: 'home', label: 'POLARIS', blurb: 'An open window into our planet' },
  { id: 'explorer', label: 'EXPLORER', blurb: 'Satellite layers on a 3D globe' },
  { id: 'ocean', label: 'OCEAN', blurb: 'Temperature, colour, salinity, currents' },
  { id: 'monitor', label: 'MONITOR', blurb: 'The same place, years apart' },
  { id: 'events', label: 'EVENTS', blurb: 'Storms, fires and earthquakes, live' },
  { id: 'observatory', label: 'OBSERVATORY', blurb: 'Global indicators, with sources' },
  { id: 'region', label: 'SRI LANKA', blurb: 'Featured region, Indian Ocean' },
  { id: 'sources', label: 'SOURCES', blurb: 'Data, licences and methods' },
] as const
export type SectionId = (typeof SECTIONS)[number]['id']

/** The page a URL belongs to: #ocean is the Ocean page, #app/ocean?… is the map opened from it. */
export function fromHash(h = location.hash): SectionId {
  const m = h.match(/^#(?:app\/)?([a-z]+)/)
  return SECTIONS.find((s) => s.id === m?.[1])?.id ?? 'home'
}

let state = { current: fromHash() }
const subs = new Set<() => void>()

export function setCurrent(current: SectionId) {
  if (current === state.current) return
  state = { current }
  subs.forEach((f) => f())
}
export const get = () => state
export function useStore() {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    get,
  )
}
