import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getDomain } from '../lib/taxonomy'
import { getStorage } from '../lib/storage'

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
        <Link to="/" className="focus-ring hover:text-paper">Home</Link> / {domain.name}
      </p>
      <h1 className="mt-3 font-display text-4xl font-bold sm:text-6xl">{domain.name}</h1>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {domain.subcategories.map((s) => {
          const count = lists.filter((l) => l.domainId === domain.id && l.subId === s.id).length
          return (
            <Link
              key={s.id}
              to={`/sub/${domain.id}/${s.id}`}
              className="group focus-ring border border-edge bg-panel p-6 transition-colors hover:border-mute"
            >
              <h2 className="font-ui text-xl font-bold">{s.name}</h2>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-label text-mute">
                {s.defaultScoreLabels.join(' / ')}
              </p>
              <p className="mt-5 font-mono text-xs" style={{ color: domain.accent }}>
                {count} {count === 1 ? 'list' : 'lists'}
              </p>
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
      <h1 className="font-display text-3xl">Nothing here.</h1>
      <p className="mt-2 font-body text-mute">That {label} does not exist. <Link className="underline" to="/">Back home</Link>.</p>
    </div>
  )
}
