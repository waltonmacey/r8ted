// Side-by-Side Duel (locked decision, reference: tab 02 of r8ted-session-alternatives.html).
// Two options share the screen and are scored together, each anchoring the other.
// Pairing logic (build note implemented):
//   - While unscored entries remain and rated entries exist, pair the next unscored
//     with a rated calibration anchor (nearest by composite to the running median).
//   - With no rated pool yet, pair two unscored entries.
//   - Odd one out: the final unscored entry pairs with a rated anchor.
//   - New Pairing rotates to a different partner without saving.
// Live composite math stays visible per card: (a + b + c + d) / 4 = X.XX.

import { Link, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getDomain } from '../lib/taxonomy'
import { getStorage } from '../lib/storage'
import {
  rankedEntries,
  benchEntries,
  isScored,
  clampScore,
  composite,
  entryImage,
} from '../lib/entries'
import { useEditMode } from '../lib/EditMode'
import { NotFound } from './Domain'

export default function DuelSession() {
  const { listId } = useParams()
  const { canEdit } = useEditMode()
  const [list, setList] = useState(undefined)
  const [pairIds, setPairIds] = useState(null)
  const [drafts, setDrafts] = useState({}) // entryId -> [4 score strings]
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    getStorage().getList(listId).then(setList)
  }, [listId])

  const ranked = useMemo(() => (list ? rankedEntries(list.entries) : []), [list])
  const bench = useMemo(() => (list ? benchEntries(list.entries) : []), [list])

  // Choose the current pair.
  useEffect(() => {
    if (!list) return
    const pair = choosePair(list.entries, rotation)
    setPairIds(pair ? pair.map((e) => e.id) : null)
  }, [list, rotation])

  // Seed drafts whenever the pair changes.
  useEffect(() => {
    if (!pairIds || !list) return
    setDrafts((prev) => {
      const next = { ...prev }
      for (const id of pairIds) {
        if (!next[id]) {
          const e = list.entries.find((x) => x.id === id)
          next[id] = isScored(e.scores) ? e.scores.map((s) => String(s)) : ['', '', '', '']
        }
      }
      return next
    })
  }, [pairIds, list])

  if (list === undefined) return <p className="py-20 font-mono text-sm text-on-surface-variant">Loading</p>
  if (list === null) return <NotFound label="list" />
  if (!canEdit)
    return (
      <div className="py-20">
        <h1 className="font-display text-headline-md">Edit mode required.</h1>
        <p className="mt-2 font-body text-on-surface-variant">Unlock edit mode from the nav to run a session.</p>
      </div>
    )

  const domain = getDomain(list.domainId)
  const accent = domain?.accent ?? '#ffffff'
  const pair = pairIds ? pairIds.map((id) => list.entries.find((e) => e.id === id)).filter(Boolean) : []

  function setDraft(id, i, v) {
    setDrafts((prev) => {
      const arr = (prev[id] || ['', '', '', '']).slice()
      arr[i] = v
      return { ...prev, [id]: arr }
    })
  }

  function draftComplete(id) {
    const d = drafts[id]
    return d && d.every((s) => s !== '' && !Number.isNaN(Number(s)))
  }

  async function savePair() {
    const entries = list.entries.map((e) => {
      if (!pairIds.includes(e.id)) return e
      if (!draftComplete(e.id)) return e
      return { ...e, scores: drafts[e.id].map(clampScore) }
    })
    const next = { ...list, entries }
    await getStorage().saveList(next)
    // Clear saved drafts and advance.
    setDrafts((prev) => {
      const n = { ...prev }
      pairIds.forEach((id) => delete n[id])
      return n
    })
    setRotation(0)
    setList(next)
  }

  const anySavable = pair.some((e) => draftComplete(e.id))

  return (
    <div className="py-10">
      <p className="eyebrow">
        <Link to={`/list/${list.id}`} className="focus-ring hover:text-on-surface">
          {list.title}
        </Link>{' '}
        / Duel session
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-headline-lg-mobile sm:text-headline-lg">Duel</h1>
        <p className="font-mono text-xs text-on-surface-variant">
          {bench.length} on the bench / {ranked.length} ranked
        </p>
      </div>

      {pair.length < 2 ? (
        <div className="mt-14 rounded border border-outline-variant bg-surface-container p-8 text-center">
          <p className="font-display text-headline-md">Everyone is rated.</p>
          <p className="mt-2 font-body text-sm text-on-surface-variant">
            The bench is clear. Head back to the list, or keep dueling rated pairs to recalibrate.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            {ranked.length >= 2 && (
              <button
                onClick={() => setRotation((r) => r + 1)}
                className="focus-ring btn-ghost"
              >
                Duel rated pairs
              </button>
            )}
            <Link
              to={`/list/${list.id}`}
              className="focus-ring btn-primary"
            >
              Back to the list
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {pair.map((e) => (
              <DuelCard
                key={e.id}
                entry={e}
                draft={drafts[e.id] || ['', '', '', '']}
                scoreLabels={list.scoreLabels}
                accent={accent}
                wasRated={isScored(e.scores)}
                onChange={(i, v) => setDraft(e.id, i, v)}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={savePair}
              disabled={!anySavable}
              className="focus-ring btn-primary disabled:opacity-40"
            >
              Save pair and next
            </button>
            <button
              onClick={() => setRotation((r) => r + 1)}
              className="focus-ring btn-ghost"
            >
              New pairing
            </button>
            <Link to={`/list/${list.id}`} className="focus-ring ml-auto font-mono text-[11px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface">
              End session
            </Link>
          </div>
        </>
      )}

      <ChipStrip ranked={ranked} benchCount={bench.length} accent={accent} activeIds={pairIds || []} />
    </div>
  )
}

// --- pairing ---

function choosePair(entries, rotation) {
  const rated = rankedEntries(entries)
  const unrated = benchEntries(entries)

  if (unrated.length >= 1 && rated.length >= 1) {
    // Calibration: next unscored vs a rated anchor near the middle of the field,
    // rotated by the New Pairing counter.
    const target = unrated[0]
    const mid = Math.floor(rated.length / 2)
    const anchor = rated[(mid + rotation) % rated.length]
    return [target, anchor]
  }
  if (unrated.length >= 2) {
    const second = unrated[1 + (rotation % Math.max(1, unrated.length - 1))]
    return [unrated[0], second || unrated[1]]
  }
  if (unrated.length === 0 && rated.length >= 2 && rotation > 0) {
    // Optional recalibration duels between rated entries.
    const a = rated[rotation % rated.length]
    let b = rated[(rotation * 3 + 1) % rated.length]
    if (b.id === a.id) b = rated[(rotation + 1) % rated.length]
    return b.id === a.id ? null : [a, b]
  }
  return null
}

// --- duel card ---

function DuelCard({ entry, draft, scoreLabels, accent, wasRated, onChange }) {
  const nums = draft.map((s) => (s === '' ? null : Number(s)))
  const complete = nums.every((n) => n !== null && !Number.isNaN(n))
  const comp = complete ? nums.reduce((a, b) => a + b, 0) / 4 : null

  return (
    <div className="rounded border border-outline-variant bg-surface-container">
      <div className="flex gap-4 p-4">
        <img src={entryImage(entry)} alt="" className="img-muted h-28 w-24 shrink-0 object-cover" />
        <div className="min-w-0">
          <p className="eyebrow">{wasRated ? 'Rated anchor' : 'Unrated'}</p>
          <h2 className="mt-1 truncate font-display text-headline-md">{entry.name}</h2>
          {entry.keyStat && (
            <p className="mt-1 truncate font-mono text-[11px] uppercase tracking-widest text-on-surface-variant">{entry.keyStat}</p>
          )}
        </div>
      </div>
      <div className="space-y-2 border-t border-outline-variant p-4">
        {scoreLabels.map((label, i) => (
          <label key={i} className="flex items-center gap-3">
            <span className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">{label}</span>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={draft[i] === '' ? 5 : draft[i]}
              onChange={(e) => onChange(i, e.target.value)}
              className="focus-ring flex-1 accent-current"
              style={{ color: accent }}
            />
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={draft[i]}
              placeholder="-"
              onChange={(e) => onChange(i, e.target.value)}
              className="focus-ring w-16 border border-outline-variant bg-background px-2 py-1 text-right font-mono text-sm"
            />
          </label>
        ))}
        <p className="pt-2 font-mono text-xs text-on-surface-variant">
          {complete ? (
            <>
              ({nums.map((n) => n.toFixed(1)).join(' + ')}) / 4 ={' '}
              <span className="font-bold" style={{ color: accent }}>
                {comp.toFixed(2)}
              </span>
            </>
          ) : (
            'Score all four to see the composite.'
          )}
        </p>
      </div>
    </div>
  )
}

// --- chip strip ---

function ChipStrip({ ranked, benchCount, accent, activeIds }) {
  return (
    <section className="mt-10 border-t border-outline-variant pt-5">
      <p className="eyebrow">Current ranking</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {ranked.length === 0 && <span className="font-body text-sm text-on-surface-variant">No one ranked yet.</span>}
        {ranked.map((e, i) => (
          <span key={e.id} className="contents">
            {i === 8 && (
              <span
                className="mx-1 self-stretch border-l-2 pl-2 font-mono text-[10px] uppercase tracking-widest"
                style={{ borderColor: accent, color: accent }}
              >
                Beyond the Eight
              </span>
            )}
            <span
              className={`flex items-center gap-2 border px-2.5 py-1 font-ui text-xs ${
                activeIds.includes(e.id) ? 'border-on-surface' : 'border-outline-variant'
              }`}
            >
              <span className="font-bold text-on-surface-variant">{String(i + 1).padStart(2, '0')}</span>
              <span>{e.name}</span>
              <span className="font-mono text-[10px]" style={{ color: accent }}>
                {composite(e.scores).toFixed(2)}
              </span>
            </span>
          </span>
        ))}
        {benchCount > 0 && (
          <span className="border border-dashed border-outline-variant px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
            +{benchCount} on the bench
          </span>
        )}
      </div>
    </section>
  )
}
