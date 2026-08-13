// Screenshot harness shared by the Phase 8 shot scripts.
//
// Sandbox facts this encodes, carried from Phase 7:
//   fonts.googleapis.com is unreachable, so the four families are injected as
//     data URIs from local @fontsource copies. Without this every measurement
//     of a card height or a line wrap is wrong.
//   media.themoviedb.org is unreachable, so entry imagery always renders the
//     placeholder initials SVG. That is a real limit on judging any layout
//     whose case rests on photography.
//   the build is base '/r8ted/', so the static server has to serve under that
//     prefix or the JS 404s into index.html and the page renders blank.
//   edit mode is in-memory React state, so the gate is clicked once per
//     browser context and navigation is by clicking, not by page.goto.

import { chromium } from 'playwright'
import { fontCss } from './shot-fonts.mjs'

export const BASE = 'http://localhost:5175/r8ted/'
export const DESKTOP = { width: 1280, height: 1400 }
export const MOBILE = { width: 390, height: 844 }

export async function browser() {
  return chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
}

// A fresh context with the fonts injected on every document and edit mode
// already unlocked.
export async function openApp(b, viewport, { fresh = true } = {}) {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: 2 })
  const css = fontCss()
  await ctx.addInitScript((c) => {
    const add = () => {
      const s = document.createElement('style')
      s.textContent = c
      document.head.appendChild(s)
    }
    if (document.head) add()
    else document.addEventListener('DOMContentLoaded', add)
  }, css)
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  if (fresh) {
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload({ waitUntil: 'networkidle' })
  }
  await unlock(page)
  await page.evaluate(() => document.fonts.ready)
  return { ctx, page }
}

// The nav carries a lock toggle. Without Firebase it unlocks on submit with no
// credentials, but the modal still has to be opened and dismissed.
export async function unlock(page) {
  const already = await page.getByRole('button', { name: /Lock edit mode/i }).count()
  if (already > 0) return
  await page.getByRole('button', { name: /^Edit$/ }).first().click()
  await page.getByRole('button', { name: /^Unlock$/ }).click()
  await page.getByRole('button', { name: /Lock edit mode/i }).waitFor({ timeout: 5000 })
  await page.waitForTimeout(200)
}

export async function shot(page, dir, name) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: false })
  return name
}

export async function shotFull(page, dir, name) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
  return name
}

// Geometry of a selector: box plus whether it sits inside the first viewport.
export async function box(page, selector, index = 0) {
  return page.evaluate(
    ([sel, i]) => {
      const el = document.querySelectorAll(sel)[i]
      if (!el) return null
      const r = el.getBoundingClientRect()
      return {
        x: Math.round(r.x), y: Math.round(r.y),
        w: Math.round(r.width), h: Math.round(r.height),
        bottom: Math.round(r.bottom),
        belowFold: r.bottom > window.innerHeight,
      }
    },
    [selector, index]
  )
}

export async function pageMetrics(page) {
  return page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
    scrolls: document.documentElement.scrollHeight > window.innerHeight,
  }))
}
