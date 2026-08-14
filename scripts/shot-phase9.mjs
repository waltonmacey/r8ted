// Phase 9 verification and screenshots. Each of the five changes is checked by
// measurement, not only photographed, because four of them are geometry fixes
// and one of them reorders data.

import { browser, openApp, shot, shotFull, box, pageMetrics, MOBILE, DESKTOP } from './shot-lib.mjs'

const DIR = process.env.SHOT_DIR || '/home/claude/shots9'

async function toPointGuards(page) {
  await page.getByRole('link', { name: /Food & Sports/i }).first().click()
  await page.getByRole('link', { name: /Athletes & Legends/i }).first().click()
  await page.getByRole('link', { name: /Point Guards/i }).first().click()
  await page.waitForTimeout(400)
}

const b = await browser()

// ---- item 2: the edit gate is centred in the viewport now ----

for (const [tag, vp] of [['mobile', MOBILE], ['desktop', DESKTOP]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5175/r8ted/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Edit$/ }).first().click()
  await page.waitForTimeout(250)
  const overlay = await box(page, 'div.fixed.inset-0')
  const panel = await box(page, 'div.fixed.inset-0 > div')
  const m = await pageMetrics(page)
  const centre = panel.y + panel.h / 2
  console.log(
    `[item 2] ${tag}: overlay ${overlay.w}x${overlay.h}, panel centre y=${centre}, ` +
      `viewport centre ${m.innerHeight / 2}, off by ${Math.abs(centre - m.innerHeight / 2).toFixed(0)}px`
  )
  await shot(page, DIR, `${tag}-21-editgate-after`)
  await ctx.close()
}

// ---- item 1: four column contender grid ----

{
  const { ctx, page } = await openApp(b, MOBILE)
  await page.getByRole('link', { name: /Story & Screen/i }).first().click()
  await page.getByRole('link', { name: /TV & Anime/i }).first().click()
  await page.getByRole('link', { name: /New list/i }).first().click()
  await page.getByPlaceholder('Point Guards').fill('Sitcoms')
  await page.locator('label').filter({ hasText: 'Sitcoms' }).first().click()
  await page.getByRole('button', { name: /Create and pick contenders/i }).click()
  await page.getByRole('heading', { name: /Pick your contenders/i }).waitFor()
  await page.waitForTimeout(400)
  const g = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('main button[aria-pressed]')]
    const t = tiles[0].getBoundingClientRect()
    const bar = document.querySelector('div.fixed.inset-x-0.bottom-0').getBoundingClientRect()
    const rows = new Set(tiles.map((x) => Math.round(x.getBoundingClientRect().y))).size
    const visible = tiles.filter((x) => {
      const r = x.getBoundingClientRect()
      return r.top >= 0 && r.bottom <= bar.top
    }).length
    // does any tile clip its name to fewer glyphs than the shortest sensible cut?
    const clipped = tiles.filter((x) => {
      const p = x.querySelector('p')
      return p.scrollHeight > p.clientHeight + 1
    }).length
    return {
      tiles: tiles.length, rows, w: Math.round(t.width), h: Math.round(t.height),
      visible, clipped, doc: document.documentElement.scrollHeight, vh: window.innerHeight,
    }
  })
  console.log(
    `[item 1] ${g.tiles} tiles in ${g.rows} rows at ${g.w}x${g.h}px, ` +
      `${g.visible} of ${g.tiles} fully visible (was 6 of 15), ` +
      `${g.clipped} names clamped past two lines, document ${g.doc}px = ${(g.doc / g.vh).toFixed(2)} screens`
  )
  await shot(page, DIR, 'mobile-10-picker-4col')
  await shotFull(page, DIR, 'mobile-11-picker-4col-full')
  await ctx.close()
}
{
  const { ctx, page } = await openApp(b, DESKTOP)
  await page.getByRole('link', { name: /Story & Screen/i }).first().click()
  await page.getByRole('link', { name: /TV & Anime/i }).first().click()
  await page.getByRole('link', { name: /New list/i }).first().click()
  await page.getByPlaceholder('Point Guards').fill('Sitcoms')
  await page.locator('label').filter({ hasText: 'Sitcoms' }).first().click()
  await page.getByRole('button', { name: /Create and pick contenders/i }).click()
  await page.getByRole('heading', { name: /Pick your contenders/i }).waitFor()
  await page.waitForTimeout(400)
  await shot(page, DIR, 'desktop-10-picker-unchanged')
  await ctx.close()
}

