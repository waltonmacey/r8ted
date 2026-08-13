// Pick your contenders. Phase 8, item A. Sits between the catalog picker and
// the duel session, and amends locked decision 4, which sent the setup form
// straight into a duel.
//
// WHY. The list page is built around ranks 1 to 8. Selecting the contenders is
// selecting the Power of Eight, so creation starts producing the thing the
// podium displays instead of a long tail that has to be sorted before the
// interesting part exists. The bounded range is 8 to 15 items, which measures
// at 17 to 46 picks, a 2.7x spread the user now controls.
//
// WHAT HAPPENS TO THE REST. Nothing new. Every catalog item is still created as
// an entry; the unpicked ones stay on the Bench unscored, exactly where they
// went before this step existed. A later session places them.
//
// SELECTION ORDER MUST NOT BECOME QUEUE ORDER, and this is load bearing rather
// than fastidious. A completed session reproduces the true order exactly
// whatever the queue order was, so tap order cannot bias a finished list. It
// biases the EARLY EXIT, where settleOpen breaks midpoint ties by queue
// sequence. Measured over 40,000 random orders per size, mean signed rank error
// at the gate by queue position, positive meaning flattered:
//
//   queue size   first position   last position   spread
//            8           -0.241          +0.145    0.386 ranks
//           12           -0.393          +0.159    0.553 ranks
//           15           -0.531          +0.164    0.716 ranks
//
// Monotonic in queue position, and it favours the items queued LAST, which is
// the opposite of the intuition that first tapped would win. Under a hundredth
// of a rank per position, but systematic, and it would map straight onto tap
// order if the queue were built in selection order. So the queue is shuffled.
// Catalog order was the other allowed option and is worse, because a catalog is
// itself an authored order and the bias would land on that instead.
//
// Nothing here numbers the tiles as they are tapped, for the same reason: a
// visible ordinal invites the user to believe the order means something.
//
// IMAGERY. 61 of 865 catalog items carry an image, so this grid renders mostly
// placeholder initials today. Names plus meta carry it, but this is the surface
// that will change most when the image pass lands.

import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getStorage } from '../lib/storage'
import { benchEntries, entryImage, onImageError } from '../lib/entries'
import { MIN_CONTENDERS, MAX_CONTENDERS, sessionEstimate } from '../lib/placement'
import { useEditMode } from '../lib/EditMode'
import { NotFound } from './Domain'

// Fisher Yates. The queue handed to the session is shuffled, never the display
// order: the grid stays in catalog order so the user can find things in it.
function shuffled(ids) {
  const a = ids.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function ContenderPicker() {
  const { listId } = useParams()
  const navigate = useNavigate()
  const { canEdit } = useEditMode()
  const [list, setList] = useState(undefined)
  const [picked, setPicked] = useState(() => new Set())

  useEffect(() => {
    getStorage().getList(listId).then(setList)
  }, [listId])

  const bench = useMemo(() => (list ? benchEntries(list.entries) : []), [list])

  // A catalog smaller than the floor has nothing to choose: every item is a
  // contender. Skip the step rather than showing a grid where the only legal
  // move is to select all of it. harry-potter-books, at 7, is the only catalog
  // in the library this fires for.
  useEffect(() => {
    if (!list || !canEdit) return
    if (bench.length > 0 && bench.length < MIN_CONTENDERS) {
      navigate(`/session/${list.id}`, {
        replace: true,
        state: { queueIds: shuffled(bench.map((e) => e.id)) },
      })
    }
  }, [list, bench, canEdit, navigate])

  if (list === undefined) return <p className="py-20 font-mono text-sm text-on-surface-variant">Loading</p>
  if (list === null) return <NotFound label="list" />
  if (!canEdit)
    return (
      <div className="py-20">
        <h1 className="font-display text-headline-md">Edit mode required.</h1>
        <p className="mt-2 font-body text-on-surface-variant">Unlock edit mode from the nav to run a session.</p>
      </div>
    )
  if (bench.length === 0)
    return (
      <div className="py-20">
        <h1 className="font-display text-headline-md">The bench is clear.</h1>
        <p className="mt-2 font-body text-on-surface-variant">
          Every entry already holds a slot.{' '}
          <Link to={`/list/${list.id}`} className="focus-ring underline">
            Back to the list
          </Link>
          .
        </p>
      </div>
    )

  const count = picked.size
  const atCap = count >= MAX_CONTENDERS
  const ready = count >= MIN_CONTENDERS
  const shortBy = MIN_CONTENDERS - count

  // Taps at the ceiling are ignored rather than rolling the oldest selection
  // off, which would make the grid feel like it was fighting back. Deselecting
  // always works.
  function toggle(id) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_CONTENDERS) next.add(id)
      return next
    })
  }

  function confirm() {
    if (!ready) return
    navigate(`/session/${list.id}`, {
      state: { queueIds: shuffled(bench.filter((e) => picked.has(e.id)).map((e) => e.id)) },
    })
  }

  return (
    <div className="py-10 pb-40">
      <p className="eyebrow">
        <Link to={`/list/${list.id}`} className="focus-ring hover:text-on-surface">
          {list.title}
        </Link>{' '}
        / Pick your contenders
      </p>
      <h1 className="mt-3 font-display text-headline-lg-mobile sm:text-headline-lg">Pick your contenders</h1>
      <p className="mt-3 max-w-2xl font-body text-sm text-on-surface-variant sm:text-base">
        Tap the ones worth ranking. {MIN_CONTENDERS} to {MAX_CONTENDERS}, in no particular order. Everything
        you leave stays on the Bench and can be placed in a later session.
      </p>

      <div className="mt-8 grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-7 lg:gap-3">
        {bench.map((entry) => (
          <Tile
            key={entry.id}
            entry={entry}
            picked={picked.has(entry.id)}
            dimmed={atCap && !picked.has(entry.id)}
            onToggle={() => toggle(entry.id)}
          />
        ))}
      </div>

      <ConfirmBar
        count={count}
        atCap={atCap}
        ready={ready}
        shortBy={shortBy}
        total={bench.length}
        onConfirm={confirm}
      />
    </div>
  )
}

