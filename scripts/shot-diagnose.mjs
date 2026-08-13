// Item B diagnosis. Screenshot the CURRENT mobile duel and measure it, so the
// four alternatives have a before to be compared against and so the kickoff's
// arithmetic is checked against the real build rather than taken on trust.
//
// The kickoff's claim: at 390 width the content column is 358px after 16px
// margins; a 4:5 portrait at full column width is 448px tall on its own; stack
// two of those plus a status line plus the chip strip and the second option
// sits below the fold.

import { browser, openApp, shot, shotFull, box, pageMetrics, MOBILE, DESKTOP } from './shot-lib.mjs'

const DIR = process.env.SHOT_DIR || '/home/claude/shots'

// Home > Food & Sports > Athletes & Legends > Point Guards > Duel session.
// Clicked rather than page.goto'd, because edit mode is in-memory React state
// and a hard navigation drops it.
async function intoDuel(page) {
  await page.getByRole('link', { name: /Food & Sports/i }).first().click()
  await page.getByRole('link', { name: /Athletes & Legends/i }).first().click()
  await page.getByRole('link', { name: /Point Guards/i }).first().click()
  await page.getByRole('link', { name: /Duel session/i }).first().click()
  await page.waitForTimeout(700)
}

async function measure(page, label) {
  const m = await pageMetrics(page)
  const main = await box(page, 'main')
  const cards = await page.locator('main button.group').count()
  const a = await box(page, 'main button.group', 0)
  const b = await box(page, 'main button.group', 1)
  const imgA = await box(page, 'main button.group img', 0)
  const strip = await box(page, 'main section')
  const status = await box(page, 'main p.font-mono')
  console.log(`\n--- ${label} ---`)
  console.log(`viewport ${m.innerWidth}x${m.innerHeight}  document ${m.scrollHeight}px  scrolls: ${m.scrolls}`)
  console.log(`main content column: x=${main.x} w=${main.w}`)
  console.log(`duel cards found: ${cards}`)
  if (a) console.log(`card 1: y=${a.y} h=${a.h} w=${a.w} bottom=${a.bottom} belowFold=${a.belowFold}`)
  if (b) console.log(`card 2: y=${b.y} h=${b.h} w=${b.w} bottom=${b.bottom} belowFold=${b.belowFold}`)
  if (imgA) console.log(`card 1 portrait: ${imgA.w}x${imgA.h}`)
  if (status) console.log(`status line: y=${status.y} h=${status.h}`)
  if (strip) console.log(`chip strip: y=${strip.y} h=${strip.h} bottom=${strip.bottom} belowFold=${strip.belowFold}`)
  return { m, a, b, imgA, strip }
}

const b = await browser()

// mobile
{
  const { ctx, page } = await openApp(b, MOBILE)
  await intoDuel(page)
  await measure(page, 'CURRENT mobile duel, 390 width')
  await shot(page, DIR, 'mobile-00-duel-before-fold')
  await shotFull(page, DIR, 'mobile-00-duel-before-full')
  await ctx.close()
}

// desktop, for the pair
{
  const { ctx, page } = await openApp(b, DESKTOP)
  await intoDuel(page)
  await measure(page, 'CURRENT desktop duel, 1280 width')
  await shotFull(page, DIR, 'desktop-00-duel-before')
  await ctx.close()
}

await b.close()
console.log('\ndone')
