// Composite = (s1 + s2 + s3 + s4) / 4, shown to 2 decimals.
// Entries with null scores live on the Bench and never rank.

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

export function rankedEntries(entries) {
  return entries
    .filter((e) => isScored(e.scores))
    .slice()
    .sort((a, b) => composite(b.scores) - composite(a.scores))
}

export function benchEntries(entries) {
  return entries.filter((e) => !isScored(e.scores))
}

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
// One invariant: the list always displays sorted by composite. There is no
// separate rank field. Picks are the primary way composites get assigned;
// hand edits (EntryEditor, marked scoresEdited) are the secondary way and
// always survive regeneration.
//
// Owner rule: anchor 9.5, each step down uniform random 0.10 to 0.40
// (mean 0.25, strictly positive, never ties or inverts). Implementation note,
// flagged in the handover: steps and jitters draw from the 0.1 grid
// ({0.1, 0.2, 0.3, 0.4}, mean (0.1+0.2+0.3+0.4)/4 = 0.25) so stored scores
// stay clean one-decimal values and subscore averages equal the composite
// exactly. Squeezed fit-between values may land on the 0.01 grid instead.

const round1 = (v) => Math.round(v * 10) / 10
const round2 = (v) => Math.round(v * 100) / 100

function stepDown() {
  return (1 + Math.floor(Math.random() * 4)) / 10
}

// Subscores jitter in offsetting pairs (+d1/-d1, +d2/-d2) around the
// composite so they average exactly to it and the barcode rows differ.
// Jitters shrink near the 0 and 10 rails so clamping never breaks the mean.
export function scoresFromComposite(c) {
  const comp = round2(c)
  const dMax = Math.max(0, Math.min(0.3, round2(10 - comp), comp))
  const draw = () => Math.floor(Math.random() * (Math.round(dMax * 10) + 1)) / 10
  const d1 = draw()
  const d2 = draw()
  return [comp + d1, comp - d1, comp + d2, comp - d2].map(round2)
}

// A new composite strictly between two neighbors (either may be null at the
// rails). Prefers the 0.1 grid, falls back to finer midpoints in tight gaps.
export function fitBetween(upper, lower) {
  if (upper == null && lower == null) return 9.5
  if (upper == null) {
    // Taking the top slot: step up from the old leader, capped below 10.
    const c = round1(lower + stepDown())
    return c < 10 ? c : round2((lower + 10) / 2)
  }
  if (lower == null) {
    // Taking the bottom slot: step down, strictly positive.
    const c = round1(upper - stepDown())
    return c > 0 ? c : round2(upper / 2)
  }
  const grid = round1((upper + lower) / 2)
  if (grid > lower && grid < upper) return grid
  const mid = round2((upper + lower) / 2)
  if (mid > lower && mid < upper) return mid
  return (upper + lower) / 2
}

// Replace an entry's scores with generated ones and clear its hand-edit mark
// (an explicit duel move or drag is a correction that supersedes the edit).
export function withGeneratedScores(entry, comp) {
  const { scoresEdited, ...rest } = entry
  return { ...rest, scores: scoresFromComposite(comp) }
}

// Full top-to-bottom regeneration, run when a placement pass finishes or a
// list is first built from picks. Walks the current composite order. Entries
// marked scoresEdited keep their scores and act as the running anchor, which
// preserves order because the walk order is already composite order.
export function regeneratePlaceholders(entries) {
  const ranked = rankedEntries(entries)
  const next = new Map()
  let prev = null
  for (const e of ranked) {
    if (e.scoresEdited) {
      prev = composite(e.scores)
      continue
    }
    let c
    if (prev === null) c = 9.5
    else {
      c = round1(prev - stepDown())
      if (c <= 0) c = round2(prev / 2)
    }
    next.set(e.id, { ...e, scores: scoresFromComposite(c) })
    prev = c
  }
  return entries.map((e) => next.get(e.id) || e)
}

// Drag reorder support: move a ranked entry from one index to another and
// regenerate its rating to fit its destination neighbors. toIdx is the index
// of the drop target in the pre-move ranked order ("take that slot").
export function moveAndRefit(ranked, fromIdx, toIdx) {
  const arr = ranked.slice()
  const [item] = arr.splice(fromIdx, 1)
  const upper = toIdx > 0 ? composite(arr[toIdx - 1].scores) : null
  const lower = toIdx < arr.length ? composite(arr[toIdx].scores) : null
  return withGeneratedScores(item, fitBetween(upper, lower))
}
