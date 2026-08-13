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
//   Early exit: once every still open item has dueled three times AND at least
//     five picks are estimated to remain, End session places the rest at their
//     zone midpoints. Nothing placed that way is marked scoresEdited, so later
//     duels, drags, and edits refine it normally.
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
//
// ---- PHASE 8 ----
//
// THE QUEUE CAN NOW BE A SUBSET OF THE BENCH. ContenderPicker hands this route
// a shuffled list of entry ids through router location state, and only those
// items enter the placement pass. Everything else stays on the Bench, exactly
// where it went before. Location state does not survive a reload, so a reload
// mid session falls back to the whole Bench; when that Bench is over the
// ceiling the session refuses to auto start and offers the picker instead,
// rather than silently opening a 46 pick session the user did not ask for.
//
// FOUR MOBILE DUEL LAYOUTS SHIP BEHIND ?duel=N. This is deliberate temporary
// scaffolding for an owner taste call, not a permanent feature: the mobile duel
// at 390 is cramped and the four candidates need to be compared on a real phone
// with real type before one wins. 0 is the shipped layout and the default.
//
//   0  side by side, full width portrait   the layout being replaced
//   1  side by side, shrunk portrait       both options visible, no scroll
//   2  full bleed vertical split           two halves, image and name only
//   3  full bleed horizontal split         same, rotated
//   4  compact rows                        QuadCard geometry, whole row taps
//
// Once a layout wins, delete the other four branches, DUEL_LAYOUTS, the
// LayoutSwitch component, and the ?duel param. Nothing else depends on them.

import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getDomain } from '../lib/taxonomy'
import { getStorage } from '../lib/storage'
import {
  rankedEntries,
  benchEntries,
  entryImage,
  onImageError,
  initials,
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
  pastDuelGate,
  estimatedPicksLeft,
  endEarly,
  provisionalOrder,
  zoneFor,
  zoneSize,
  currentPass,
  worstRemaining,
  worstCase,
  sessionEstimate,
  EARLY_EXIT_MIN_DUELS,
  EARLY_EXIT_MIN_SAVING,
  MAX_CONTENDERS,
} from '../lib/placement'
import { useEditMode } from '../lib/EditMode'
import { NotFound } from './Domain'

