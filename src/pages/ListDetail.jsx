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

  if (list === undefined) return <p className="py-20 font-mono text-sm text-mute">Loading</p>
  if (list === null) return <NotFound label="list" />

  const domain = getDomain(list.domainId)
  const sub = getSubcategory(list.domainId, list.subId)
  const accent = domain?.accent ?? '#f9f9f9'
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

  return (
    <div className="py-12">
      <p className="eyebrow">
        <Link to="/" className="focus-ring hover:text-paper">Home</Link> /{' '}
        <Link to={`/domain/${list.domainId}`} className="focus-ring hover:text-paper">{domain?.name}</Link> /{' '}
        <Link to={`/sub/${list.domainId}/${list.subId}`} className="focus-ring hover:text-paper">{sub?.name}</Link> /{' '}
        {list.title}
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold sm:text-6xl">{list.title}</h1>
          {list.tagline && <p className="mt-2 font-body text-mute">{list.tagline}</p>}
          <p className="mt-3 font-mono text-[11px] uppercase tracking-label" style={{ color: accent }}>
            {list.scoreLabels.join(' / ')}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setEditing({ scores: null })}
              className="focus-ring border border-edge px-4 py-2 font-ui text-sm hover:border-paper"
            >
              + Custom entry
            </button>
            {(bench.length > 0 || ranked.length > 1) && (
              <Link
                to={`/session/${list.id}`}
                className="focus-ring border border-paper px-4 py-2 font-ui text-sm font-medium hover:bg-paper hover:text-ink"
              >
                Duel session
              </Link>
            )}
            <button
              onClick={deleteList}
              onBlur={() => setArmed(false)}
              className={`focus-ring px-3 py-2 font-mono text-[11px] uppercase tracking-label ${
                armed ? 'bg-lifestyle text-ink' : 'text-mute hover:text-lifestyle'
              }`}
            >
              {armed ? 'Confirm delete list' : 'Delete list'}
            </button>
          </div>
        )}
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">The Power of Eight</h2>
        {eight.length === 0 ? (
          <p className="mt-4 font-body text-mute">
            Nothing ranked yet. {canEdit ? 'Run a duel session to start scoring.' : ''}
          </p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <h2 className="font-display text-2xl font-semibold">The Bench</h2>
            <span className="font-mono text-xs text-mute">{bench.length} unscored</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {bench.map((e) => (
              <button
                key={e.id}
                disabled={!canEdit}
                onClick={() => setEditing(e)}
                className="focus-ring group flex items-center gap-3 border border-edge bg-panel py-2 pl-2 pr-4 text-left hover:border-mute disabled:cursor-default"
              >
                <img src={entryImage(e)} alt="" className="img-mono h-10 w-8 object-cover" loading="lazy" />
                <span className="font-ui text-sm">{e.name}</span>
              </button>
            ))}
          </div>
          {canEdit && (
            <p className="mt-3 font-mono text-[11px] text-mute">
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
