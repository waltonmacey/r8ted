// Breadth-first placement engine (Phase 6). Supersedes the Phase 5 depth-first
// binary insertion, in which each Bench item was driven to full precision
// before the next item ever dueled. Same comparisons, reordered, so a
// defensible full order exists early and the session can end before
// completion.
//
// LANDING ZONE. Every unplaced item carries a zone [lo, hi], the inclusive
// range of insertion positions it could still occupy in the current placed
// order. An insertion position p means "this item ranks below exactly p placed
// items", so p runs 0 to order.length and a zone of [0, n] on a placed order
// of n items is total ignorance (n + 1 candidate slots). A duel shrinks the
// zone; the item places exactly when the zone closes to one candidate.
//
// PASSES. The next item to duel is always the open item with the fewest duels
// so far, ties broken by original queue order. That single rule produces the
// pass structure: pass 1 gives every queued item one duel before any item
// gets a second, pass 2 a second duel for whatever is still open, and so on.
//
// ZONE SHIFTING. Because other items place between an item's duels, zones are
// indexed against an order that keeps growing. When item X places at position
// p, an open item's zone [lo, hi] becomes:
//
//   lo' = lo + (lo > p ? 1 : 0)
//   hi' = hi + (hi >= p ? 1 : 0)
//
// The asymmetry is not a typo. If the open item's candidate position q is
// strictly less than p, the open item must sit above X (it beats the placed
// item at index q, which sits above X, so X cannot beat it without
// contradiction), and q is unchanged. If q > p, X joins the items above it and
// q gains one. If q == p, both readings are live: the open item could land
// above X at p or below X at p + 1, so the zone must cover both, which is
// exactly what hi >= p does. Nothing is inferred that a pick did not earn.
//
// PIVOT VARIETY. The opponent is drawn from a window covering the middle 30%
// of the zone's valid pivots rather than the exact midpoint, so repeat
// opponents are rare. Fully random pivots were rejected: quicksort style
// pivoting raises expected picks by roughly 40%.

export const EARLY_EXIT_MIN_DUELS = 2
export const PIVOT_WINDOW = 0.3

// Completion policy, one line to flip. 'passes' is the Phase 6 spec: passes
// continue until every zone closes. 'passes-then-depth' runs the same passes up
// to the early exit gate, then finishes one item at a time.
//
// Measured over 20,000 random orders per case (see the handover): both are
// identical up to the gate, so the early exit is unaffected. Past the gate,
// 12 items from scratch cost mean 32.7 picks worst 64 under 'passes' against
// mean 32.0 worst 46 under 'passes-then-depth'; 20 items cost mean 71.0 worst
// 123 against mean 68.1 worst 94. The spec default ships; the alternative is
// recommended in the handover and is a one word change here.
export const COMPLETION_POLICY = 'passes'

// ---- zones ----

// Candidate slots still open to this item.
export function zoneSize(zone) {
  return zone.hi - zone.lo + 1
}

export function zoneOpen(zone) {
  return zone.hi > zone.lo
}

// Midpoint candidate, used by the early exit and by the provisional ordering
// the chip strip renders.
export function zoneMid(zone) {
  return (zone.lo + zone.hi) >> 1
}

export function shiftZone(zone, p) {
  return {
    ...zone,
    lo: zone.lo + (zone.lo > p ? 1 : 0),
    hi: zone.hi + (zone.hi >= p ? 1 : 0),
  }
}

// Valid pivots are indices [lo, hi - 1] into the placed order. Comparing
// against order[m] splits the zone into [lo, m] on a win and [m + 1, hi] on a
// loss, so the balanced pivot is the exact midpoint of the pivot range. The
// window is centred there and holds max(1, round(0.3 * pivotCount)) indices.
export function pivotWindow(zone) {
  const a = zone.lo
  const b = zone.hi - 1
  if (b <= a) return [a, a]
  const count = b - a + 1
  const width = Math.max(1, Math.round(PIVOT_WINDOW * count))
  const from = a + Math.ceil((count - width) / 2)
  return [from, from + width - 1]
}