// Temporary. See the Phase 8 note in the file header.
const DUEL_LAYOUTS = [
  { id: 0, label: 'Side by side' },
  { id: 1, label: 'Shrunk' },
  { id: 2, label: 'Split V' },
  { id: 3, label: 'Split H' },
  { id: 4, label: 'Rows' },
]
const FULL_BLEED = new Set([2, 3])

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
  const location = useLocation()
  const { canEdit } = useEditMode()
  const [list, setList] = useState(undefined)
  const [session, setSession] = useState(null)
  const [stripOpen, setStripOpen] = useState(false)

  const layout = clampLayout(params.get('duel'))

  useEffect(() => {
    getStorage().getList(listId).then(setList)
  }, [listId])

  // Auto-start. A reduel takes every entry. Otherwise the queue is whatever
  // ContenderPicker handed over, falling back to the whole Bench.
  useEffect(() => {
    if (!list || session || !canEdit) return
    const reduel = params.get('reduel') === '1'
    if (reduel) {
      setParams(layout ? { duel: String(layout) } : {}, { replace: true })
      startPlacement(list, list.entries.map((e) => e.id), [], true)
      return
    }
    const bench = benchEntries(list.entries)
    if (bench.length === 0) {
      setSession({ mode: 'hub', summary: null })
      return
    }
    const benchIds = new Set(bench.map((e) => e.id))
    const handed = location.state?.queueIds
    const queue = handed ? handed.filter((id) => benchIds.has(id)) : null
    const rankedIds = rankedEntries(list.entries).map((e) => e.id)
    if (queue && queue.length > 0) {
      startPlacement(list, queue, rankedIds, false)
      return
    }
    // No selection to work from. A Bench inside the ceiling starts as it always
    // has; a Bench over it asks first, because 16 or more items is a session
    // nobody chose.
    if (bench.length > MAX_CONTENDERS) {
      setSession({ mode: 'oversized', count: bench.length })
      return
    }
    startPlacement(list, bench.map((e) => e.id), rankedIds, false)
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
  const duelling = session.mode === 'place' || session.mode === 'ladder'
  // Both sides of the duel, normalised, with the mode's pick handler attached
  // so every layout below takes the same two objects and knows nothing about
  // placement versus ladder.
  const raw = duelPair(session, byId)
  const onPick = session.mode === 'place' ? pickPlace : pickLadder
  const pair = raw
    ? { a: { ...raw.a, onPick: () => onPick(true) }, b: { ...raw.b, onPick: () => onPick(false) } }
    : null
  const fullBleed = duelling && FULL_BLEED.has(layout) && pair

  const stripEl = (
    <ChipStrip
      items={strip}
      accent={accent}
      activeId={session.mode === 'place' ? session.state.current?.id : session.mode === 'ladder' ? session.itemId : null}
      opponentId={opponentId(session)}
      clickable={session.mode === 'hub'}
      onChip={startLadder}
      placing={session.mode === 'place'}
      endNote={
        session.mode === 'place'
          ? pastDuelGate(session.state)
            ? `End session is withheld while fewer than ${EARLY_EXIT_MIN_SAVING} picks are left to save; finishing outright is cheaper than deciding.`
            : `End session appears once every open item has dueled ${EARLY_EXIT_MIN_DUELS} times and at least ${EARLY_EXIT_MIN_SAVING} picks are left to save.`
          : null
      }
      collapsible={duelling && layout !== 0}
      open={stripOpen}
      onToggle={() => setStripOpen((v) => !v)}
    />
  )

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
          : session.mode === 'oversized'
            ? 'That is a long session'
            : session.reduel
              ? 'Rank it all again'
              : 'Place the Bench'}
      </h1>

      {duelling && <LayoutSwitch current={layout} accent={accent} />}

      {!fullBleed && <StatusLine session={session} byId={byId} accent={accent} />}

      {session.mode === 'oversized' && <Oversized list={list} count={session.count} />}

      {duelling && !fullBleed && pair && (
        <InlineDuel layout={layout} accent={accent} a={pair.a} b={pair.b} />
      )}
      {showEnd && !fullBleed && (
        <EndSession
          count={session.state.open.length}
          picksLeft={estimatedPicksLeft(session.state)}
          accent={accent}
          onEnd={endSessionEarly}
        />
      )}
      {session.mode === 'hub' && <Hub list={list} summary={session.summary} rankedCount={strip.length} />}

      {!fullBleed && stripEl}

      {fullBleed && (
        <FullBleedDuel
          layout={layout}
          accent={accent}
          a={pair.a}
          b={pair.b}
          status={<StatusLine session={session} byId={byId} accent={accent} compact />}
          switcher={<LayoutSwitch current={layout} accent={accent} compact />}
          strip={stripEl}
          end={
            showEnd ? (
              <EndSession
                count={session.state.open.length}
                picksLeft={estimatedPicksLeft(session.state)}
                accent={accent}
                onEnd={endSessionEarly}
                compact
              />
            ) : null
          }
        />
      )}
    </div>
  )
}

function clampLayout(raw) {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 && n < DUEL_LAYOUTS.length ? n : 0
}

// The two sides of whatever duel is running, normalised so every layout takes
// the same shape. `a` is always the item being decided on, `b` the incumbent.
function duelPair(session, byId) {
  if (session.mode === 'place') {
    const s = session.state
    const item = byId(s.current.id)
    const opp = byId(s.order[s.current.pivot])
    if (!item || !opp) return null
    return {
      a: { entry: item, tag: 'Placing' },
      b: { entry: opp, tag: `Rank ${String(s.current.pivot + 1).padStart(2, '0')}` },
    }
  }
  if (session.mode === 'ladder') {
    const item = byId(session.itemId)
    const opp = byId(session.order[session.pos - 1])
    if (!item || !opp) return null
    return {
      a: { entry: item, tag: 'Challenger' },
      b: { entry: opp, tag: `Rank ${String(session.pos).padStart(2, '0')}` },
    }
  }
  return null
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

// ---- temporary layout switch ----

// Scaffolding for the Phase 8 taste call. Renders only while a duel is on
// screen so it does not clutter the hub. Delete with the losing layouts.
function LayoutSwitch({ current, accent, compact = false }) {
  const [params] = useSearchParams()
  const here = new URLSearchParams(params)
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? '' : 'mt-4'}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-outline">Layout</span>
      {DUEL_LAYOUTS.map((l) => {
        const next = new URLSearchParams(here)
        next.set('duel', String(l.id))
        const on = l.id === current
        return (
          <Link
            key={l.id}
            to={{ search: `?${next.toString()}` }}
            replace
            className={`focus-ring rounded-sm border py-1 font-mono text-[10px] uppercase tracking-[0.1em] ${
              compact ? 'px-1.5' : 'px-2'
            } ${
              on ? 'border-[color:var(--accent)] text-on-surface' : 'border-outline-variant text-outline hover:text-on-surface-variant'
            }`}
            style={{ '--accent': accent }}
          >
            {compact ? l.id : `${l.id} ${l.label}`}
          </Link>
        )
      })}
    </div>
  )
}

