// Pick duel per POC tab 02 (Phase 5 rewrite). No scores are entered here;
// the four-score entry form is gone. Two modes share the side by side layout:
//
//   Placement: each Bench item binary-inserts into the ranked order. It faces
//     the middle of its remaining range, a tap on the winner halves the range,
//     and it slots in when the range closes. The first item into an empty list
//     takes the top without a pick.
//   Ladder: an already ranked item challenges upward from its slot. A win
//     swaps and continues, a loss stops. Entry point: tap a chip in the strip
//     (an addition over the POC, which had no ladder UI; flagged in handover).
//
// A placed or moved item lands by regenerating its placeholder rating to fit
// between its new neighbors, preserving the one invariant: display order is
// composite order. When a placement pass finishes, every non hand-edited
// rating regenerates top to bottom (anchor 9.5); hand edits survive.

import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getDomain } from '../lib/taxonomy'
import { getStorage } from '../lib/storage'
import {
  rankedEntries,
  benchEntries,
  composite,
  entryImage,
  fitBetween,
  withGeneratedScores,
  regeneratePlaceholders,
} from '../lib/entries'
import { useEditMode } from '../lib/EditMode'
import { NotFound } from './Domain'

// Worst-case pick count for placing `placed` items into a list that started
// with `startSize` ranked entries: inserting into a field of s costs at most
// ceil(log2(s + 1)) picks, and a field of 0 costs nothing.
function worstCase(startSize, placed) {
  let total = 0
  for (let i = 0; i < placed; i++) {
    const s = startSize + i
    if (s > 0) total += Math.ceil(Math.log2(s + 1))
  }
  return total
}

