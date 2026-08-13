// End to end check of the Phase 8 early exit suppression, driven through the
// real app rather than the simulator: create a list, pick N contenders, run the
// whole session, and record the pick at which End session first appears.
//
// The simulator says the button should be withheld in 98% of eight item
// sessions and should appear in 98% of fifteen item ones. This confirms the
// shipped UI agrees with the module, which is the part a simulation cannot
// check.

import { browser, openApp, MOBILE } from './shot-lib.mjs'

const RUNS = Number(process.env.RUNS || 12)

async function makeList(page, n) {
  await page.getByRole('link', { name: /Story & Screen/i }).first().click()
  await page.getByRole('link', { name: /TV & Anime/i }).first().click()
  await page.getByRole('link', { name: /New list/i }).first().click()
  await page.getByPlaceholder('Point Guards').fill(`Sitcoms ${n}`)
  await page.locator('label').filter({ hasText: 'Sitcoms' }).first().click()
  await page.getByRole('button', { name: /Create and pick contenders/i }).click()
  await page.getByRole('heading', { name: /Pick your contenders/i }).waitFor()
  const tiles = page.locator('main button[aria-pressed]')
  const names = []
  for (let i = 0; i < n; i++) {
    names.push((await tiles.nth(i).getAttribute('title')).trim())
    await tiles.nth(i).click()
  }
  await page.getByRole('button', { name: new RegExp(`Rank ${n} items`) }).click()
  await page.waitForTimeout(400)
  // Truth is catalog order: earlier in the grid ranks higher. Answering from a
  // fixed total order rather than at random is what makes these numbers
  // comparable to the simulator, which also assumes a consistent preference.
  return new Map(names.map((nm, i) => [nm, i]))
}

async function currentPick(page) {
  const t = await page.locator('main p.font-mono').first().innerText()
  const m = t.match(/PICK (\d+)/i)
  return m ? Number(m[1]) : null
}

// Drive the session to completion, answering from the fixed preference order,
// and note the first pick where End session is on screen. Never taps it: the
// question is when it appears, not what it does.
async function runSession(page, truth) {
  let firstShown = null
  let picks = 0
  for (let guard = 0; guard < 200; guard++) {
    if (await page.getByRole('link', { name: /View the list/i }).count()) break
    const p = await currentPick(page)
    if (p !== null) picks = p
    if (firstShown === null && (await page.getByRole('button', { name: /^End session$/i }).count())) {
      firstShown = p
    }
    const cards = page.locator('main button.group')
    const n = await cards.count()
    if (n < 2) break
    const a = (await cards.nth(0).locator('h3').innerText()).trim()
    const c = (await cards.nth(1).locator('h3').innerText()).trim()
    const ra = truth.has(a) ? truth.get(a) : Infinity
    const rc = truth.has(c) ? truth.get(c) : Infinity
    await cards.nth(ra <= rc ? 0 : 1).click()
    await page.waitForTimeout(60)
  }
  return { firstShown, total: picks }
}

const b = await browser()
for (const n of [8, 12, 15]) {
  const rows = []
  for (let r = 0; r < RUNS; r++) {
    const { ctx, page } = await openApp(b, MOBILE)
    const truth = await makeList(page, n)
    rows.push(await runSession(page, truth))
    await ctx.close()
  }
  const shown = rows.filter((r) => r.firstShown !== null)
  const mean = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-')
  console.log(
    `queue ${n}: End session appeared in ${shown.length}/${rows.length} sessions` +
      (shown.length ? `, first at pick ${mean(shown.map((r) => r.firstShown))}` : '') +
      `, mean total picks ${mean(rows.map((r) => r.total))}`
  )
}
await b.close()