// ---- oversized bench guard ----

// Reached when the session is opened without a contender selection on a Bench
// over the ceiling: a direct URL, a reload mid session, or a return visit to a
// list whose Bench is still long. Refusing to auto start is the point.
function Oversized({ list, count }) {
  return (
    <div className="mt-8 max-w-2xl rounded-lg border border-outline-variant bg-surface-container p-6">
      <p className="font-body text-sm text-on-surface-variant">
        This bench holds {count} items. Ranking all of them from scratch runs to roughly{' '}
        <span className="text-on-surface">{sessionEstimate(count)} picks</span>, which is more than one sitting.
        Pick the ones worth ranking now and the rest stay on the bench.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to={`/pick/${list.id}`} className="focus-ring btn-primary">
          Pick your contenders
        </Link>
        <Link to={`/list/${list.id}`} className="focus-ring btn-ghost">
          Back to the list
        </Link>
      </div>
    </div>
  )
}

// ---- status line ----

function StatusLine({ session, byId, accent, compact = false }) {
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
    content = compact ? (
      <>
        Pass {rank(currentPass(s))} / pick {s.picks + 1} / {b(item.name)} vs rank{' '}
        {rank(s.current.pivot + 1)}
      </>
    ) : (
      <>
        Pass {rank(currentPass(s))} / pick {s.picks + 1} / placing {b(item.name)} / zone ranks{' '}
        {rank(zone.lo + 1)} to {rank(zone.hi + 1)} / at most {remaining} more pick
        {remaining === 1 ? '' : 's'} for this item
        {others > 0 ? ` / ${others} other${others === 1 ? '' : 's'} still open` : ''}
      </>
    )
  } else if (session.mode === 'ladder') {
    const item = byId(session.itemId)
    content = compact ? (
      <>
        {b(item.name)} / pick {session.picks + 1} / holding {rank(session.pos + 1)}, challenging{' '}
        {rank(session.pos)}
      </>
    ) : (
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
  if (compact)
    return (
      <p className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-on-surface-variant">{content}</p>
    )
  return <p className="mt-4 font-mono text-xs uppercase tracking-[0.08em] text-on-surface-variant">{content}</p>
}

// ---- duel layouts ----

// Layouts 0, 1 and 4 sit in the page flow like every other surface. 2 and 3
// take the viewport and are handled by FullBleedDuel below.
function InlineDuel({ layout, accent, a, b }) {
  if (layout === 4) {
    return (
      <div className="mx-auto mt-7 max-w-[720px] space-y-2.5">
        <DuelRow entry={a.entry} tag={a.tag} accent={accent} onPick={a.onPick} />
        <DuelRow entry={b.entry} tag={b.tag} accent={accent} onPick={b.onPick} />
      </div>
    )
  }
  // 0 stacks on mobile because sm:grid-cols-2 only kicks in at 640. 1 is two
  // columns at every width, which is the whole idea.
  const compact = layout === 1
  return (
    <div
      className={`mx-auto max-w-[720px] ${
        compact ? 'mt-7 grid grid-cols-2 gap-3 sm:gap-5' : 'mt-8 grid gap-5 sm:grid-cols-2'
      }`}
    >
      <DuelCard entry={a.entry} tag={a.tag} accent={accent} onPick={a.onPick} compact={compact} />
      <DuelCard entry={b.entry} tag={b.tag} accent={accent} onPick={b.onPick} compact={compact} />
    </div>
  )
}

// Duel card per POC tab 02: tag, image, name, "Tap if better". The whole card
// is the button. `compact` is layout 1: same card, portrait shrunk to whatever
// half the column allows, so both options fit one screen at 390.
function DuelCard({ entry, tag, accent, onPick, compact = false }) {
  return (
    <button
      onClick={onPick}
      className={`focus-ring group rounded-lg border border-outline-variant bg-surface-container text-center transition-all hover:-translate-y-0.5 hover:border-[color:var(--accent)] ${
        compact ? 'p-2.5' : 'p-4'
      }`}
      style={{ '--accent': accent }}
    >
      <p
        className={`font-mono uppercase tracking-[0.15em] ${compact ? 'text-[9px]' : 'text-[10px]'}`}
        style={{ color: accent }}
      >
        {tag}
      </p>
      <div className={`aspect-[4/5] overflow-hidden rounded-sm bg-surface-variant ${compact ? 'mt-1.5' : 'mt-2.5'}`}>
        <img
          src={entryImage(entry)}
          onError={onImageError(entry)}
          alt={entry.name}
          className="img-muted h-full w-full object-cover"
        />
      </div>
      <h3
        className={`font-display font-semibold ${
          compact ? 'mt-2 text-[1.05rem] leading-[1.15]' : 'mt-3.5 text-headline-md'
        }`}
      >
        {entry.name}
      </h3>
      <p
        className={`font-mono uppercase tracking-[0.15em] text-on-surface-variant ${
          compact ? 'mt-1.5 text-[9px]' : 'mt-2 text-[10px]'
        }`}
      >
        Tap if better
      </p>
    </button>
  )
}

// Layout 4. QuadCard geometry from the list page: 76px portrait, name, meta.
// The whole row is the tap target, so the two rows stack in about the height
// one current duel card takes.
function DuelRow({ entry, tag, accent, onPick }) {
  return (
    <button
      onClick={onPick}
      className="focus-ring group flex w-full items-stretch gap-[14px] rounded-lg border border-outline-variant bg-surface-container-low p-3 text-left transition-colors hover:border-[color:var(--accent)]"
      style={{ '--accent': accent }}
    >
      <div className="aspect-[4/5] w-[76px] shrink-0 overflow-hidden rounded-sm bg-surface-container-highest">
        <img
          src={entryImage(entry)}
          onError={onImageError(entry)}
          alt=""
          className="img-muted h-full w-full object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <p className="font-mono text-[9px] uppercase tracking-[0.15em]" style={{ color: accent }}>
          {tag}
        </p>
        <h3 className="font-display text-[1.15rem] font-semibold leading-[1.15]">{entry.name}</h3>
        {entry.keyStat && (
          <p className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-on-surface-variant">
            {entry.keyStat}
          </p>
        )}
      </div>
      <span className="self-center pr-1 font-mono text-[9px] uppercase tracking-[0.12em] text-outline">Tap</span>
    </button>
  )
}

// Layouts 2 and 3. The duel takes the viewport below the fixed nav: no cards,
// no borders, no page furniture. Each half is an image with the name overlaid
// and the whole half is the tap target.
//
// The design spec's muted to full colour treatment becomes the selected state.
// FLAGGED: on a touch screen there is no hover, so the full colour state only
// shows on press. Judging this layout properly needs the image pass; a split
// screen of two placeholder initials is worse than a card, which is the honest
// caveat on alternative 2.
function FullBleedDuel({ layout, accent, a, b, status, strip, end, switcher }) {
  const vertical = layout === 2
  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-30 flex flex-col bg-background">
      {/* The overlay covers the page, including the layout switch, so the
          switch is repeated here. It leaves with the losing layouts. */}
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-4 py-2">
        <div className="min-w-0 flex-1">{status}</div>
        <div className="shrink-0">{switcher}</div>
      </div>
      <div className={`flex min-h-0 flex-1 ${vertical ? 'flex-row' : 'flex-col'}`}>
        <BleedHalf entry={a.entry} tag={a.tag} accent={accent} onPick={a.onPick} vertical={vertical} />
        <div className={vertical ? 'w-px bg-outline-variant' : 'h-px bg-outline-variant'} />
        <BleedHalf entry={b.entry} tag={b.tag} accent={accent} onPick={b.onPick} vertical={vertical} />
      </div>
      <div className="border-t border-outline-variant bg-background px-4 pb-3 pt-2">
        {end}
        {strip}
      </div>
    </div>
  )
}

