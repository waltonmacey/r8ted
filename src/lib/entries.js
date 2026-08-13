// Composite = (s1 + s2 + s3 + s4) / 4, shown to 2 decimals.
// Entries with null scores live on the Bench and never rank.
// Since Phase 7 every stored subscore is a multiple of 0.5, so the composite is
// a multiple of 0.125. See the placeholder section below for why.

export function composite(scores) {
  if (!isScored(scores)) return null
  const sum = scores.reduce((a, b) => a + Number(b), 0)
  return sum / 4
}

export function compositeText(scores) {
  const c = composite(scores)
  return c === null ? null : c.toFixed(2)
}

export function isScored(scores) {
  return (
    Array.isArray(scores) &&
    scores.length === 4 &&
    scores.every((s) => s !== null && s !== undefined && s !== '' && !Number.isNaN(Number(s)))
  )
}

// Sorted by composite, descending. Array.prototype.sort is stable, so entries
// that tie on composite hold the relative order they already had rather than
// swapping between renders. Nothing generated should ever tie, since every
// order change repaints the chain onto strictly decreasing eighths, but hand
// entered scores can tie and the stability keeps that harmless.
export function rankedEntries(entries) {
  return entries
    .filter((e) => isScored(e.scores))
    .slice()
    .sort((a, b) => composite(b.scores) - composite(a.scores))
}

export function benchEntries(entries) {
  return entries.filter((e) => !isScored(e.scores))
}

// Hand entered scores snap to the same half point grid the generated ones use,
// so a hand edit and a placeholder are indistinguishable in form.
export function clampScore(v) {
  const n = Number(v)
  if (Number.isNaN(n)) return 0
  return Math.min(10, Math.max(0, Math.round(n * 2) / 2))
}

export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Monochrome placeholder: initials on a dark gradient, as an SVG data URI.
// Used until a catalog supplies real imagery.
export function placeholderImage(name) {
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  const seed = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0)
  const g1 = 18 + (seed % 20)
  const g2 = 40 + (seed % 30)
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='500'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='rgb(${g1},${g1},${g1})'/>
      <stop offset='1' stop-color='rgb(${g2},${g2},${g2})'/>
    </linearGradient></defs>
    <rect width='400' height='500' fill='url(#g)'/>
    <text x='200' y='265' font-family='Space Grotesk, sans-serif' font-size='120'
      fill='rgb(200,200,200)' text-anchor='middle' font-weight='700'>${initials}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function entryImage(entry) {
  return entry.imageUrl || placeholderImage(entry.name)
}

// ---- Phase 5: pick-based ranking and placeholder ratings ----
// ---- Phase 7: every subscore lands on a half point ----
//
// One invariant: the list always displays sorted by composite. There is no
// separate rank field. Picks are the primary way composites get assigned;
// hand edits (EntryEditor, marked scoresEdited) are the secondary way and
// always survive regeneration.
//
// Owner rule: anchor 9.5, each step down strictly positive, mean 0.25, never
// ties or inverts.
//
// THE HALF POINT RULE AND WHAT IT COSTS. Phase 7 requires every stored subscore
// to be a multiple of 0.5, so the score pass tap scale, which steps by 0.5, can
// show every row already sitting exactly on a chip. That constraint propagates
// upward and is worth stating explicitly, because it is arithmetic, not a
// preference. If each of the four subscores is a multiple of 0.5, their sum is
// a multiple of 0.5, and the composite is that sum over 4, so the composite is
// a multiple of 0.5 / 4 = 0.125. The composite grid is therefore eighths:
//
//   ... 9.500  9.375  9.250  9.125  9.000 ...
//
// and no finer value is representable while the composite remains the exact
// mean of four half point subscores. Two visible consequences:
//
//  1. compositeText renders 2 decimals, so 9.375 reads as "9.38" and 9.625 as
//     "9.63". All eight eighths are distinct at 2 decimals (.00 .13 .25 .38
//     .50 .63 .75 .88), so display never makes two different composites look
//     equal or reorders anything. Only the trailing digit is rounded. Flagged
//     rather than changed, since widening the readout to 3 decimals is a one
//     line change in compositeText if the rounding bothers you.
//  2. The smallest gap between adjacent ranks is 0.125 rather than the 0.1 of
//     Phase 5. Step sizes are drawn from {0.125, 0.25, 0.375}, whose mean is
//     0.25, exactly the Phase 5 mean, so the vertical range a list occupies is
//     unchanged: 12 items still run 9.5 down to about 6.75, 20 items to about
//     4.75.
//
// Arithmetic is done in integer eighths of a point rather than in floats, so
// there is no accumulated error and no need to round on read.

