import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { getDomain, getSubcategory } from '../lib/taxonomy'
import { getStorage } from '../lib/storage'
import { rankedEntries, benchEntries, makeId, entryImage } from '../lib/entries'
import { useEditMode } from '../lib/EditMode'
import EntryCard from '../components/EntryCard'
import BeyondTable from '../components/BeyondTable'
import EntryEditor from '../components/EntryEditor'
import { NotFound } from './Domain'

export default function ListDetail() {
  const { listId } = useParams()
  const navigate = useNavigate()
  const { canEdit } = useEditMode()
  const [list, setList] = useState(undefined)
  const [editing, setEditing] = useState(null)
  const [armed, setArmed] = useState(false)

  const reload = useCallback(() => {
    getStorage().getList(listId).then(setList)
  }, [listId])
  useEffect(reload, [reload])

  if (list === undefined) return <p className="py-20 font-mono text-sm text-on-surface-variant">Loading</p>
  if (list === null) return <NotFound label="list" />

  const domain = getDomain(list.domainId)
  const sub = getSubcategory(list.domainId, list.subId)
  const accent = domain?.accent ?? '#ffffff'
  const ranked = rankedEntries(list.entries)
  const eight = ranked.slice(0, 8)
  const beyond = ranked.slice(8)
  const bench = benchEntries(list.entries)

  async function saveEntry(updated) {
    const entries = updated.id
      ? list.entries.map((e) => (e.id === updated.id ? updated : e))
      : [...list.entries, { ...updated, id: makeId() }]
    const next = { ...list, entries }
    await getStorage().saveList(next)
    setList(next)
  }

  async function deleteEntry(entry) {
    const next = { ...list, entries: list.entries.filter((e) => e.id !== entry.id) }
    await getStorage().saveList(next)
    setList(next)
  }

  async function deleteList() {
    if (!armed) return setArmed(true)
    await getStorage().deleteList(list.id)
    navigate(`/sub/${list.domainId}/${list.subId}`)
  }

  const heroImage = eight[0] ? entryImage(eight[0]) : null

  return (
    <div>
      {/* Hero per design spec section 7: 60vh (min 400px), bottom-anchored,
          border-b, breadcrumb chip, display-size uppercase title, body-lg
          standfirst. Backdrop is the number-one entry's image at 60% opacity
          under a background gradient until lists carry dedicated hero art. */}
      <section className="relative -mx-4 flex min-h-[400px] flex-col justify-end border-b border-outline-variant px-4 pb-10 pt-24 lg:-mx-16 lg:px-16 lg:min-h-[60vh]">
        {heroImage && (
          <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" aria-hidden="true" />
        <div className="relative">
          <p className="chip-breadcrumb" style={{ color: accent, borderColor: `${accent}4d` }}>
            <Link to="/" className="focus-ring">Home</Link> /{' '}
            <Link to={`/domain/${list.domainId}`} className="focus-ring">{domain?.name}</Link> /{' '}
            <Link to={`/sub/${list.domainId}/${list.subId}`} className="focus-ring">{sub?.name}</Link>
          </p>
          <h1 className="mt-4 font-display text-headline-lg-mobile uppercase sm:text-display">{list.title}</h1>
          {list.tagline && (
            <p className="mt-3 max-w-xl font-body text-body-lg text-on-surface-variant">{list.tagline}</p>
          )}
          <p className="mt-3 font-mono text-[11px] uppercase tracking-widest" style={{ color: accent }}>
            {list.scoreLabels.join(' / ')}
          </p>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        {canEdit && (
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setEditing({ scores: null })} className="focus-ring btn-ghost">
              + Custom entry
            </button>
            {(bench.length > 0 || ranked.length > 1) && (
              <Link to={`/session/${list.id}`} className="focus-ring btn-primary">
                Duel session
              </Link>
            )}
            <button
              onClick={deleteList}
              onBlur={() => setArmed(false)}
              className={`focus-ring px-3 py-2 font-mono text-[11px] uppercase tracking-widest ${
                armed ? 'bg-error text-primary-container' : 'text-on-surface-variant hover:text-error'
              }`}
            >
              {armed ? 'Confirm delete list' : 'Delete list'}
            </button>
          </div>
        )}
      </div>

      <section className="mt-12">
        <h2 className="font-display text-headline-md">The Power of Eight</h2>
        {eight.length === 0 ? (
          <p className="mt-4 font-body text-on-surface-variant">
            Nothing ranked yet. {canEdit ? 'Run a duel session to start scoring.' : ''}
          </p>
        ) : (
          <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {eight.map((e, i) => (
              <EntryCard
                key={e.id}
                entry={e}
                rank={i + 1}
                scoreLabels={list.scoreLabels}
                accent={accent}
                canEdit={canEdit}
                onEdit={() => setEditing(e)}
              />
            ))}
          </div>
        )}
      </section>

      <BeyondTable
        entries={beyond}
        startRank={9}
        scoreLabels={list.scoreLabels}
        accent={accent}
        canEdit={canEdit}
        onEdit={setEditing}
      />

      {bench.length > 0 && (
        <section className="mt-14">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-headline-md">The Bench</h2>
            <span className="font-mono text-xs text-on-surface-variant">{bench.length} unscored</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {bench.map((e) => (
              <button
                key={e.id}
                disabled={!canEdit}
                onClick={() => setEditing(e)}
                className="focus-ring group flex items-center gap-3 rounded border border-outline-variant bg-surface-container py-2 pl-2 pr-4 text-left hover:border-secondary-container disabled:cursor-default"
              >
                <img src={entryImage(e)} alt="" className="img-muted h-10 w-8 object-cover" loading="lazy" />
                <span className="font-ui text-sm">{e.name}</span>
              </button>
            ))}
          </div>
          {canEdit && (
            <p className="mt-3 font-mono text-[11px] text-on-surface-variant">
              Bench entries get scored in the duel session, or tap one to score it directly.
            </p>
          )}
        </section>
      )}

      {editing && (
        <EntryEditor
          entry={editing}
          scoreLabels={list.scoreLabels}
          onSave={saveEntry}
          onDelete={editing.id ? deleteEntry : null}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
