import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { DOMAINS } from '../lib/taxonomy'
import { getStorage } from '../lib/storage'

export default function Home() {
  const [lists, setLists] = useState([])
  useEffect(() => {
    getStorage().getLists().then(setLists)
  }, [])

  return (
    <div>
      <section className="border-b border-edge py-16 sm:py-24">
        <p className="eyebrow">A personal ranking system</p>
        <h1 className="mt-3 font-display text-5xl font-black leading-[0.95] sm:text-7xl">
          Everything,
          <br />
          R8ted.
        </h1>
        <p className="mt-5 max-w-xl font-body text-mute">
          Four scores per entry, one composite, eight cards at the top. The rest live beyond the eight.
        </p>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2">
        {DOMAINS.map((d) => {
          const count = lists.filter((l) => l.domainId === d.id).length
          return (
            <Link
              key={d.id}
              to={`/domain/${d.id}`}
              className="group focus-ring relative border border-edge bg-panel p-6 transition-colors hover:border-mute"
            >
              <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: d.accent }} />
              <h2 className="font-ui text-2xl font-bold tracking-tight">{d.name}</h2>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-label text-mute">
                {d.subcategories.map((s) => s.name).join(' / ')}
              </p>
              <p className="mt-6 font-mono text-xs text-mute">
                {count} {count === 1 ? 'list' : 'lists'}
              </p>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
