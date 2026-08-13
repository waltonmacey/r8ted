// Dimension score pass, POC tab 03 of r8ted-phase5-poc.html, revived in Phase 6
// with a narrower role than the POC gave it: a quick tinker tool for a list that
// already exists, never part of the placement flow. Pick one dimension, then
// sweep every ranked item top to bottom with one tap each. It never benches
// anything, and untapped items keep exactly the values they had.
//
// Three flagged adaptations of the POC:
//
//  1. The POC tracks hand edits per dimension (an overrides[name][dim] map).
//     Our model marks them per entry (scoresEdited), per the Phase 6 scope. The
//     hand set against placeholder distinction lives in the caption under the
//     name rather than in the chip, so the chip can say one thing only: this is
//     where the value sits right now.
//  2. The POC matches a chip to a placeholder within 0.26, because its
//     placeholders did not line up with its own scale. Since Phase 7 every
//     stored subscore is a multiple of 0.5, which is exactly the scale's step,
//     so every row opens with its chip already filled at its current value and
//     no tolerance is needed. That is the point of the half point rule: the
//     sweep starts from where the list already stands rather than from blank,
//     and a tap is a correction rather than an entry.
//  3. The scale runs 5.0 to 10.0 per the POC. A long list's placeholder chain
//     can walk below 5.0 (anchor 9.5 stepping down 0.25 on average reaches 5.0
//     around rank 19), and such a value has no chip. The readout still shows it
//     and a tap simply moves the value onto the scale. Widening the scale is a
//     one line change if that turns out to bite.
//
// Sweep order is frozen when the pass opens and when the dimension changes, so
// the row under your thumb never moves mid sweep. Rank numerals and composites
// update live, and a moved item shows how far it travelled, so the reordering
// the sort invariant performs stays visible without breaking the rhythm.

import { Link, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getDomain } from '../lib/taxonomy'
import { getStorage } from '../lib/storage'
import { rankedEntries, compositeText, entryImage } from '../lib/entries'
import { useEditMode } from '../lib/EditMode'
import { NotFound } from './Domain'

// 5.0 to 10.0 in half points, per the POC.
export const TAP_SCALE = Array.from({ length: 11 }, (_, i) => 5 + i * 0.5)

// The chip a value sits on, or null when it falls off the scale. Since Phase 7
// stored subscores are already multiples of 0.5, so the rounding is a guard for
// legacy data written before that rule, not a routine approximation.
export function chipFor(value) {
  const nearest = Math.round(value * 2) / 2
  if (nearest < TAP_SCALE[0] || nearest > TAP_SCALE[TAP_SCALE.length - 1]) return null
  return nearest
}