// One catalog item. 4:5 portrait per the app's image treatment, name under it,
// meta under that. Muted at rest and full colour when picked, which is the
// design spec's selected state applied to a grid rather than to a duel.
//
// Every tile is exactly the same height on purpose. Names run from "Friends" to
// "It's Always Sunny in Philadelphia", and letting the text block size itself
// gave rows of uneven portraits, which reads as a broken grid rather than as a
// catalog. The name is clamped to two lines over a reserved two line box; the
// full name is in the title attribute and the tooltip.
function Tile({ entry, picked, dimmed, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={picked}
      title={entry.name}
      className={`focus-ring group relative flex flex-col overflow-hidden rounded-lg border text-left transition-colors ${
        picked
          ? 'border-secondary-container bg-surface-container'
          : dimmed
            ? 'border-outline-variant/50 bg-surface-container-low opacity-40'
            : 'border-outline-variant bg-surface-container-low hover:border-outline'
      }`}
    >
      <div className="aspect-[4/5] w-full shrink-0 overflow-hidden bg-surface-container-highest">
        <img
          src={entryImage(entry)}
          onError={onImageError(entry)}
          alt=""
          loading="lazy"
          className={`h-full w-full object-cover transition-[filter] duration-500 ${
            picked ? '' : 'saturate-[0.45] brightness-[0.8]'
          }`}
        />
      </div>
      {picked && (
        // A mark, not a number. See the file header: an ordinal would advertise
        // a selection order the queue deliberately does not use.
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-sm bg-secondary-container text-primary-container">
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
            <path d="M1.5 6.2 4.4 9 10.5 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
          </svg>
        </span>
      )}
      <div className="shrink-0 px-2 pb-1.5 pt-1.5">
        <p
          className={`line-clamp-2 h-[2.1rem] font-display text-[0.8rem] font-semibold leading-[1.05rem] ${
            picked ? 'text-on-surface' : 'text-on-surface-variant'
          }`}
        >
          {entry.name}
        </p>
        <p className="mt-0.5 h-[0.75rem] truncate font-mono text-[8px] uppercase leading-[0.75rem] tracking-[0.1em] text-outline">
          {entry.keyStat || ''}
        </p>
      </div>
    </button>
  )
}

// Sticky, because a 30 item grid is several screens on a phone and the confirm
// has to stay reachable from anywhere in it.
function ConfirmBar({ count, atCap, ready, shortBy, total, onConfirm }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 lg:px-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-on-surface-variant">
          <span className="text-on-surface">{String(count).padStart(2, '0')} selected</span>
          {!ready && <span> / {shortBy} more to unlock</span>}
          {ready && !atCap && <span> / room for {MAX_CONTENDERS - count} more</span>}
          {atCap && <span className="text-secondary-container"> / that is the ceiling</span>}
          <span className="block text-outline sm:ml-2 sm:inline">{total} on the bench</span>
        </p>
        <button
          onClick={onConfirm}
          disabled={!ready}
          className="focus-ring btn-primary whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-30"
        >
          {ready ? `Rank ${count} items, about ${sessionEstimate(count)} picks` : `Pick ${MIN_CONTENDERS} to start`}
        </button>
      </div>
    </div>
  )
}
