import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getDomain, getSubcategory } from '../lib/taxonomy'
import { getStorage } from '../lib/storage'
import { rankedEntries, compositeText, entryImage } from '../lib/entries'
import { useEditMode } from '../lib/EditMode'
import { NotFound } from './Domain'

export default function Subcategory() {
  const { domainId, subId } = useParams()
  const domain = getDomain(domainId)
  const sub = getSubcategory(domainId, subId)
  const { canEdit } = useEditMode()
  const [lists, setLists] = useState([])
  useEffect(() => {
    getStorage().getLists().then(setLists)
  }, [])

  if (!domain || !sub) return <NotFound label="subcategory" />
  const mine = lists.filter((l) => l.domainId === domainId && l.subId === subId)

  return (
    <div className="py-12">
      <p className="eyebrow">
        <Link to="/" className="focus-ring hover:text-paper">Home</Link> /{' '}
        <Link to={`/domain/${domainId}`} className="focus-ring hover:text-paper">{domain.name}</Link> / {sub.name}
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-bold sm:text-6xl">{sub.name}</h1>
        {canEdit && (
          <Link
            to={`/new/${domainId}/${subId}`}
            className="focus-ring border border-paper px-4 py-2 font-ui text-sm font-medium hover:bg-paper hover:text-ink"
          >
            + New list
          </Link>
        )}
      </div>

      {mine.length === 0 ? (
        <p className="mt-12 font-body text-mute">
          No lists yet.{' '}
          {canEdit ? 'Start one with + New list.' : 'Unlock edit mode to start one.'}
        </p>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((l) => {
            const ranked = rankedEntries(l.entries)
            const top = ranked[0]
            return (
              <Link
                key={l.id}
                to={`/list/${l.id}`}
                className="group focus-ring overflow-hidden border border-edge bg-panel transition-colors hover:border-mute"
              >
                {top && (
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img src={entryImage(top)} alt="" className="img-mono h-full w-full object-cover" loading="lazy" />
                    <span
                      className="absolute bottom-2 right-3 font-mono text-xl font-bold"
                      style={{ color: domain.accent, textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}
                    >
                      {compositeText(top.scores)}
                    </span>
                  </div>
                )}
                <div className="p-5">
                  <h2 className="font-ui text-lg font-bold">{l.title}</h2>
                  {l.tagline && <p className="mt-1 font-body text-sm text-mute">{l.tagline}</p>}
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-label text-mute">
                    {ranked.length} ranked{top ? ` / #1 ${top.name}` : ''}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