export default function ScorePass() {
  const { listId } = useParams()
  const { canEdit } = useEditMode()
  const [list, setList] = useState(undefined)
  const [dim, setDim] = useState(0)
  // Frozen sweep order: entry ids in the ranking as it stood when the sweep
  // began. Reset when the dimension changes.
  const [sweep, setSweep] = useState(null)
  const [taps, setTaps] = useState(0)

  useEffect(() => {
    getStorage().getList(listId).then(setList)
  }, [listId])

  const ranked = useMemo(() => (list ? rankedEntries(list.entries) : []), [list])

  useEffect(() => {
    if (!list || sweep) return
    setSweep(rankedEntries(list.entries).map((e) => e.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list])

  if (list === undefined) return <p className="py-20 font-mono text-sm text-on-surface-variant">Loading</p>
  if (list === null) return <NotFound label="list" />
  if (!canEdit)
    return (
      <div className="py-20">
        <h1 className="font-display text-headline-md">Edit mode required.</h1>
        <p className="mt-2 font-body text-on-surface-variant">Unlock edit mode from the nav to run a score pass.</p>
      </div>
    )

  const domain = getDomain(list.domainId)
  const accent = domain?.accent ?? '#ffffff'
  const liveRank = new Map(ranked.map((e, i) => [e.id, i]))
  const rows = (sweep || [])
    .map((id) => ranked.find((e) => e.id === id))
    .filter(Boolean)

  function changeDim(i) {
    setDim(i)
    setSweep(ranked.map((e) => e.id))
  }

  async function setScore(entryId, value) {
    const entries = list.entries.map((e) => {
      if (e.id !== entryId) return e
      const scores = e.scores.slice()
      scores[dim] = value
      return { ...e, scores, scoresEdited: true }
    })
    const next = { ...list, entries }
    setList(next)
    setTaps((n) => n + 1)
    await getStorage().saveList(next)
  }

  const moved = rows.filter((e, i) => liveRank.get(e.id) !== i).length

  return (
    <div className="py-10">
      <p className="eyebrow">
        <Link to={`/list/${list.id}`} className="focus-ring hover:text-on-surface">
          {list.title}
        </Link>{' '}
        / Score pass
      </p>
      <h1 className="mt-3 font-display text-headline-lg-mobile sm:text-headline-lg">Score pass</h1>
      <p className="mt-2 font-body text-on-surface-variant">
        One dimension at a time, all items in one sweep. Every row opens on its
        current value, so a tap is a correction, not an entry.
      </p>
      <p className="mt-3 font-mono text-xs uppercase tracking-[0.08em] text-on-surface-variant">
        {taps} tap{taps === 1 ? '' : 's'} this pass
        {moved > 0 && (
          <>
            {' / '}
            <span style={{ color: accent }} className="normal-case">
              {moved} item{moved === 1 ? '' : 's'} moved
            </span>
            {' / sweep order held, numerals live'}
          </>
        )}
      </p>

      {/* Dimension picker, POC .dimtabs */}
      <div className="mt-6 flex flex-wrap gap-1.5">
        {list.scoreLabels.map((label, i) => (
          <button
            key={i}
            onClick={() => changeDim(i)}
            className={`focus-ring rounded-sm border px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${
              i === dim
                ? 'bg-surface-container-low'
                : 'border-outline-variant text-on-surface-variant hover:text-on-surface'
            }`}
            style={i === dim ? { borderColor: accent, color: accent } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 font-body text-on-surface-variant">
          Nothing ranked yet, so there is nothing to sweep. Run a duel session first.
        </p>
      ) : (
        <div className="mt-6">
          {rows.map((entry, i) => (
            <ScoreRow
              key={entry.id}
              entry={entry}
              dim={dim}
              accent={accent}
              rank={liveRank.get(entry.id) + 1}
              sweepRank={i + 1}
              onTap={(v) => setScore(entry.id, v)}
            />
          ))}
        </div>
      )}

      <div className="mt-9 flex flex-wrap items-center gap-3 border-t border-outline-variant pt-6">
        <Link to={`/list/${list.id}`} className="focus-ring btn-primary">
          Done
        </Link>
        <p className="font-mono text-[11px] text-on-surface-variant">
          Every tap saves and marks the entry hand set, so it survives placeholder regeneration.
        </p>
      </div>
    </div>
  )
}

function ScoreRow({ entry, dim, accent, rank, sweepRank, onTap }) {
  const value = Number(entry.scores[dim])
  const on = chipFor(value)
  const edited = !!entry.scoresEdited
  const delta = sweepRank - rank
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-t border-outline-variant py-3 sm:flex-nowrap">
      <span
        className="w-[30px] shrink-0 text-center font-ui text-[1.1rem] font-black leading-none"
        style={{ color: accent }}
      >
        {String(rank).padStart(2, '0')}
      </span>
      <img
        src={entryImage(entry)}
        alt=""
        className="aspect-[4/5] w-11 shrink-0 rounded-sm object-cover"
        style={{ filter: 'saturate(0.45)' }}
        loading="lazy"
      />
      <div className="min-w-0 flex-1 sm:w-[200px] sm:flex-none">
        <p className="truncate font-display text-[1.05rem] font-semibold leading-tight">{entry.name}</p>
        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-on-surface-variant">
          {edited ? 'hand set' : 'placeholder'}
          {delta !== 0 && ` / ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)}`}
        </p>
      </div>
      {/* POC .tapscale: one tap per item, no keyboard. Half steps carry no
          label so the whole numbers read as the scale. */}
      <div className="order-last flex w-full gap-[3px] sm:order-none sm:w-auto sm:flex-1">
        {TAP_SCALE.map((v) => {
          // Filled means "the value is here now", whether it was hand set or
          // generated. Outlined is reserved for a value that has fallen off the
          // scale, where the nearest chip is shown as an approximation.
          const solid = on === v && value >= TAP_SCALE[0] && value <= TAP_SCALE[TAP_SCALE.length - 1]
          const outline = !solid && on === v
          return (
            <button
              key={v}
              onClick={() => onTap(v)}
              title={v.toFixed(1)}
              className={`focus-ring h-[34px] min-w-[24px] flex-1 rounded-sm border font-mono text-[10px] transition-colors sm:h-[30px] ${
                solid
                  ? 'font-bold text-primary-container'
                  : outline
                    ? 'border-outline-variant bg-surface-container-high text-on-surface-variant'
                    : 'border-transparent bg-surface-container-high text-outline hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]'
              }`}
              style={solid ? { backgroundColor: accent, borderColor: accent } : { '--accent': accent }}
            >
              {v % 1 ? '' : v}
            </button>
          )
        })}
      </div>
      <div className="w-[84px] shrink-0 text-right font-mono text-xs" style={{ color: accent }}>
        {value.toFixed(1)}
        <span className="block text-[9px] text-on-surface-variant">comp {compositeText(entry.scores)}</span>
      </div>
    </div>
  )
}