export function pivotIndex(zone, rng = Math.random) {
  const [from, to] = pivotWindow(zone)
  if (to <= from) return from
  return from + Math.floor(rng() * (to - from + 1))
}

// ---- worst case picks ----

// Worst case picks to close a zone of s candidates under the window pivot
// rule, assuming no further items land inside the zone. The adversary answers
// to leave the larger branch, and picks the worst pivot the window allows.
const worstCache = new Map([[1, 0]])
export function worstRemaining(s) {
  if (s <= 1) return 0
  const hit = worstCache.get(s)
  if (hit !== undefined) return hit
  // Zone [0, s - 1]; branches from pivot m are (m + 1) and (s - 1 - m).
  const [from, to] = pivotWindow({ lo: 0, hi: s - 1 })
  let worst = 0
  for (let m = from; m <= to; m++) {
    const branch = Math.max(worstRemaining(m + 1), worstRemaining(s - 1 - m))
    if (branch > worst) worst = branch
  }
  const total = 1 + worst
  worstCache.set(s, total)
  return total
}

// Depth-first binary insertion cost, kept as the published baseline: placing
// `placed` items into a list that started with `startSize` ranked entries
// costs at most ceil(log2(field + 1)) per item, and a field of 0 is free.
// For 12 items from scratch: 1+2+2+3+3+3+3+4+4+4+4 = 33.
export function worstCase(startSize, placed) {
  let total = 0
  for (let i = 0; i < placed; i++) {
    const s = startSize + i
    if (s > 0) total += Math.ceil(Math.log2(s + 1))
  }
  return total
}

// ---- session state ----

// A state is plain data: the placed order (ids), the open zones, counters, the
// ids that were placed by estimate rather than by a closed zone, and the
// current duel. Ratings live outside this module; a placement is reported and
// the caller paints it.
export function initPlacement(orderIds, queueIds) {
  return {
    order: orderIds.slice(),
    open: queueIds.map((id, seq) => ({ id, seq, lo: 0, hi: orderIds.length, duels: 0 })),
    picks: 0,
    placed: 0,
    startSize: orderIds.length,
    estimated: [],
    current: null,
  }
}

// A zone that is already closed places without a pick. Shifting can never
// shrink a zone (lo only rises when lo > p, and hi rises with it), so the only
// way this arises is a session opening on an empty list, where every zone
// starts as [0, 0]: the first item takes the top slot for free. The caller
// drains these before dueling because it has to paint the rating.
export function pendingFree(state) {
  return state.open.find((z) => !zoneOpen(z)) || null
}

// Insert a placed item into the order at `index` and shift every remaining
// zone. Shared by the free placement, the pick that closes a zone, and the
// early exit.
export function placeAt(state, id, index) {
  return {
    ...state,
    order: [...state.order.slice(0, index), id, ...state.order.slice(index)],
    open: state.open.filter((z) => z.id !== id).map((z) => shiftZone(z, index)),
    placed: state.placed + 1,
  }
}

// The open item due next: fewest duels, then original queue order. That single
// rule is what produces the pass structure. Under 'passes-then-depth', items
// that have cleared the early exit gate are finished one at a time instead.
function dueNext(open) {
  let pool = open
  if (COMPLETION_POLICY === 'passes-then-depth') {
    const fresh = open.filter((z) => z.duels < EARLY_EXIT_MIN_DUELS)
    if (fresh.length > 0) pool = fresh
    else return pool.reduce((b, z) => (!b || z.seq < b.seq ? z : b), null)
  }
  let best = null
  for (const z of pool) {
    if (!best || z.duels < best.duels || (z.duels === best.duels && z.seq < best.seq)) best = z
  }
  return best
}

// Set the current duel, or clear it when nothing is open. A zone that is
// already closed cannot occur here: applyPick places on close.
export function advance(state, rng = Math.random) {
  const zone = dueNext(state.open)
  if (!zone) return { ...state, current: null }
  return { ...state, current: { id: zone.id, pivot: pivotIndex(zone, rng) } }
}

