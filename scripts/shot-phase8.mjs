// Phase 8 screenshots. Every surface that changed, at 390 and 1280.
//
// Naming is {desktop|mobile}-NN-description so both widths of a state sort
// together in the folder. The four item B alternatives are 10 through 13 so
// they sort adjacently, with 00 the before.

import { browser, openApp, shot, shotFull, box, pageMetrics, MOBILE, DESKTOP } from './shot-lib.mjs'

const DIR = process.env.SHOT_DIR || '/home/claude/shots'

// Home > Story & Screen > TV & Anime > + New list. Clicked, never page.goto'd:
// edit mode is in-memory React state.
async function newSitcomsList(page) {
  await page.getByRole('link', { name: /Story & Screen/i }).first().click()
  await page.getByRole('link', { name: /TV & Anime/i }).first().click()
  await page.getByRole('link', { name: /New list/i }).first().click()
  await page.getByPlaceholder('Point Guards').fill('Sitcoms')
  await page.getByPlaceholder(/floor generals/i).fill('The ones that hold up.')
  // TV & Anime carries three catalogs; Sitcoms is the 15 item one, so it is the
  // only catalog in the library where the ceiling of 15 is reachable.
  await page.locator('label').filter({ hasText: 'Sitcoms' }).first().click()
  await page.waitForTimeout(150)
}

// Tiles are indexed in catalog order; clicking one already picked deselects it,
// so ranges here are half open and must not overlap.
async function pickRange(page, from, to) {
  const tiles = page.locator('main button[aria-pressed]')
  for (let i = from; i < to; i++) await tiles.nth(i).click()
  await page.waitForTimeout(120)
}

async function intoPointGuardsDuel(page, layout) {
  await page.getByRole('link', { name: /Food & Sports/i }).first().click()
  await page.getByRole('link', { name: /Athletes & Legends/i }).first().click()
  await page.getByRole('link', { name: /Point Guards/i }).first().click()
  await page.getByRole('link', { name: /Duel session/i }).first().click()
  await page.waitForTimeout(500)
  if (layout) {
    await page.getByRole('link', { name: new RegExp(`^${layout} `) }).click()
    await page.waitForTimeout(400)
  }
}

const b = await browser()
const log = []

// ---------- item A: the contender picker ----------

for (const [tag, vp] of [['mobile', MOBILE], ['desktop', DESKTOP]]) {
  const { ctx, page } = await openApp(b, vp)
  await newSitcomsList(page)
  await shotFull(page, DIR, `${tag}-01-newlist-form`)
  await page.getByRole('button', { name: /Create and pick contenders/i }).click()
  await page.getByRole('heading', { name: /Pick your contenders/i }).waitFor()
  await page.waitForTimeout(400)
  await shot(page, DIR, `${tag}-02-picker-empty`)
  await pickRange(page, 0, 7)
  await shot(page, DIR, `${tag}-03-picker-one-short`)
  await pickRange(page, 7, 8)
  await shot(page, DIR, `${tag}-04-picker-unlocked-8`)
  await pickRange(page, 8, 15)
  await shotFull(page, DIR, `${tag}-05-picker-at-cap-15`)

  const m = await pageMetrics(page)
  const tile = await box(page, 'main button[aria-pressed]')
  const bar = await box(page, 'div.fixed.inset-x-0.bottom-0')
  log.push(`${tag} picker: viewport ${m.innerWidth}x${m.innerHeight} document ${m.scrollHeight}px tile ${tile.w}x${tile.h} confirm bar h=${bar?.h}`)

  // Straight through into the session the picker built.
  await page.getByRole('button', { name: /Rank 15 items/i }).click()
  await page.waitForTimeout(600)
  await shot(page, DIR, `${tag}-06-session-from-picker`)
  await ctx.close()
}

// ---------- item B: the four alternatives ----------

const ALTS = [
  [1, '10', 'alt1-shrunk-side-by-side'],
  [2, '11', 'alt2-fullbleed-vertical'],
  [3, '12', 'alt3-fullbleed-horizontal'],
  [4, '13', 'alt4-compact-rows'],
]

for (const [tag, vp] of [['mobile', MOBILE], ['desktop', DESKTOP]]) {
  for (const [layout, nn, name] of ALTS) {
    const { ctx, page } = await openApp(b, vp)
    await intoPointGuardsDuel(page, layout)
    await shot(page, DIR, `${tag}-${nn}-duel-${name}`)
    if (tag === 'mobile') {
      const m = await pageMetrics(page)
      const cards = await page.locator('main button.group').count()
      const a0 = await box(page, 'main button.group', 0)
      const a1 = await box(page, 'main button.group', 1)
      log.push(
        `mobile layout ${layout} (${name}): document ${m.scrollHeight}px scrolls=${m.scrolls} ` +
          `targets=${cards} ` +
          (a0 ? `A y=${a0.y} h=${a0.h} w=${a0.w} belowFold=${a0.belowFold} ` : '') +
          (a1 ? `B y=${a1.y} h=${a1.h} w=${a1.w} belowFold=${a1.belowFold}` : '')
      )
    }
    await ctx.close()
  }
}

// ---------- the collapsed chip strip, expanded ----------

{
  const { ctx, page } = await openApp(b, MOBILE)
  await intoPointGuardsDuel(page, 1)
  await page.getByRole('button', { name: /ranking/i }).first().click()
  await page.waitForTimeout(300)
  await shot(page, DIR, 'mobile-14-strip-expanded')
  await ctx.close()
}

await b.close()
console.log(log.join('\n'))
console.log('\ndone')
