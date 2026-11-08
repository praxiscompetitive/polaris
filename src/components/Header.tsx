import { SECTIONS, useStore } from '../store'
import Icon from './Icons'

const name = (l: string) => (l === 'SRI LANKA' ? 'Sri Lanka' : l[0] + l.slice(1).toLowerCase())

/** The POLARIS mark and wordmark: one component, so the landing header and the map bar can never drift apart. */
export const Brand = () => (
  <>
    <img className="brand__icon" src="/brand/icon-180.png" alt="" width={36} height={36} />
    <img className="brand__word" src="/brand/wordmark.png" alt="" width={116} height={12} />
  </>
)

/** Fixed glass bar: the brand, then one icon per page. Each icon is a page of its own. */
export default function Header() {
  const { current } = useStore()
  return (
    <header className="top">
      <a href="#home" className="top__brand" aria-label="POLARIS, home" aria-current={current === 'home' ? 'page' : undefined}>
        <Brand />
      </a>
      <nav className="top__nav" aria-label="Pages">
        {SECTIONS.slice(1).map((s) => (
          <a key={s.id} href={`#${s.id}`} aria-current={current === s.id ? 'page' : undefined}>
            <Icon id={s.id} size={20} /><span>{name(s.label)}</span>
          </a>
        ))}
      </nav>
    </header>
  )
}
