// Landing. Domain cards keep the Phase 2 layout the owner prefers (accent
// top bar, slash-separated mono subcategory line, list count), recolored to
// the Ash 1 tokens with the new domain accents. Owner decision 2026-08-10,
// a flagged departure from the mockup's domain-card treatment.

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
      <section className="border-b border-outline-variant py-16 sm:py-24">
        <p className="eyebrow">A personal ranking system</p>
        <h1 className="mt-3 font-display text-headline-lg-mobile sm:text-display">
          Everything,
          <br />
          R8ted.
        </h1>
        <p className="mt-5 max-w-xl font-body text-body-lg text-on-surface-variant">
          Four scores per entry, one composite, eight cards at the top. The rest live beyond the eight.
        </p>
      </section>

      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        {DOMAINS.map((d) => {
          const count = lists.filter((l) => l.domainId === d.id).length
          return (
            <Link
              key={d.id}
              to={`/domain/${d.id}`}
              className="group focus-ring relative rounded border border-outline-variant bg-surface-container p-6 transition-colors hover:border-[color:var(--accent-50)] hover:bg-surface-container-high"
              style={{ '--accent-50': `${d.accent}80` }}
            >
              <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: d.accent }} />
              <h2 className="font-ui text-2xl font-bold tracking-tight">{d.name}</h2>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-on-surface-variant">
                {d.subcategories.map((s) => s.name).join(' / ')}
              </p>
              <p className="mt-6 font-mono text-label-mono text-on-surface-variant">
                {count} {count === 1 ? 'list' : 'lists'}
              </p>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