// ---- item 4 and item 5: list page crop and reorder ----

for (const [tag, vp] of [['mobile', MOBILE], ['desktop', DESKTOP]]) {
  const { ctx, page } = await openApp(b, vp)
  await toPointGuards(page)
  const crop = await page.evaluate(() => {
    const img = document.querySelector('section img')
    const cs = getComputedStyle(img)
    const r = img.getBoundingClientRect()
    const scale = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight)
    const rendered = { w: img.naturalWidth * scale, h: img.naturalHeight * scale }
    const overflow = rendered.h - r.height
    return {
      objectPosition: cs.objectPosition,
      box: `${Math.round(r.width)}x${Math.round(r.height)}`,
      renderedH: Math.round(rendered.h),
      overflow: Math.round(overflow),
      sourceRows: `${Math.round(overflow / 2 / scale)} to ${Math.round((overflow / 2 + r.height) / scale)} of ${img.naturalHeight}`,
    }
  })
  console.log(`[item 4] ${tag} list header:`, crop)
  await shot(page, DIR, `${tag}-41-listheader-after`)

  // reorder: read the top two names, nudge rank 2 up, confirm they swapped
  const namesBefore = await page.locator('section h3').allInnerTexts()
  const ups = page.getByRole('button', { name: /Move up one rank/i })
  const n = await ups.count()
  await ups.nth(1).click()
  await page.waitForTimeout(500)
  const namesAfter = await page.locator('section h3').allInnerTexts()
  console.log(
    `[item 5] ${tag}: ${n} up controls rendered. ` +
      `rank 1 and 2 before: ${namesBefore.slice(0, 2).join(', ')} / after nudging rank 2 up: ${namesAfter.slice(0, 2).join(', ')} / ` +
      (namesBefore[0] === namesAfter[1] && namesBefore[1] === namesAfter[0] ? 'SWAPPED' : 'NO SWAP')
  )
  const ends = await page.evaluate(() => {
    const ups = [...document.querySelectorAll('button[aria-label="Move up one rank"]')]
    const downs = [...document.querySelectorAll('button[aria-label="Move down one rank"]')]
    return { firstUpDisabled: ups[0]?.disabled, lastDownDisabled: downs[downs.length - 1]?.disabled }
  })
  console.log(`[item 5] ${tag} ends:`, ends)
  await shot(page, DIR, `${tag}-51-list-reorder-chevrons`)
  await shotFull(page, DIR, `${tag}-52-list-reorder-full`)

  // featured hero, which needs a list featured first
  await page.getByRole('button', { name: /Feature on home/i }).click()
  await page.waitForTimeout(300)
  await page.getByRole('link', { name: /^Home$/ }).first().click()
  await page.waitForTimeout(600)
  const hero = await page.evaluate(() => {
    const img = document.querySelector('section img')
    if (!img) return null
    return { objectPosition: getComputedStyle(img).objectPosition }
  })
  console.log(`[item 4] ${tag} featured hero:`, hero)
  await shot(page, DIR, `${tag}-42-featured-hero-after`)
  await ctx.close()
}

// ---- the duel, now single layout ----

for (const [tag, vp] of [['mobile', MOBILE], ['desktop', DESKTOP]]) {
  const { ctx, page } = await openApp(b, vp)
  await toPointGuards(page)
  await page.getByRole('link', { name: /Duel session/i }).first().click()
  await page.waitForTimeout(600)
  const d = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('main button.group')]
    const a = cards[0].getBoundingClientRect()
    const c = cards[1].getBoundingClientRect()
    return {
      switcher: document.body.innerText.includes('LAYOUT') || document.body.innerText.includes('Layout'),
      a: `y=${Math.round(a.y)} h=${Math.round(a.height)} w=${Math.round(a.width)}`,
      c: `y=${Math.round(c.y)} h=${Math.round(c.height)} w=${Math.round(c.width)}`,
      sameRow: Math.abs(a.y - c.y) < 2,
      bothAboveFold: a.bottom <= window.innerHeight && c.bottom <= window.innerHeight,
      doc: document.documentElement.scrollHeight,
      vh: window.innerHeight,
    }
  })
  console.log(`[duel] ${tag}:`, d)
  await shot(page, DIR, `${tag}-60-duel-locked`)
  await ctx.close()
}

await b.close()
console.log('\ndone')