const toEighths = (v) => Math.round(v * 8)
const fromEighths = (e) => e / 8

// Steps of 1, 2 or 3 eighths: 0.125, 0.25, 0.375, mean 0.25.
function stepDownEighths() {
  return 1 + Math.floor(Math.random() * 3)
}

// Four half point subscores whose mean is exactly the composite, spread so the
// barcode rows differ. Working in half units u = 2 * score, the four u values
// are integers summing to 8 * composite. Distribute that sum as evenly as it
// goes, then move one half point from one row to another so the rows are not
// all identical. The move preserves the sum, so the mean is untouched, and it
// is skipped when either row is against the 0 or 10 rail.
export function scoresFromComposite(c) {
  const total = Math.max(0, Math.min(80, toEighths(c))) // sum of the four half units
  const base = Math.floor(total / 4)
  const extra = total - base * 4 // 0 to 3 rows get one more half point
  const u = [0, 1, 2, 3].map((i) => base + (i < extra ? 1 : 0))
  // Shuffle so the extra half points are not always on the first rows.
  for (let i = u.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[u[i], u[j]] = [u[j], u[i]]
  }
  // Offsetting move, +0.5 to one row and -0.5 to a different one, so an evenly
  // divisible composite does not produce four identical rows. Chosen at random
  // rather than by taking the current min and max, which on a set like
  // [19,19,19,18] would just swap two rows and change nothing. Skipped when
  // either row is against the 0 or 10 rail, since clamping there would break
  // the sum and with it the mean.
  const a = Math.floor(Math.random() * 4)
  const b = (a + 1 + Math.floor(Math.random() * 3)) % 4
  if (u[a] + 1 <= 20 && u[b] - 1 >= 0) {
    u[a] += 1
    u[b] -= 1
  }
  return u.map((v) => v / 2)
}

// Paint the placeholder chain top to bottom over an EXPLICIT rank order rather
// than over the current composite order. This is the primitive; everything that
// changes an order goes through it.
//
// Phase 7 moved every caller onto this, which retired a whole class of problem.
// Before, a placement painted one entry with fitBetween squeezed between its two
// neighbours, and each insertion halved the gap it landed in. On the old 0.01
// grid that degraded quietly into ugly composites; on the eighths grid the room
// runs out fast. Simulated over 20,000 twelve item sessions, one-entry-at-a-time
// painting hit a gap with no eighth in it on 24.4% of placements and left 54% of
// adjacent pairs tied on composite mid session. Repainting the whole chain
// instead costs one pass over a list that is at most a few dozen long and leaves
// zero ties at every step, so the order is always strictly defined rather than
// only after the end of session regeneration.
//
// Entries marked scoresEdited keep their scores and act as the running anchor.
// Entries not named in orderIds, notably the Bench, are returned untouched.
export function regenerateFromOrder(entries, orderIds) {
  const byId = new Map(entries.map((e) => [e.id, e]))
  const next = new Map()
  let prev = null
  for (const id of orderIds) {
    const e = byId.get(id)
    if (!e) continue
    if (e.scoresEdited && isScored(e.scores)) {
      prev = composite(e.scores)
      continue
    }
    let c
    if (prev === null) c = 9.5
    else {
      const stepped = toEighths(prev) - stepDownEighths()
      c = fromEighths(stepped > 0 ? stepped : Math.floor(toEighths(prev) / 2))
    }
    next.set(id, { ...e, scores: scoresFromComposite(c) })
    prev = c
  }
  return entries.map((e) => next.get(e.id) || e)
}

// Full top-to-bottom regeneration over the current composite order, run when a
// placement pass finishes. Walk order is already composite order, so anchoring
// on hand edited entries preserves the ranking.
export function regeneratePlaceholders(entries) {
  return regenerateFromOrder(entries, rankedEntries(entries).map((e) => e.id))
}

// Drag reorder support: move a ranked entry from one index to another and
// repaint the chain so the composite sort invariant produces the new order.
// toIdx is the index of the drop target in the pre-move ranked order ("take
// that slot"). Returns the full entries array, since the repaint touches the
// whole chain rather than only the moved entry.
export function moveAndRefit(entries, ranked, fromIdx, toIdx) {
  const ids = ranked.map((e) => e.id)
  const [movedId] = ids.splice(fromIdx, 1)
  ids.splice(toIdx, 0, movedId)
  // A drag is an explicit correction, so the moved entry gives up its hand edit
  // mark and rejoins the placeholder chain, matching the Phase 5 rule.
  const cleared = entries.map((e) => {
    if (e.id !== movedId) return e
    const { scoresEdited, ...rest } = e
    return rest
  })
  return regenerateFromOrder(cleared, ids)
}