export default function DuelSession() {
  const { listId } = useParams()
  const { canEdit } = useEditMode()
  const [list, setList] = useState(undefined)
  const [session, setSession] = useState(null)

  useEffect(() => {
    getStorage().getList(listId).then(setList)
  }, [listId])

  // Auto-start a placement pass when the page opens with Bench items waiting.
  useEffect(() => {
    if (!list || session || !canEdit) return
    const bench = benchEntries(list.entries)
    if (bench.length > 0) startPlacement(list)
    else setSession({ mode: 'hub', summary: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, canEdit])

  if (list === undefined) return <p className="py-20 font-mono text-sm text-on-surface-variant">Loading</p>
  if (list === null) return <NotFound label="list" />
  if (!canEdit)
    return (
      <div className="py-20">
        <h1 className="font-display text-headline-md">Edit mode required.</h1>
        <p className="mt-2 font-body text-on-surface-variant">Unlock edit mode from the nav to run a session.</p>
      </div>
    )
  if (!session) return <p className="py-20 font-mono text-sm text-on-surface-variant">Loading</p>

  const domain = getDomain(list.domainId)
  const accent = domain?.accent ?? '#ffffff'
  const byId = (id) => list.entries.find((e) => e.id === id)

  // ---- placement ----

  function startPlacement(l) {
    const order = rankedEntries(l.entries).map((e) => e.id)
    const queue = benchEntries(l.entries).map((e) => e.id)
    beginNextItem({ order, queue, picks: 0, placed: 0, startSize: order.length }, l)
  }

  async function beginNextItem(base, l) {
    const { order, queue, picks, placed, startSize } = base
    let entries = l.entries
    if (queue.length === 0) {
      // Pass complete: full top-to-bottom regeneration, hand edits survive.
      entries = regeneratePlaceholders(entries)
      const next = { ...l, entries }
      await getStorage().saveList(next)
      setList(next)
      setSession({ mode: 'hub', summary: { kind: 'placement', picks, placed, startSize } })
      return
    }
    if (order.length === 0) {
      // Nothing to face yet: the first item takes the top slot for free.
      const id = queue[0]
      const item = entries.find((e) => e.id === id)
      const updated = withGeneratedScores(item, fitBetween(null, null))
      entries = entries.map((e) => (e.id === id ? updated : e))
      const next = { ...l, entries }
      await getStorage().saveList(next)
      setList(next)
      beginNextItem({ order: [id], queue: queue.slice(1), picks, placed: placed + 1, startSize }, next)
      return
    }
    setSession({
      mode: 'place',
      itemId: queue[0],
      queue: queue.slice(1),
      order,
      lo: 0,
      hi: order.length,
      picks,
      placed,
      startSize,
    })
  }

  async function pickPlace(winnerIsNew) {
    const s = session
    const picks = s.picks + 1
    const mid = (s.lo + s.hi) >> 1
    let { lo, hi } = s
    if (winnerIsNew) hi = mid
    else lo = mid + 1
    if (lo < hi) {
      setSession({ ...s, lo, hi, picks })
      return
    }
    // Range closed: land at index lo, rating fit between the new neighbors.
    const rankedObjs = s.order.map(byId)
    const upper = lo > 0 ? composite(rankedObjs[lo - 1].scores) : null
    const lower = lo < rankedObjs.length ? composite(rankedObjs[lo].scores) : null
    const item = byId(s.itemId)
    const updated = withGeneratedScores(item, fitBetween(upper, lower))
    const entries = list.entries.map((e) => (e.id === item.id ? updated : e))
    const next = { ...list, entries }
    await getStorage().saveList(next)
    setList(next)
    const order = [...s.order.slice(0, lo), item.id, ...s.order.slice(lo)]
    beginNextItem({ order, queue: s.queue, picks, placed: s.placed + 1, startSize: s.startSize }, next)
  }

  // ---- ladder ----

  function startLadder(entryId) {
    const order = rankedEntries(list.entries).map((e) => e.id)
    const pos = order.indexOf(entryId)
    if (pos <= 0) return
    setSession({ mode: 'ladder', itemId: entryId, order, pos, startPos: pos, picks: 0 })
  }

  async function pickLadder(challengerWins) {
    const s = { ...session, picks: session.picks + 1 }
    if (challengerWins) {
      const order = s.order.slice()
      ;[order[s.pos - 1], order[s.pos]] = [order[s.pos], order[s.pos - 1]]
      s.order = order
      s.pos -= 1
      if (s.pos > 0) {
        setSession(s)
        return
      }
    }
    await finishLadder(s)
  }

  async function finishLadder(s) {
    if (s.pos === s.startPos) {
      setSession({ mode: 'hub', summary: { kind: 'ladder-hold', name: byId(s.itemId).name, rank: s.pos + 1 } })
      return
    }
    const rankedObjs = s.order.map(byId)
    const upper = s.pos > 0 ? composite(rankedObjs[s.pos - 1].scores) : null
    const lower = s.pos + 1 < rankedObjs.length ? composite(rankedObjs[s.pos + 1].scores) : null
    const item = byId(s.itemId)
    const updated = withGeneratedScores(item, fitBetween(upper, lower))
    const entries = list.entries.map((e) => (e.id === item.id ? updated : e))
    const next = { ...list, entries }
    await getStorage().saveList(next)
    setList(next)
    setSession({
      mode: 'hub',
      summary: { kind: 'ladder', name: item.name, from: s.startPos + 1, to: s.pos + 1, picks: s.picks },
    })
  }

  // ---- render ----

  const ranked = rankedEntries(list.entries)
  const strip =
    session.mode === 'place' || session.mode === 'ladder'
      ? session.order.map(byId)
      : ranked

  return (
    <div className="py-10">
      <p className="eyebrow">
        <Link to={`/list/${list.id}`} className="focus-ring hover:text-on-surface">
          {list.title}
        </Link>{' '}
        / Duel session
      </p>
      <h1 className="mt-3 font-display text-headline-lg-mobile sm:text-headline-lg">
        {session.mode === 'ladder' ? 'Climb the ladder' : 'Place the Bench'}
      </h1>

      <StatusLine session={session} byId={byId} accent={accent} />

      {session.mode === 'place' && (
        <PlaceDuel session={session} byId={byId} accent={accent} onPick={pickPlace} />
      )}
      {session.mode === 'ladder' && (
        <LadderDuel session={session} byId={byId} accent={accent} onPick={pickLadder} />
      )}
      {session.mode === 'hub' && (
        <Hub list={list} summary={session.summary} rankedCount={ranked.length} />
      )}

      <ChipStrip
        entries={strip}
        accent={accent}
        activeId={session.mode === 'place' || session.mode === 'ladder' ? session.itemId : null}
        opponentId={opponentId(session)}
        waiting={session.mode === 'place' ? session.queue.length : 0}
        clickable={session.mode === 'hub'}
        onChip={startLadder}
      />
    </div>
  )
}

function opponentId(session) {
  if (session.mode === 'place') {
    const mid = (session.lo + session.hi) >> 1
    return session.order[mid]
  }
  if (session.mode === 'ladder') return session.order[session.pos - 1]
  return null
}

// ---- status line (pick counts, per POC) ----

function StatusLine({ session, byId, accent }) {
  const b = (text) => (
    <span style={{ color: accent }} className="normal-case">
      {text}
    </span>
  )
  let content = null
  if (session.mode === 'place') {
    const item = byId(session.itemId)
    const remaining = Math.ceil(Math.log2(Math.max(2, session.hi - session.lo + 1)))
    content = (
      <>
        Placing {b(item.name)} / pick {session.picks + 1} / at most {remaining} more pick
        {remaining === 1 ? '' : 's'} for this item / {session.queue.length} item
        {session.queue.length === 1 ? '' : 's'} waiting
      </>
    )
  } else if (session.mode === 'ladder') {
    const item = byId(session.itemId)
    content = (
      <>
        Re-ranking {b(item.name)} / pick {session.picks + 1} / holding rank{' '}
        {String(session.pos + 1).padStart(2, '0')}, challenging rank {String(session.pos).padStart(2, '0')} / a
        loss locks the slot
      </>
    )
  } else if (session.summary?.kind === 'placement') {
    const { picks, placed, startSize } = session.summary
    content = (
      <>
        Placement complete in {b(`${picks} pick${picks === 1 ? '' : 's'}`)} for {placed} item
        {placed === 1 ? '' : 's'} (worst case {worstCase(startSize, placed)})
      </>
    )
  } else if (session.summary?.kind === 'ladder') {
    const { name, from, to, picks } = session.summary
    content = (
      <>
        {b(name)} climbed rank {String(from).padStart(2, '0')} to {b(String(to).padStart(2, '0'))} in {picks} pick
        {picks === 1 ? '' : 's'}
      </>
    )
  } else if (session.summary?.kind === 'ladder-hold') {
    const { name, rank } = session.summary
    content = (
      <>
        {b(name)} holds rank {String(rank).padStart(2, '0')}
      </>
    )
  }
  if (!content) return null
  return (
    <p className="mt-4 font-mono text-xs uppercase tracking-[0.08em] text-on-surface-variant">{content}</p>
  )
}

// ---- duel layouts ----

function PlaceDuel({ session, byId, accent, onPick }) {
  const mid = (session.lo + session.hi) >> 1
  const item = byId(session.itemId)
  const opp = byId(session.order[mid])
  return (
    <div className="mx-auto mt-8 grid max-w-[720px] gap-5 sm:grid-cols-2">
      <DuelCard entry={item} tag="Placing" accent={accent} onPick={() => onPick(true)} />
      <DuelCard
        entry={opp}
        tag={`Rank ${String(mid + 1).padStart(2, '0')}`}
        accent={accent}
        onPick={() => onPick(false)}
      />
    </div>
  )
}

function LadderDuel({ session, byId, accent, onPick }) {
  const item = byId(session.itemId)
  const opp = byId(session.order[session.pos - 1])
  return (
    <div className="mx-auto mt-8 grid max-w-[720px] gap-5 sm:grid-cols-2">
      <DuelCard entry={item} tag="Challenger" accent={accent} onPick={() => onPick(true)} />
      <DuelCard
        entry={opp}
        tag={`Rank ${String(session.pos).padStart(2, '0')}`}
        accent={accent}
        onPick={() => onPick(false)}
      />
    </div>
  )
}

// Duel card per POC tab 02: tag, image, name, "Tap if better". The whole card
// is the button.
function DuelCard({ entry, tag, accent, onPick }) {
  return (
    <button
      onClick={onPick}
      className="focus-ring group rounded-lg border border-outline-variant bg-surface-container p-4 text-center transition-all hover:-translate-y-0.5 hover:border-[color:var(--accent)]"
      style={{ '--accent': accent }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: accent }}>
        {tag}
      </p>
      <div className="mt-2.5 aspect-[4/5] overflow-hidden rounded-sm bg-surface-variant">
        <img src={entryImage(entry)} alt={entry.name} className="img-muted h-full w-full object-cover" />
      </div>
      <h3 className="mt-3.5 font-display text-headline-md font-semibold">{entry.name}</h3>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">
        Tap if better
      </p>
    </button>
  )
}

// ---- hub (between sessions) ----

function Hub({ list, summary, rankedCount }) {
  const placed = summary?.kind === 'placement'
  return (
    <div className="mt-10 rounded-lg border border-outline-variant bg-surface-container p-8 text-center">
      <h3 className="font-display text-[2rem] font-semibold leading-tight">
        {placed ? 'Order locked. Ratings painted.' : 'The bench is clear.'}
      </h3>
      <p className="mt-2 font-body text-sm text-on-surface-variant">
        {placed
          ? 'Placeholder ratings generated from your picks.'
          : 'Every entry holds a slot.'}{' '}
        {rankedCount >= 2 ? 'Tap a chip below to re-rank an item with a ladder run, or head back.' : ''}
      </p>
      <div className="mt-5 flex justify-center">
        <Link to={`/list/${list.id}`} className="focus-ring btn-primary">
          View the list
        </Link>
      </div>
    </div>
  )
}

// ---- chip strip (per POC: rank + name, cut marked after the eighth) ----

function ChipStrip({ entries, accent, activeId, opponentId, waiting, clickable, onChip }) {
  return (
    <section className="mt-10 border-t border-outline-variant pt-5">
      <p className="eyebrow">Current ranking</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {entries.length === 0 && (
          <span className="font-body text-sm text-on-surface-variant">No one ranked yet.</span>
        )}
        {entries.map((e, i) => {
          const cls = `flex items-center gap-1.5 rounded-sm border bg-surface-container-low px-2.5 py-1.5 font-mono text-[11px] ${
            e.id === activeId || e.id === opponentId
              ? 'border-on-surface'
              : i === 7
                ? 'border-[color:var(--accent)]'
                : 'border-outline-variant'
          } ${clickable && i > 0 ? 'hover:border-on-surface' : ''}`
          const body = (
            <>
              <span style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span>
              <span className="text-on-surface-variant">{e.name}</span>
            </>
          )
          return (
            <span key={e.id} className="contents" style={{ '--accent': accent }}>
              {clickable && i > 0 ? (
                <button
                  onClick={() => onChip(e.id)}
                  title="Ladder re-rank"
                  className={`focus-ring ${cls}`}
                  style={{ '--accent': accent }}
                >
                  {body}
                </button>
              ) : (
                <span className={cls} style={{ '--accent': accent }}>
                  {body}
                </span>
              )}
              {i === 7 && (
                <span
                  className="self-center font-mono text-[11px] uppercase tracking-[0.1em]"
                  style={{ color: accent }}
                >
                  / beyond
                </span>
              )}
            </span>
          )
        })}
        {waiting > 0 && (
          <span className="rounded-sm border border-dashed border-outline-variant px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
            +{waiting} waiting
          </span>
        )}
      </div>
    </section>
  )
}
