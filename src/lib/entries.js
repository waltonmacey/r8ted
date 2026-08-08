// Composite = (s1 + s2 + s3 + s4) / 4, shown to 2 decimals.
// Entries with null scores live on the Bench and never rank.

export function composite(scores) {
  if (!isScored(scores)) return null
  const sum = scores.reduce((a, b) => a + Number(b), 0)
  return sum / 4
}

export function compositeText(scores) {
  const c = composite(scores)
  return c === null ? null : c.toFixed(2)
}

export function isScored(scores) {
  return (
    Array.isArray(scores) &&
    scores.length === 4 &&
    scores.every((s) => s !== null && s !== undefined && s !== '' && !Number.isNaN(Number(s)))
  )
}

export function rankedEntries(entries) {
  return entries
    .filter((e) => isScored(e.scores))
    .slice()
    .sort((a, b) => composite(b.scores) - composite(a.scores))
}

export function benchEntries(entries) {
  return entries.filter((e) => !isScored(e.scores))
}

export function clampScore(v) {
  const n = Number(v)
  if (Number.isNaN(n)) return 0
  return Math.min(10, Math.max(0, Math.round(n * 2) / 2))
}

export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Monochrome placeholder: initials on a dark gradient, as an SVG data URI.
// Used until a catalog supplies real imagery.
export function placeholderImage(name) {
  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  const seed = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0)
  const g1 = 18 + (seed % 20)
  const g2 = 40 + (seed % 30)
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='500'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='rgb(${g1},${g1},${g1})'/>
      <stop offset='1' stop-color='rgb(${g2},${g2},${g2})'/>
    </linearGradient></defs>
    <rect width='400' height='500' fill='url(#g)'/>
    <text x='200' y='265' font-family='Space Grotesk, sans-serif' font-size='120'
      fill='rgb(200,200,200)' text-anchor='middle' font-weight='700'>${initials}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function entryImage(entry) {
  return entry.imageUrl || placeholderImage(entry.name)
}
