// Pick duel. Phase 6 reworks placement from the Phase 5 depth-first binary
// insertion (each item driven to full precision before the next one dueled) to
// breadth-first passes over landing zones, so a full defensible order exists
// early and the session can end before completion. The zone bookkeeping lives
// in src/lib/placement.js; this file is state, ratings, and layout.
//
//   Placement: every unplaced item carries a landing zone, the range of ranks
//     it could still occupy. Pass 1 gives every queued item one duel before any
//     item gets a second, and an item places the moment its zone closes,
//     landing via the chain repaint in paintPlacements. The first item into an
//     empty list takes the top without a pick.
//   Early exit: once every still open item has dueled twice, End session places
//     the rest at their zone midpoints. Nothing placed that way is marked
//     scoresEdited, so later duels, drags, and edits refine it normally.
//   Ladder: an already ranked item challenges upward from its slot. A win swaps
//     and continues, a loss stops. Entry point: tap a chip in the strip.
//   Reduel: ?reduel=1 throws every entry into a fresh placement pass. Scores
//     are not cleared up front; each item is repainted as it places, so
//     abandoning the session leaves a scrambled but fully ranked list rather
//     than an empty one.
//
// A placed or moved item lands by regenerating its placeholder rating to fit
// between its new neighbours, preserving the one invariant: display order is
// composite order. When a placement pass finishes, every non hand-edited
// rating regenerates top to bottom (anchor 9.5); hand edits survive.

import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getDomain } from '../lib/taxonomy'
import { getStorage } from '../lib/storage'
import {
  rankedEntries,
  benchEntries,
  entryImage,
  regenerateFromOrder,
  regeneratePlaceholders,
} from '../lib/entries'
import {
  initPlacement,
  advance,
  applyPick,
  pendingFree,
  placeAt,
  canEndEarly,
  endEarly,
  provisionalOrder,
  zoneFor,
  zoneSize,
  currentPass,
  worstRemaining,
  worstCase,
  EARLY_EXIT_MIN_DUELS,
} from '../lib/placement'
import { useEditMode } from '../lib/EditMode'
import { NotFound } from './Domain'

// Paint a run of placements. Each index is a position in the order as it stands
// after the previous insertions, so the running order is rebuilt alongside, then
// the whole chain is repainted from that order.
//
// Phase 7 changed this from squeezing each new entry between its two neighbours
// to repainting the chain. Ratings are a rendering of rank order, and on the
// half point grid there is not always a value between two neighbours to squeeze
// into. See regenerateFromOrder for the measurements.
function paintPlacements(entries, orderIds, placements) {
  let order = orderIds.slice()
  for (const p of placements) {
    order = [...order.slice(0, p.index), p.itemId, ...order.slice(p.index)]
  }
  return regenerateFromOrder(entries, order)
}

