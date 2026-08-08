// Catalogs are static JSON files discovered at build time.
// Drop a new file in src/catalogs/ and it appears in the creation flow. No code changes.
//
// Catalog JSON format:
// {
//   "id": "point-guards",
//   "name": "NBA Point Guards",
//   "subcategories": ["sports", "goat"],   // taxonomy sub ids this catalog is offered under
//   "items": [
//     { "name": "Allen Iverson", "imageUrl": "", "meta": { "years": "1996-2010", "team": "76ers" } }
//   ]
// }
// meta fields are optional and can feed keyStat suggestions.

const modules = import.meta.glob('../catalogs/*.json', { eager: true })

const catalogs = Object.values(modules)
  .map((m) => m.default || m)
  .filter((c) => c && c.id && Array.isArray(c.items))

export function allCatalogs() {
  return catalogs
}

export function catalogsForSubcategory(subId) {
  return catalogs.filter((c) => !c.subcategories || c.subcategories.includes(subId))
}

export function getCatalog(id) {
  return catalogs.find((c) => c.id === id) || null
}

// Suggest a keyStat string from catalog item metadata, if any.
export function suggestKeyStat(item) {
  if (!item?.meta) return ''
  const parts = Object.values(item.meta).filter(Boolean)
  return parts.join(' | ')
}
