// Re-measure COMPLETION_POLICY over the bounded 8 to 15 contender range.
//
// Both variants are src/lib/placement.js itself, copied to a temp directory
// with only the one policy string changed, so the Phase 7 window pivot rule and
// the Phase 8 opponent spreading are whatever the shipped module says they are.
// Nothing about the engine is reimplemented here.
//
//   node scripts/measure-policy.mjs
//   RUNS=2000 node scripts/measure-policy.mjs      (faster, noisier)
//
// The result is recorded in the comment above COMPLETION_POLICY.

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const SRC = new URL('../src/lib/placement.js', import.meta.url)
const source = readFileSync(SRC, 'utf8')

const LINE = "export const COMPLETION_POLICY = 'passes'"
const ALT = "export const COMPLETION_POLICY = 'passes-then-depth'"
if (!source.includes(LINE) && !source.includes(ALT)) {
  throw new Error('cannot find the COMPLETION_POLICY line in src/lib/placement.js')
}

const dir = mkdtempSync(join(tmpdir(), 'r8ted-policy-'))
writeFileSync(join(dir, 'package.json'), '{"type":"module"}')
const write = (name, policy) => {
  const body = source.replace(LINE, ALT).replace(ALT, `export const COMPLETION_POLICY = '${policy}'`)
  const p = join(dir, name)
  writeFileSync(p, body)
  return pathToFileURL(p).href
}
const P = await import(write('passes.js', 'passes'))
const D = await import(write('depth.js', 'passes-then-depth'))
if (P.COMPLETION_POLICY !== 'passes' || D.COMPLETION_POLICY !== 'passes-then-depth') {
  throw new Error('policy variants did not load as expected')
}

// mulberry32, so a seed reproduces a session exactly.
function rngFrom(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled(n, rng) {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// One session from an empty list with n contenders, answered from a fixed total
// preference order. Mirrors the driving loop in DuelSession.startPlacement.
// Returns picks to completion, and throws if the final order is not the truth
// order, which is the correctness check both policies have to pass.
function run(M, n, seed) {
  const rng = rngFrom(seed)
  const ids = Array.from({ length: n }, (_, i) => `i${i}`)
  const perm = shuffled(n, rngFrom(seed ^ 0x9e3779b9))
  const truth = Object.fromEntries(ids.map((id, i) => [id, perm[i]]))

  let s = M.initPlacement([], ids)
  let free = M.pendingFree(s)
  while (free) {
    s = M.placeAt(s, free.id, free.lo)
    free = M.pendingFree(s)
  }
  s = M.advance(s, rng)

  let guard = 0
  while (s.current) {
    if (++guard > 5000) throw new Error('runaway session')
    const winnerIsNew = truth[s.current.id] < truth[s.order[s.current.pivot]]
    s = M.applyPick(s, winnerIsNew, rng).state
  }
  const final = s.order.map((id) => truth[id])
  for (let i = 1; i < final.length; i++) {
    if (final[i] <= final[i - 1]) throw new Error(`final order wrong at index ${i}`)
  }
  return s.picks
}

const RUNS = Number(process.env.RUNS || 20000)
const mean = (x) => x.reduce((s, v) => s + v, 0) / x.length
const max = (x) => x.reduce((s, v) => (v > s ? v : s), 0)
const pct = (x, p) => {
  const y = x.slice().sort((u, v) => u - v)
  return y[Math.min(y.length - 1, Math.floor(p * y.length))]
}

const rows = []
for (let n = 8; n <= 15; n++) {
  const a = []
  const b = []
  for (let r = 0; r < RUNS; r++) {
    // Same seed to both policies, so the columns are paired.
    const seed = n * 1000003 + r
    a.push(run(P, n, seed))
    b.push(run(D, n, seed))
  }
  rows.push({
    n,
    am: mean(a), bm: mean(b),
    a95: pct(a, 0.95), b95: pct(b, 0.95),
    a99: pct(a, 0.99), b99: pct(b, 0.99),
    aw: max(a), bw: max(b),
    better: (100 * a.filter((v, i) => b[i] < v).length) / RUNS,
    worse: (100 * a.filter((v, i) => b[i] > v).length) / RUNS,
  })
}

const f = (v, d = 2) => v.toFixed(d).padStart(7)
console.log(`RUNS per size: ${RUNS}, paired seeds\n`)
console.log('  n | passes mean  depth mean    delta | p95 p/d | p99 p/d | worst p/d | depth better  depth worse')
console.log('----+---------------------------------+---------+---------+-----------+--------------------------')
for (const r of rows) {
  console.log(
    `${String(r.n).padStart(3)} |${f(r.am)}     ${f(r.bm)}  ${f(r.bm - r.am)} |` +
      ` ${String(r.a95).padStart(3)}/${String(r.b95).padStart(3)} |` +
      ` ${String(r.a99).padStart(3)}/${String(r.b99).padStart(3)} |` +
      ` ${String(r.aw).padStart(4)}/${String(r.bw).padStart(4)} |` +
      ` ${f(r.better, 1)}%      ${f(r.worse, 1)}%`
  )
}
const ta = rows.reduce((s, r) => s + r.am, 0) / rows.length
const tb = rows.reduce((s, r) => s + r.bm, 0) / rows.length
console.log(`\nmean over 8 to 15: passes ${ta.toFixed(3)}, passes-then-depth ${tb.toFixed(3)}, delta ${(tb - ta).toFixed(3)}`)
