// How far below the score pass tap scale does a generated session reach?
//
// TAP_SCALE bounds what a row can be set to. Any stored subscore outside it
// makes chipFor return null, so that row shows an outlined approximation and
// cannot be set exactly. The chain is painted by the real regenerateFromOrder,
// so the step distribution is the shipped one.
//
//   node scripts/measure-tapscale.mjs
//
// The result is recorded in the comment above TAP_SCALE in src/pages/ScorePass.jsx.

import { readFileSync } from 'node:fs'
import { regenerateFromOrder, composite } from '../src/lib/entries.js'

// ScorePass.jsx is JSX, so node cannot import it. Read the one line instead,
// which keeps this measuring the shipped scale rather than a copy of it.
const src = readFileSync(new URL('../src/pages/ScorePass.jsx', import.meta.url), 'utf8')
const m = src.match(/export const TAP_SCALE = Array\.from\(\{ length: (\d+) \}, \(_, i\) => ([\d.]+) \+ i \* ([\d.]+)\)/)
if (!m) throw new Error('cannot parse TAP_SCALE out of src/pages/ScorePass.jsx')
const TAP_SCALE = Array.from({ length: Number(m[1]) }, (_, i) => Number(m[2]) + i * Number(m[3]))

const LO = TAP_SCALE[0]
const RUNS = Number(process.env.RUNS || 20000)

function session(n) {
  const entries = Array.from({ length: n }, (_, i) => ({ id: `i${i}`, name: `Item ${i}`, scores: null }))
  return regenerateFromOrder(entries, entries.map((e) => e.id))
}

console.log(`tap scale floor ${LO.toFixed(1)}, ceiling ${TAP_SCALE[TAP_SCALE.length - 1].toFixed(1)}, ${TAP_SCALE.length} chips`)

for (const n of [8, 10, 12, 15]) {
  let subBelow = 0
  let subTotal = 0
  let rowsAllBelow = 0
  let sessionsAffected = 0
  let minSub = Infinity
  let minComp = Infinity
  const byRank = new Array(n).fill(0)
  const perSession = []

  for (let r = 0; r < RUNS; r++) {
    let affected = 0
    session(n).forEach((e, idx) => {
      const below = e.scores.filter((s) => s < LO).length
      subBelow += below
      subTotal += 4
      if (below > 0) { byRank[idx]++; affected++ }
      if (below === 4) rowsAllBelow++
      minSub = Math.min(minSub, ...e.scores)
      minComp = Math.min(minComp, composite(e.scores))
    })
    perSession.push(affected)
    if (affected > 0) sessionsAffected++
  }

  const mean = perSession.reduce((a, b) => a + b, 0) / RUNS
  const worst = perSession.reduce((a, b) => (b > a ? b : a), 0)

  console.log(`\n=== ${n} items, ${RUNS} sessions ===`)
  console.log(`sessions with at least one unsettable row : ${((100 * sessionsAffected) / RUNS).toFixed(2)}%`)
  console.log(`mean unsettable rows per session          : ${mean.toFixed(3)} of ${n}`)
  console.log(`worst unsettable rows in one session      : ${worst}`)
  console.log(`subscores below the floor                 : ${((100 * subBelow) / subTotal).toFixed(3)}% of ${subTotal}`)
  console.log(`rows with all four below the floor        : ${((100 * rowsAllBelow) / (RUNS * n)).toFixed(3)}%`)
  console.log(`lowest subscore seen                      : ${minSub}`)
  console.log(`lowest composite seen                     : ${minComp}`)
  const tail = byRank.map((c, i) => [i + 1, (100 * c) / RUNS]).filter(([, p]) => p > 0)
  console.log(
    tail.length
      ? 'by rank: ' + tail.map(([k, p]) => `${k}: ${p.toFixed(1)}%`).join('   ')
      : 'no row at any rank fell below the floor'
  )
}