// The pass an item is on is one more than its duel count, so the session pass
// is the minimum duel count across open items plus one.
export function currentPass(state) {
  const zone = dueNext(state.open)
  return zone ? zone.duels + 1 : 0
}

export function zoneFor(state, id) {
  return state.open.find((z) => z.id === id) || null
}

// Apply a pick. `winnerIsNew` true means the item being placed beat the
// opponent at state.current.pivot, so it ranks at or above that index.
// Returns the next state plus a placement { itemId, index } when the zone
// closed, where index is a position in the PRE-insertion order. The caller
// paints ratings from its own copy of that order, then renders the new state.
export function applyPick(state, winnerIsNew, rng = Math.random) {
  const cur = state.current
  const zone = zoneFor(state, cur.id)
  const m = cur.pivot
  const next = winnerIsNew ? { ...zone, lo: zone.lo, hi: m } : { ...zone, lo: m + 1, hi: zone.hi }
  next.duels = zone.duels + 1
  const picks = state.picks + 1

  if (zoneOpen(next)) {
    const open = state.open.map((z) => (z.id === cur.id ? next : z))
    return { state: advance({ ...state, open, picks }, rng), placement: null }
  }

  // Zone closed: the item lands at next.lo and every other zone shifts. No
  // other zone can be closed by that shift, so advancing straight to the next
  // duel is safe.
  const index = next.lo
  const placed = placeAt({ ...state, open: state.open.map((z) => (z.id === cur.id ? next : z)), picks }, cur.id, index)
  return { state: advance(placed, rng), placement: { itemId: cur.id, index } }
}

// ---- early exit ----

// The End session affordance appears once every still-open item has dueled at
// least EARLY_EXIT_MIN_DUELS times. Under the fairness rule that also
// guarantees every queued item has dueled at least once, since no item gets a
// second duel while another is still on zero.
export function canEndEarly(state) {
  return state.open.length > 0 && state.open.every((z) => z.duels >= EARLY_EXIT_MIN_DUELS)
}

// Settle every open item at the midpoint of its remaining zone, lowest
// midpoint first so each insertion only shifts zones that sit above it.
// Returns placements in application order: each index is valid against the
// order as it stands after the previous insertions.
export function settleOpen(state) {
  let order = state.order.slice()
  let open = state.open.map((z) => ({ ...z }))
  const placements = []
  while (open.length > 0) {
    open.sort((a, b) => zoneMid(a) - zoneMid(b) || a.seq - b.seq)
    const [z, ...rest] = open
    const index = zoneMid(z)
    order = [...order.slice(0, index), z.id, ...order.slice(index)]
    placements.push({ itemId: z.id, index, uncertain: zoneOpen(z) })
    open = rest.map((o) => shiftZone(o, index))
  }
  return { order, placements }
}

// End the session now. Every open item is settled at its zone midpoint and
// recorded in `estimated`. Nothing settled this way is marked scoresEdited by
// the caller, so later duels, drags, and hand edits refine it normally.
// Placements come back in application order; the caller paints each one
// against the order as it stands after the previous insertions.
export function endEarly(state) {
  const { placements } = settleOpen(state)
  let next = { ...state, estimated: [...state.estimated] }
  for (const p of placements) {
    next = placeAt(next, p.itemId, p.index)
    next.estimated.push(p.itemId)
  }
  return { state: { ...next, current: null }, placements }
}

// The order the chip strip renders: placed items solid, open items shown at
// their provisional midpoint as dashed chips, so the cost of ending the
// session early is visible before the button is tapped.
export function provisionalOrder(state) {
  const { order, placements } = settleOpen(state)
  const uncertain = new Set(placements.filter((p) => p.uncertain).map((p) => p.itemId))
  return order.map((id) => ({ id, certain: !uncertain.has(id) }))
}