function BleedHalf({ entry, tag, accent, onPick, vertical }) {
  // The placeholder SVG is 400x500. object-cover into a 195x696 half crops it
  // to a slice of two giant letters, which reads as a broken image and would
  // lose this layout the comparison on a rendering artefact rather than on
  // merit. With no usable image the half draws the initials itself, at its own
  // aspect ratio. 804 of 865 catalog items are in this state today.
  const [broken, setBroken] = useState(false)
  const hasImage = Boolean(entry.imageUrl) && !broken
  return (
    <button
      onClick={onPick}
      className="group relative min-h-0 flex-1 overflow-hidden focus-visible:outline focus-visible:-outline-offset-4 focus-visible:outline-2 focus-visible:outline-secondary-container"
    >
      {hasImage ? (
        <img
          src={entry.imageUrl}
          onError={() => setBroken(true)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover saturate-[0.45] brightness-[0.7] transition-[filter] duration-300 group-hover:saturate-100 group-hover:brightness-100 group-active:saturate-100 group-active:brightness-100"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-container-low to-surface-container-high">
          <span className="font-ui text-[18vmin] font-black leading-none text-outline/40">
            {initials(entry.name)}
          </span>
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/70 to-transparent p-4 pt-12 text-left">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>
          {tag}
        </p>
        <h3
          className={`mt-1 font-display font-semibold leading-[1.05] ${
            vertical ? 'text-[1.5rem] sm:text-[2.5rem]' : 'text-[2rem] sm:text-[3rem]'
          }`}
        >
          {entry.name}
        </h3>
      </div>
    </button>
  )
}

// ---- early exit ----

// Appears once every still open item has dueled EARLY_EXIT_MIN_DUELS times AND
// at least EARLY_EXIT_MIN_SAVING picks are estimated to remain. See canEndEarly
// and EARLY_EXIT_MIN_SAVING for why the second clause exists.
function EndSession({ count, picksLeft, accent, onEnd, compact = false }) {
  if (compact)
    return (
      <div className="mb-2 flex items-center justify-between gap-3">
        <button
          onClick={onEnd}
          className="focus-ring rounded border border-outline-variant px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] hover:border-[color:var(--accent)]"
          style={{ '--accent': accent }}
        >
          End session
        </button>
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-outline">
          skips about {picksLeft} picks / {count} placed by estimate
        </p>
      </div>
    )
  return (
    <div className="mt-7 text-center">
      <button onClick={onEnd} className="focus-ring btn-ghost hover:border-[color:var(--accent)]" style={{ '--accent': accent }}>
        End session
      </button>
      <p className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-on-surface-variant">
        skips about {picksLeft} more pick{picksLeft === 1 ? '' : 's'} / {count} item
        {count === 1 ? '' : 's'} would be placed by estimate, dashed below
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

// The strip is load bearing: it is the only place the full current ranking is
// visible, with the top 8 cut marked and the uncertain items dashed. It is also
// 321px tall at 390 width on a fourteen item list, which is a third of the
// viewport competing with the two things the user is supposed to be comparing.
//
// Phase 8 proposal, on by default in every layout except the one being
// replaced: below 640 the strip collapses to a progress bar plus an uncertain
// count, and expands to the full strip on tap. Desktop is unchanged.
function ChipStrip({
  items, accent, activeId, opponentId, clickable, onChip, placing, endNote,
  collapsible = false, open = false, onToggle,
}) {
  const uncertain = items.filter((i) => !i.certain).length
  const certain = items.length - uncertain
  const full = (
    <FullStrip
      items={items}
      accent={accent}
      activeId={activeId}
      opponentId={opponentId}
      clickable={clickable}
      onChip={onChip}
      placing={placing}
      uncertain={uncertain}
      endNote={endNote}
    />
  )
  if (!collapsible) return <section className="mt-10 border-t border-outline-variant pt-5">{full}</section>

  return (
    <>
      <section className="sm:hidden">
        <button
          onClick={onToggle}
          aria-expanded={open}
          className="focus-ring flex w-full items-center gap-3 py-2 text-left"
        >
          <span className="h-1 flex-1 overflow-hidden rounded-sm bg-surface-container-high">
            <span
              className="block h-full"
              style={{ width: `${items.length ? (certain / items.length) * 100 : 0}%`, background: accent }}
            />
          </span>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">
            {uncertain > 0 ? `${uncertain} uncertain` : 'all placed'}
          </span>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-outline">
            {open ? 'hide' : 'ranking'}
          </span>
        </button>
        {open && <div className="max-h-[40vh] overflow-y-auto border-t border-outline-variant pt-3">{full}</div>}
      </section>
      <section className="mt-10 hidden border-t border-outline-variant pt-5 sm:block">{full}</section>
    </>
  )
}

function FullStrip({ items, accent, activeId, opponentId, clickable, onChip, placing, uncertain, endNote }) {
  return (
    <>
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
            ? `Dashed = landing zone still open, shown at its midpoint. ${endNote || ''}`
            : 'Dashed = position is an estimate. A later duel, drag, or edit overrides it cleanly.'}
        </p>
      )}
    </>
  )
}
