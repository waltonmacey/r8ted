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
// of the zone's valid pivots rather than the exact midpoint. Phase 7 found
// that window was doing nothing on the sessions that matter, and fixed it.
//
// The Phase 6 diagnosis was that repeat PAIRINGS were the risk, and it
// measured those at 0.00% of 3.27 million comparisons and declared the problem
// solved. The thing that is actually tedious is different: one item serving as
// the opponent in duel after duel against a parade of challengers. Traced on a
// 12 item session from scratch, picks 2 through 11 were ten consecutive duels
// against the same entry, and picks 13 through 20 eight more against the next
// one. Mean longest same opponent run was 10.5 duels of 32.7 at 12 items and
// 18.5 of 71.1 at 20.
//
// The cause is not the window fraction, it is the width floor. Open items that
// have taken the same number of duels hold identical zones, so they compute an
// identical window, and round(0.3 * count) collapses to a single index for
// every pivot range narrower than 5. One index means no choice, so the random
// draw never engages and every challenger in the pass meets the same opponent.
// PIVOT_MIN_WINDOW raises the floor to 2 whenever the zone has two pivots to
// offer, which is the cheapest possible place to buy variety: both branches of
// a two wide window are near balanced, so nothing is paid in picks.
//
// LEAST USED OPPONENT. Within the window, the pivot whose entry has served as
// opponent fewest times this session wins, ties broken at random. Free when the
// window holds one index.
//
// Measured over 20,000 random orders per case, against the shipped rule:
//
//   12 from scratch   picks 32.5 vs 32.7, worst 48 vs 60,
//                     longest same opponent run 3.03 vs 10.50
//   20 from scratch   picks 70.4 vs 71.1, worst 104 vs 142,
//                     longest run 3.48 vs 18.50
//   3 into 12 ranked  picks 11.9 vs 11.8, longest run 1.27 vs 1.84
//
// Mean picks are unchanged to slightly better and the worst case improves by
// 20% at 12 items and 27% at 20. The cost lands on the early exit, where
// off centre pivots leave slightly wider zones: 7.47 misplaced of 12 at the
// gate against 6.50 before. EARLY_EXIT_MIN_DUELS at 3 more than buys that back,
// which is why it moves in the same change.
//
// The Phase 6 comment claimed fully random pivots raise expected picks by
// roughly 40%. Measured, that is wrong twice over. On pure binary insertion
// with no interference it is 14.7% at a field of 11, 17.5% at 19 and 19.9% at
// 31. Inside the breadth first session it is 2.8%, because items landing
// inside a zone between its duels do most of the narrowing regardless of where
// the pivot fell. The window was defended by a number that does not hold, so
// the floor was never a real cost.
export const PIVOT_WINDOW = 0.3
export const PIVOT_MIN_WINDOW = 2

// The early exit gate, in duels every open item must have taken before the End
// session button appears. Phase 6 shipped 2. Measured on 12 items from scratch
// under the Phase 7 pivot rule, the gate at 2 opens at pick 19.6 of 32.5 with
// 7.47 of 12 items misplaced and the top 4 set correct 34% of the time; at 3 it
// opens at pick 25.9 with 4.56 misplaced and the top 4 correct 61%. Against the
// shipped rule at its own gate of 2, that is 4.56 misplaced against 6.50 and
// 61% against 41%, for 5.7 more picks before the button appears. On 3 items
// added to an already ranked 12 the gate at 3 costs 3 extra picks and takes
// misplaced from 4.47 to 2.50, so it is not a from scratch only win.
//
// A rule scaling the threshold with queued against already ranked was
// considered and rejected: the measurements show the same direction in both
// regimes, so a flat constant is the honest form.
export const EARLY_EXIT_MIN_DUELS = 3

// ---- contender selection bounds (Phase 8) ----
//
// The list page is built around ranks 1 to 8, so 8 is the floor: a session that
// produces fewer than eight items cannot fill the podium. 15 is the ceiling
// because 15 is where the session stops being one sitting. Measured on the
// shipped engine over 40,000 random preference orders per size, the range spans
// 17 to 46 picks, a 2.7x spread. At 15 selected, 8 make the podium and 7 go
// straight to Beyond the Eight; that is the argument for allowing the range at
// all, not a defect.
export const MIN_CONTENDERS = 8
export const MAX_CONTENDERS = 15

