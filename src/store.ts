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

type State = { current: SectionId; visited: SectionId[]; debug: boolean }
const read = <T,>(k: string, d: T): T => {
  try {
    return JSON.parse(sessionStorage.getItem(k) ?? '') as T
  } catch {
    return d
  }
}
let state: State = {
  current: 'home',
  visited: read<SectionId[]>('polaris.visited', ['home']),
  debug: read('polaris.debug', false),
}
const subs = new Set<() => void>()

export function set(p: Partial<State>) {
  state = { ...state, ...p }
  try {
    sessionStorage.setItem('polaris.visited', JSON.stringify(state.visited))
    sessionStorage.setItem('polaris.debug', JSON.stringify(state.debug))
  } catch {
    /* storage unavailable — session memory is a nicety */
  }
  document.body.classList.toggle('debug', state.debug)
  subs.forEach((f) => f())
}
export const get = () => state
export function useStore() {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    get,
  )
}