export default function DuelSession() {
  const { listId } = useParams()
  const [params, setParams] = useSearchParams()
  const { canEdit } = useEditMode()
  const [list, setList] = useState(undefined)
  const [session, setSession] = useState(null)

  useEffect(() => {
    getStorage().getList(listId).then(setList)
  }, [listId])

  // Auto-start: a reduel takes every entry, otherwise the Bench is the queue.
  useEffect(() => {
    if (!list || session || !canEdit) return
    const reduel = params.get('reduel') === '1'
    if (reduel) {
      setParams({}, { replace: true })
      startPlacement(list, list.entries.map((e) => e.id), [], true)
      return
    }
    const bench = benchEntries(list.entries)
    if (bench.length > 0) startPlacement(list, bench.map((e) => e.id), rankedEntries(list.entries).map((e) => e.id), false)
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

  async function startPlacement(l, queueIds, orderIds, reduel) {
    let state = initPlacement(orderIds, queueIds)
    let entries = l.entries
    // Drain any zone that is already closed: on an empty list the first item
    // takes the top slot for free.
    let free = pendingFree(state)
    while (free) {
      entries = paintPlacements(entries, state.order, [{ itemId: free.id, index: free.lo }])
      state = placeAt(state, free.id, free.lo)
      free = pendingFree(state)
    }
    state = advance(state)
    let next = l
    if (entries !== l.entries) {
      next = { ...l, entries }
      await getStorage().saveList(next)
      setList(next)
    }
    if (!state.current) {
      await finishPass(next, state, { kind: 'placement', picks: 0, placed: state.placed, startSize: state.startSize })
      return
    }
    setSession({ mode: 'place', state, reduel })
  }

  // Full top-to-bottom regeneration, then the hub summary.
  async function finishPass(l, state, summary) {
    const entries = regeneratePlaceholders(l.entries)
    const next = { ...l, entries }
    await getStorage().saveList(next)
    setList(next)
    setSession({ mode: 'hub', summary: { ...summary, estimated: state.estimated } })
  }

  async function pickPlace(winnerIsNew) {
    const before = session.state
    const { state, placement } = applyPick(before, winnerIsNew)
    let l = list
    if (placement) {
      const entries = paintPlacements(list.entries, before.order, [placement])
      l = { ...list, entries }
      await getStorage().saveList(l)
      setList(l)
    }
    if (!state.current) {
      await finishPass(l, state, {
        kind: 'placement',
        picks: state.picks,
        placed: state.placed,
        startSize: state.startSize,
      })
      return
    }
    setSession({ ...session, state })
  }

  async function endSessionEarly() {
    const before = session.state
    const { state, placements } = endEarly(before)
    const entries = paintPlacements(list.entries, before.order, placements)
    const l = { ...list, entries }
    await getStorage().saveList(l)
    setList(l)
    await finishPass(l, state, {
      kind: 'early',
      picks: state.picks,
      placed: state.placed,
      startSize: state.startSize,
      guessed: placements.length,
    })
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
    const item = byId(s.itemId)
    const entries = regenerateFromOrder(list.entries, s.order)
    const next = { ...list, entries }
    await getStorage().saveList(next)
    setList(next)
    setSession({
      mode: 'hub',
      summary: { kind: 'ladder', name: item.name, from: s.startPos + 1, to: s.pos + 1, picks: s.picks },
    })
  }

  // ---- render ----

  const strip = stripFor(session, list, byId)
  const showEnd = session.mode === 'place' && canEndEarly(session.state)

  return (
    <div className="py-10">
      <p className="eyebrow">
        <Link to={`/list/${list.id}`} className="focus-ring hover:text-on-surface">
          {list.title}
        </Link>{' '}
        / Duel session
      </p>
      <h1 className="mt-3 font-display text-headline-lg-mobile sm:text-headline-lg">
        {session.mode === 'ladder'
          ? 'Climb the ladder'
          : session.reduel
            ? 'Rank it all again'
            : 'Place the Bench'}
      </h1>

      <StatusLine session={session} byId={byId} accent={accent} />

      {session.mode === 'place' && (
        <PlaceDuel session={session} byId={byId} accent={accent} onPick={pickPlace} />
      )}
      {showEnd && (
        <EndSession count={session.state.open.length} accent={accent} onEnd={endSessionEarly} />
      )}
      {session.mode === 'ladder' && (
        <LadderDuel session={session} byId={byId} accent={accent} onPick={pickLadder} />
      )}
      {session.mode === 'hub' && <Hub list={list} summary={session.summary} rankedCount={strip.length} />}

      <ChipStrip
        items={strip}
        accent={accent}
        activeId={session.mode === 'place' ? session.state.current?.id : session.mode === 'ladder' ? session.itemId : null}
        opponentId={opponentId(session)}
        clickable={session.mode === 'hub'}
        onChip={startLadder}
        placing={session.mode === 'place'}
      />
    </div>
  )
}

// The strip always shows a complete ranking. In placement, unplaced items sit
// at their provisional zone midpoints and render dashed, so the cost of ending
// the session early is visible before the button is tapped. After an early
// exit, the items that were settled by estimate stay dashed in the hub.
function stripFor(session, list, byId) {
  if (session.mode === 'place') {
    return provisionalOrder(session.state)
      .map(({ id, certain }) => ({ entry: byId(id), certain }))
      .filter((x) => x.entry)
  }
  if (session.mode === 'ladder') return session.order.map((id) => ({ entry: byId(id), certain: true }))
  const guessed = new Set(session.summary?.estimated || [])
  return rankedEntries(list.entries).map((e) => ({ entry: e, certain: !guessed.has(e.id) }))
}

function opponentId(session) {
  if (session.mode === 'place') return session.state.order[session.state.current?.pivot]
  if (session.mode === 'ladder') return session.order[session.pos - 1]
  return null
}

// ---- status line ----

function StatusLine({ session, byId, accent }) {
  const b = (text) => (
    <span style={{ color: accent }} className="normal-case">
      {text}
    </span>
  )
  const rank = (n) => String(n).padStart(2, '0')
  let content = null

  if (session.mode === 'place') {
    const s = session.state
    const item = byId(s.current.id)
    const zone = zoneFor(s, s.current.id)
    const size = zoneSize(zone)
    const remaining = worstRemaining(size)
    const others = s.open.length - 1
    content = (
      <>
        Pass {rank(currentPass(s))} / pick {s.picks + 1} / placing {b(item.name)} / zone ranks{' '}
        {rank(zone.lo + 1)} to {rank(zone.hi + 1)} / at most {remaining} more pick
        {remaining === 1 ? '' : 's'} for this item
        {others > 0 ? ` / ${others} other${others === 1 ? '' : 's'} still open` : ''}
      </>
    )
  } else if (session.mode === 'ladder') {
    const item = byId(session.itemId)
    content = (
      <>
        Re-ranking {b(item.name)} / pick {session.picks + 1} / holding rank {rank(session.pos + 1)},
        challenging rank {rank(session.pos)} / a loss locks the slot
      </>
    )
  } else if (session.summary?.kind === 'placement') {
    const { picks, placed, startSize } = session.summary
    content = (
      <>
        Placement complete in {b(`${picks} pick${picks === 1 ? '' : 's'}`)} for {placed} item
        {placed === 1 ? '' : 's'} (depth-first worst case {worstCase(startSize, placed)})
      </>
    )
  } else if (session.summary?.kind === 'early') {
    const { picks, guessed } = session.summary
    content = (
      <>
        Session ended after {b(`${picks} pick${picks === 1 ? '' : 's'}`)} / {guessed} item
        {guessed === 1 ? '' : 's'} placed by estimate, dashed below / duel, drag, or edit to refine
      </>
    )
  } else if (session.summary?.kind === 'ladder') {
    const { name, from, to, picks } = session.summary
    content = (
      <>
        {b(name)} climbed rank {rank(from)} to {b(rank(to))} in {picks} pick{picks === 1 ? '' : 's'}
      </>
    )
  } else if (session.summary?.kind === 'ladder-hold') {
    const { name, rank: r } = session.summary
    content = (
      <>
        {b(name)} holds rank {rank(r)}
      </>
    )
  }
  if (!content) return null
  return <p className="mt-4 font-mono text-xs uppercase tracking-[0.08em] text-on-surface-variant">{content}</p>
}

// ---- duel layouts ----

function PlaceDuel({ session, byId, accent, onPick }) {
  const s = session.state
  const item = byId(s.current.id)
  const opp = byId(s.order[s.current.pivot])
  if (!item || !opp) return null
  return (
    <div className="mx-auto mt-8 grid max-w-[720px] gap-5 sm:grid-cols-2">
      <DuelCard entry={item} tag="Placing" accent={accent} onPick={() => onPick(true)} />
      <DuelCard
        entry={opp}
        tag={`Rank ${String(s.current.pivot + 1).padStart(2, '0')}`}
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

// ---- early exit ----

// Appears once every still open item has dueled EARLY_EXIT_MIN_DUELS times.
function EndSession({ count, accent, onEnd }) {
  return (
    <div className="mt-7 text-center">
      <button onClick={onEnd} className="focus-ring btn-ghost hover:border-[color:var(--accent)]" style={{ '--accent': accent }}>
        End session
      </button>
      <p className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-on-surface-variant">
        {count} item{count === 1 ? '' : 's'} would be placed by estimate, dashed below
      </p>
    </div>
  )
}

// ---- hub (between sessions) ----

function Hub({ list, summary, rankedCount }) {
  const kind = summary?.kind
  const heading =
    kind === 'placement'
      ? 'Order locked. Ratings painted.'
      : kind === 'early'
        ? 'Order set. Some of it is an estimate.'
        : 'The bench is clear.'
  const body =
    kind === 'placement'
      ? 'Placeholder ratings generated from your picks.'
      : kind === 'early'
        ? 'Dashed chips are the items you stopped short on. None of them is marked hand set, so a later duel, drag, or edit overrides them cleanly.'
        : 'Every entry holds a slot.'
  return (
    <div className="mt-10 rounded-lg border border-outline-variant bg-surface-container p-8 text-center">
      <h3 className="font-display text-[2rem] font-semibold leading-tight">{heading}</h3>
      <p className="mt-2 font-body text-sm text-on-surface-variant">
        {body} {rankedCount >= 2 ? 'Tap a chip below to re-rank an item with a ladder run, or head back.' : ''}
      </p>
      <div className="mt-5 flex justify-center">
        <Link to={`/list/${list.id}`} className="focus-ring btn-primary">
          View the list
        </Link>
      </div>
    </div>
  )
}

// ---- chip strip (rank + name, cut marked after the eighth) ----

function ChipStrip({ items, accent, activeId, opponentId, clickable, onChip, placing }) {
  const uncertain = items.filter((i) => !i.certain).length
  return (
    <section className="mt-10 border-t border-outline-variant pt-5">
      <p className="eyebrow">
        Current ranking
        {uncertain > 0 ? ` / ${uncertain} ${placing ? 'still uncertain' : 'placed by estimate'}` : ''}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {items.length === 0 && (
          <span className="font-body text-sm text-on-surface-variant">No one ranked yet.</span>
        )}
        {items.map(({ entry: e, certain }, i) => {
          const highlighted = e.id === activeId || e.id === opponentId
          const cls = `flex items-center gap-1.5 rounded-sm bg-surface-container-low px-2.5 py-1.5 font-mono text-[11px] border ${
            certain ? '' : 'border-dashed'
          } ${
            highlighted
              ? 'border-on-surface'
              : i === 7
                ? 'border-[color:var(--accent)]'
                : 'border-outline-variant'
          } ${clickable && i > 0 ? 'hover:border-on-surface' : ''}`
          const body = (
            <>
              <span style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span>
              <span className={certain ? 'text-on-surface-variant' : 'text-outline'}>{e.name}</span>
            </>
          )
          return (
            <span key={e.id} className="contents">
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
                <span className={cls} style={{ '--accent': accent }} title={certain ? undefined : 'Position still uncertain'}>
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
      </div>
      {uncertain > 0 && (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-outline">
          {placing
            ? `Dashed = landing zone still open, shown at its midpoint. End session appears once every open item has dueled ${EARLY_EXIT_MIN_DUELS} times.`
            : 'Dashed = position is an estimate. A later duel, drag, or edit overrides it cleanly.'}
        </p>
      )}
    </section>
  )
}