// Mean picks to build a list of this size from scratch, rounded to the nearest
// pick. Measured, not modelled, though the n log n model does hold: it predicts
// 16.9 at the floor and 45.6 at the ceiling against 16.9 and 45.8 measured. A
// lookup rather than a formula because the curve is not worth approximating
// over eight values.
export const SESSION_ESTIMATE = { 8: 17, 9: 21, 10: 24, 11: 28, 12: 32, 13: 37, 14: 41, 15: 46 }

// Outside 8 to 15 the confirm step does not run, but the estimate is still
// useful to anything that wants to quote a session length. Falls back to the
// measured 4.8 picks per item slope past the ceiling.
export function sessionEstimate(n) {
  if (SESSION_ESTIMATE[n]) return SESSION_ESTIMATE[n]
  if (n < 8) return Math.max(0, Math.round(n * 2.1))
  return Math.round(46 + (n - 15) * 4.8)
}

// ---- early exit suppression (Phase 8) ----
//
// The gate at 3 duels is not the whole rule. Measured on the shipped engine,
// the gate FIRES in 87.1% of eight item sessions, which contradicts the Phase 7
// reading that it would rarely fire at all. The real problem is that when it
// fires at 8 it appears at pick 15.0 of a mean 16.9 and offers to save 2.4
// picks, in exchange for 1.9 items landing in the wrong place. That is a
// control asking for a decision worth less than the decision costs.
//
// Queue size is the wrong thing to key the suppression on: it is not available
// once a session mixes queued items into an already ranked list, and it is not
// what makes the button worth showing. Picks remaining is.
//
// Picks remaining is estimable at runtime from the open zones alone. Three
// candidates were fitted against actual picks to completion over 155,841 gate
// snapshots at queue sizes 8 to 15, least squares through the origin:
//
//   estimator                    scalar   mean |error|
//   open item count               1.833      1.35 picks
//   sum worstRemaining(zoneSize)  1.123      1.30 picks
//   sum log2(zoneSize)            1.379      1.12 picks
//
// The log2 sum wins and has the more honest story: log2(zoneSize) is the picks
// a perfect binary search would need on that zone, and the 1.38 multiplier is
// what off centre pivots and zone growth actually cost on top of it. It over
// predicts by 0.44 picks at a queue of 8 and under predicts by 0.42 at 15, so
// it is a threshold instrument, not a precise readout.
export const PICKS_LEFT_K = 1.38

// The floor, in estimated picks, below which End session is withheld. Swept as
// a precision problem over every state from the gate onward, not just the first
// one, with DEAD = shown with fewer than 4 picks actually left and MISSED =
// withheld with 8 or more actually left:
//
//   floor   shown   dead offers   missed offers   mean saving when shown
//     none   100%        42.7%            0.0%              5.0 picks
//        3     70%        12.7%            0.0%              6.5
//        4     62%         6.1%            0.0%              7.0
//        5     46%         0.4%            0.0%              8.1
//        6     38%         0.0%            0.2%              8.7
//        8     21%         0.0%            3.9%             10.4
//
// 5 is the knee: dead offers fall from 42.7% to 0.4% and nothing is missed yet.
// 6 buys the last 0.4% at the cost of starting to hide real savings.
//
// What it does per queue size, at the first firing: the button is withheld in
// 98% of eight item sessions and 86% of nine item ones, and appears in 98% of
// fifteen item ones. On three items added to an already ranked twelve it never
// appears, correctly, because that whole session is 11.3 picks.
//
// NOT LATCHED, deliberately. The estimate falls as zones close, so the button
// appears and then withdraws when finishing outright becomes cheaper than
// deciding. Measured, it never comes back: the flicker rate (shown, hidden,
// shown again) is 0.0% at every queue size from 8 to 15. Latching would keep it
// on screen through 26% to 35% of states with fewer than 4 picks left, which is
// the dead UI this rule exists to remove.
export const EARLY_EXIT_MIN_SAVING = 5

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
// window is centred there and holds round(0.3 * pivotCount) indices, floored at
// PIVOT_MIN_WINDOW and capped at the number of pivots that exist.
export function pivotWindow(zone) {
  const a = zone.lo
  const b = zone.hi - 1
  if (b <= a) return [a, a]
  const count = b - a + 1
  const width = Math.min(count, Math.max(PIVOT_MIN_WINDOW, Math.round(PIVOT_WINDOW * count)))
  const from = a + Math.ceil((count - width) / 2)
  return [from, from + width - 1]
}

