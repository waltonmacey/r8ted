// Domain browse page. Subcategory browse cards per design spec section 7:
// h-[400px], background image per section 6 (opacity 40% + saturate-50, hover
// lifts to 60%/full color with a 1.05 zoom), gradient overlay, bottom-left
// content, count chip, accent hover border with a soft glow, arrow slide-in.
// Card imagery comes from the top-ranked entry of the newest list in the
// subcategory until catalogs bring dedicated imagery; cards with no lists
// fall back to a plain surface fill.

import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getDomain } from '../lib/taxonomy'
import { getStorage } from '../lib/storage'
import { rankedEntries, entryImage } from '../lib/entries'

export default function Domain() {
  const { domainId } = useParams()
  const domain = getDomain(domainId)
  const [lists, setLists] = useState([])
  useEffect(() => {
    getStorage().getLists().then(setLists)
  }, [])

  if (!domain) return <NotFound label="domain" />

  return (
    <div className="py-12">
      <p className="eyebrow">
        <Link to="/" className="focus-ring hover:text-on-surface">Home</Link> / {domain.name}
      </p>
      <h1 className="mt-3 font-display text-headline-lg-mobile sm:text-headline-lg">{domain.name}</h1>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {domain.subcategories.map((s) => {
          const mine = lists.filter((l) => l.domainId === domain.id && l.subId === s.id)
          const count = mine.length
          const top = mine.length ? rankedEntries(mine[mine.length - 1].entries)[0] : null
          return (
            <Link
              key={s.id}
              to={`/sub/${domain.id}/${s.id}`}
              className="group focus-ring relative flex h-[400px] flex-col justify-end overflow-hidden rounded border border-outline-variant bg-surface-container transition-all hover:border-[color:var(--accent)] hover:shadow-[0_0_15px_var(--accent-glow)]"
              style={{ '--accent': domain.accent, '--accent-glow': `${domain.accent}33` }}
            >
              {top && (
                <img
                  src={entryImage(top)}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-40 saturate-50 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 group-hover:opacity-60 group-hover:saturate-100"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" aria-hidden="true" />
              <div className="relative p-6">
                <h2 className="font-display text-headline-lg-mobile transition-colors group-hover:text-[color:var(--accent)] sm:text-headline-lg">
                  {s.name}
                </h2>
                <p className="mt-2 max-w-sm font-body text-body-md text-on-surface-variant">{s.scope}</p>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-on-surface-variant">
                  {s.defaultScoreLabels.join(' / ')}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span
                    className="inline-block rounded border px-2 py-1 font-mono text-label-mono backdrop-blur-sm"
                    style={{
                      color: domain.accent,
                      borderColor: `${domain.accent}4d`,
                      background: `${domain.accent}1a`,
                    }}
                  >
                    {count} {count === 1 ? 'Active List' : 'Active Lists'}
                  </span>
                  <span
                    aria-hidden="true"
                    className="-translate-x-2.5 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                    style={{ color: domain.accent }}
                  >
                    &rarr;
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function NotFound({ label }) {
  return (
    <div className="py-20">
      <h1 className="font-display text-headline-md">Nothing here.</h1>
      <p className="mt-2 font-body text-on-surface-variant">That {label} does not exist. <Link className="underline" to="/">Back home</Link>.</p>
    </div>
  )
}
