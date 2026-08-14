// Phase 9 diagnosis. Measure each reported item against the real build before
// prescribing anything.

import { browser, openApp, shot, box, pageMetrics, MOBILE, DESKTOP } from './shot-lib.mjs'

const DIR = process.env.SHOT_DIR || '/home/claude/shots9'

const b = await browser()

// ---- item 2: the edit gate modal position ----

for (const [tag, vp] of [['mobile', MOBILE], ['desktop', DESKTOP]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5175/r8ted/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^Edit$/ }).first().click()
  await page.waitForTimeout(250)
  const overlay = await box(page, 'div.fixed.inset-0')
  const panel = await box(page, 'div.fixed.inset-0 > div')
  const m = await pageMetrics(page)
  console.log(`\n[item 2] ${tag} ${vp.width}x${vp.height}`)
  console.log(`  overlay box: x=${overlay?.x} y=${overlay?.y} w=${overlay?.w} h=${overlay?.h}`)
  console.log(`  panel box:   x=${panel?.x} y=${panel?.y} w=${panel?.w} h=${panel?.h}`)
  console.log(`  panel centre y = ${panel ? panel.y + panel.h / 2 : '?'}, viewport centre = ${m.innerHeight / 2}`)
  console.log(
    '  containing block:',
    await page.evaluate(() => {
      const el = document.querySelector('div.fixed.inset-0')
      let p = el.parentElement
      while (p) {
        const cs = getComputedStyle(p)
        if (cs.transform !== 'none' || cs.filter !== 'none' || cs.backdropFilter !== 'none' || cs.willChange !== 'auto' || cs.perspective !== 'none' || cs.contain.includes('paint')) {
          return `${p.tagName.toLowerCase()}.${p.className.split(' ')[0]} via ${
            cs.backdropFilter !== 'none' ? 'backdrop-filter: ' + cs.backdropFilter : cs.transform !== 'none' ? 'transform' : cs.filter !== 'none' ? 'filter' : 'contain/will-change'
          }`
        }
        p = p.parentElement
      }
      return 'none (viewport)'
    })
  )
  await shot(page, DIR, `${tag}-20-editgate-before`)
  await ctx.close()
}

// ---- item 1: mobile contender grid density ----

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
    const grid = tiles[0].parentElement.getBoundingClientRect()
    const t = tiles[0].getBoundingClientRect()
    const bar = document.querySelector('div.fixed.inset-x-0.bottom-0').getBoundingClientRect()
    const rows = new Set(tiles.map((x) => Math.round(x.getBoundingClientRect().y))).size
    // how many tiles are fully inside the first screen, above the confirm bar
    const visible = tiles.filter((x) => {
      const r = x.getBoundingClientRect()
      return r.top >= 0 && r.bottom <= bar.top
    }).length
    return {
      tiles: tiles.length, rows,
      tile: { w: Math.round(t.width), h: Math.round(t.height) },
      gridTop: Math.round(grid.top),
      barTop: Math.round(bar.top), barH: Math.round(bar.height),
      firstScreenTiles: visible,
      doc: document.documentElement.scrollHeight,
      vh: window.innerHeight,
    }
  })
  console.log(`\n[item 1] mobile contender grid, 15 item catalog`)
  console.log(`  ${g.tiles} tiles in ${g.rows} rows at ${g.tile.w}x${g.tile.h}px`)
  console.log(`  grid starts y=${g.gridTop}, confirm bar occupies ${g.barTop} to ${g.vh} (${g.barH}px)`)
  console.log(`  tiles fully visible without scrolling: ${g.firstScreenTiles} of ${g.tiles}`)
  console.log(`  document ${g.doc}px in a ${g.vh}px viewport = ${(g.doc / g.vh).toFixed(2)} screens`)
  await ctx.close()
}

// ---- item 4: image crop on the featured hero and the list header ----

for (const [tag, vp] of [['desktop', DESKTOP], ['mobile', MOBILE]]) {
  const { ctx, page } = await openApp(b, vp)
  const hero = await page.evaluate(() => {
    const img = document.querySelector('section img')
    if (!img) return null
    const cs = getComputedStyle(img)
    const r = img.getBoundingClientRect()
    return {
      objectFit: cs.objectFit, objectPosition: cs.objectPosition,
      box: `${Math.round(r.width)}x${Math.round(r.height)}`,
      natural: `${img.naturalWidth}x${img.naturalHeight}`,
    }
  })
  console.log(`\n[item 4] ${tag} featured hero image:`, hero)
  await page.getByRole('link', { name: /Food & Sports/i }).first().click()
  await page.getByRole('link', { name: /Athletes & Legends/i }).first().click()
  await page.getByRole('link', { name: /Point Guards/i }).first().click()
  await page.waitForTimeout(400)
  const lh = await page.evaluate(() => {
    const img = document.querySelector('section img')
    if (!img) return null
    const cs = getComputedStyle(img)
    const r = img.getBoundingClientRect()
    return {
      objectFit: cs.objectFit, objectPosition: cs.objectPosition,
      box: `${Math.round(r.width)}x${Math.round(r.height)}`,
      natural: `${img.naturalWidth}x${img.naturalHeight}`,
    }
  })
  console.log(`[item 4] ${tag} list header image:`, lh)
  await shot(page, DIR, `${tag}-40-listheader-before`)
  await ctx.close()
}

// ---- item 5: mobile reorder ----

{
  const { ctx, page } = await openApp(b, MOBILE)
  await page.getByRole('link', { name: /Food & Sports/i }).first().click()
  await page.getByRole('link', { name: /Athletes & Legends/i }).first().click()
  await page.getByRole('link', { name: /Point Guards/i }).first().click()
  await page.waitForTimeout(400)
  const r = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[draggable="true"]')]
    return {
      draggableSlots: cards.length,
      anyTouchHandlers: cards.some(
        (c) => c.ontouchstart || c.ontouchmove || c.getAttribute('data-reorder') !== null
      ),
      hasArrowButtons: [...document.querySelectorAll('button')].some((b) =>
        /move up|move down|▲|▼/i.test(b.textContent + (b.getAttribute('aria-label') || ''))
      ),
      pointerEventsSupported: 'onpointerdown' in window,
    }
  })
  console.log(`\n[item 5] mobile list page reorder:`, r)
  await shot(page, DIR, 'mobile-50-list-before')
  await ctx.close()
}

await b.close()
console.log('\ndone')