// Choose the opponent. Inside the window, the entry that has served as opponent
// fewest times this session wins, ties broken at random. `order` and `used` are
// the session's placed order and its id to duel count tally; passing neither
// falls back to a uniform draw, which is what the worst case analysis below
// assumes since it reasons about an adversary choosing freely in the window.
export function pivotIndex(zone, rng = Math.random, order = null, used = null) {
  const [from, to] = pivotWindow(zone)
  if (to <= from) return from
  if (!order || !used) return from + Math.floor(rng() * (to - from + 1))
  let fewest = Infinity
  const ties = []
  for (let m = from; m <= to; m++) {
    const n = used[order[m]] || 0
    if (n < fewest) { fewest = n; ties.length = 0; ties.push(m) }
    else if (n === fewest) ties.push(m)
  }
  return ties[Math.floor(rng() * ties.length)]
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
    // id to number of times that entry has served as the opponent this
    // session, read by pivotIndex to spread opponents across the window.
    used: {},
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
  return { ...state, current: { id: zone.id, pivot: pivotIndex(zone, rng, state.order, state.used) } }
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
  // Tally the opponent before advancing, so the next pivot sees this duel.
  const opponent = state.order[m]
  const used = { ...state.used, [opponent]: (state.used[opponent] || 0) + 1 }

  if (zoneOpen(next)) {
    const open = state.open.map((z) => (z.id === cur.id ? next : z))
    return { state: advance({ ...state, open, picks, used }, rng), placement: null }
  }

  // Zone closed: the item lands at next.lo and every other zone shifts. No
  // other zone can be closed by that shift, so advancing straight to the next
  // duel is safe.
  const index = next.lo
  const placed = placeAt({ ...state, open: state.open.map((z) => (z.id === cur.id ? next : z)), picks, used }, cur.id, index)
  return { state: advance(placed, rng), placement: { itemId: cur.id, index } }
}

// ---- early exit ----

// Estimated picks still to run if the session is carried through to completion.
// Sum of log2 zone sizes, scaled by the measured cost of off centre pivots and
// zone growth. See PICKS_LEFT_K for the fit and its error.
export function estimatedPicksLeft(state) {
  let sum = 0
  for (const z of state.open) sum += Math.log2(zoneSize(z))
  return Math.round(PICKS_LEFT_K * sum)
}

// The End session affordance appears once BOTH hold:
//
//   every still-open item has dueled at least EARLY_EXIT_MIN_DUELS times, so
//     the estimate it would settle on is worth having. Under the fairness rule
//     that also guarantees every queued item has dueled at least once, since no
//     item gets a second duel while another is still on zero.
//   at least EARLY_EXIT_MIN_SAVING picks are estimated to remain, so the offer
//     is worth more than the decision it asks for.
//
// The second clause is Phase 8. It is what keeps the button off screen in a
// short session, where the gate fires reliably and saves almost nothing.
export function canEndEarly(state) {
  if (state.open.length === 0) return false
  if (!state.open.every((z) => z.duels >= EARLY_EXIT_MIN_DUELS)) return false
  return estimatedPicksLeft(state) >= EARLY_EXIT_MIN_SAVING
}

// The raw duel gate on its own, without the saving floor. Kept separate so the
// chip strip can explain accurately why the button is not there yet.
export function pastDuelGate(state) {
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
