import { useEffect, useState } from 'react'

/** fetch with a timeout; throws a readable message, never a bare TypeError. */
export async function get(url: string, signal?: AbortSignal, ms = 20000): Promise<Response> {
  const t = AbortSignal.timeout(ms)
  const r = await fetch(url, { signal: signal ? AbortSignal.any([signal, t]) : t }).catch((e: Error) => {
    throw new Error(e.name === 'TimeoutError' ? 'Timed out' : e.name === 'AbortError' ? 'Cancelled' : 'Network error')
  })
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error(body.error === 'not-configured' ? 'not-configured' : body.error ?? `HTTP ${r.status}`)
  }
  return r
}
export const json = <T,>(url: string, s?: AbortSignal) => get(url, s).then((r) => r.json() as Promise<T>)

export type Async<T> = { data?: T; error?: string; loading: boolean }
/** One request per deps change; aborted on unmount so a closed view never paints stale data. */
export function useData<T>(fn: (s: AbortSignal) => Promise<T>, deps: unknown[]): Async<T> {
  const [st, set] = useState<Async<T>>({ loading: true })
  useEffect(() => {
    const ac = new AbortController()
    set((p) => ({ data: p.data, loading: true }))
    fn(ac.signal).then((data) => set({ data, loading: false }), (e: Error) => { if (!ac.signal.aborted) set({ error: e.message, loading: false }) })
    return () => ac.abort()
  }, deps)
  return st
}
