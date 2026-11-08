import { FormEvent, useRef, useState } from 'react'
import { LAYERS } from '../data/layers'
import { VIEWS } from '../lib/deeplink'
import { SECTIONS, SectionId, useStore } from '../store'
import { navigate } from './Transition'

/**
 * The terminal: a keyboard way into every view. Everything here is also a plain link above the prompt.
 * The mark lights one spoke for every section you visited this session.
 */
export default function Footer() {
  const { visited } = useStore()
  const [log, setLog] = useState<string[]>(['POLARIS terminal. Type help.'])
  const [cmd, setCmd] = useState('')
  const box = useRef<HTMLDivElement>(null)

  const run = (e: FormEvent) => {
    e.preventDefault()
    const [c, arg] = cmd.trim().toLowerCase().split(/\s+/)
    setCmd('')
    if (!c) return
    let out: string[] = []
    if (c === 'help') out = ['open <view>   views: ' + VIEWS.join(', '), 'layer <id>    opens Explorer with that layer', 'layers  goto <section>  visited  clear']
    else if (c === 'clear') return setLog([])
    else if (c === 'open' && (VIEWS as readonly string[]).includes(arg)) { location.hash = `#app/${arg}`; out = [`opening ${arg}`] }
    else if (c === 'layer' && LAYERS.some((l) => l.id === arg)) { location.hash = `#app/explorer?l=${arg}`; out = [`opening ${arg}`] }
    else if (c === 'layers') out = LAYERS.map((l) => `${l.id.padEnd(12)} ${l.title}`)
    else if (c === 'goto' && SECTIONS.some((s) => s.id === arg)) { navigate(arg as SectionId); out = [`going to ${arg}`] }
    else if (c === 'visited') out = [`${visited.length}/${SECTIONS.length}: ${visited.join(', ')}`]
    else out = [`unknown command: ${cmd.trim()}. Try help.`]
    setLog((l) => [...l, `> ${cmd.trim()}`, ...out].slice(-60))
    requestAnimationFrame(() => box.current?.scrollTo({ top: 9e5 }))
  }

  return (
    <footer className="foot" id="footer">
      <div className="foot__mark" role="img" aria-label={`You have visited ${visited.length} of ${SECTIONS.length} sections`}>
        <svg viewBox="-50 -50 100 100">
          {SECTIONS.map((s, i) => {
            const a = (i / SECTIONS.length) * Math.PI * 2 - Math.PI / 2
            return <line key={s.id} x1="0" y1="0" x2={Math.cos(a) * 42} y2={Math.sin(a) * 42} className={visited.includes(s.id) ? 'on' : ''} />
          })}
          <circle r="6" />
        </svg>
        <span className="mono">{visited.length}/{SECTIONS.length} visited</span>
      </div>
      <div className="foot__term">
        <div ref={box} className="term__log" role="log" aria-live="polite">
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
        <form onSubmit={run} className="term__in">
          <label><span aria-hidden="true">&gt;</span>
            <input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="help" aria-label="Terminal command" autoComplete="off" spellCheck={false} />
          </label>
        </form>
      </div>
      <nav className="foot__links" aria-label="Footer">
        {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`}>{s.label}</a>)}
      </nav>
      <p className="foot__legal">
        POLARIS is an open-source project by Praxis, released under the MIT licence. Imagery and data belong to their providers, listed under Sources.
      </p>
    </footer>
  )
}
