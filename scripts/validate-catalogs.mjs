// Validates every catalog JSON in src/catalogs/ against the catalog format.
// Usage: node scripts/validate-catalogs.mjs [--urls]
// --urls also checks that every imageUrl actually resolves.
// Exit code 1 on any error so this can gate a deploy script.

import fs from 'node:fs';
import path from 'node:path';

const VALID_SUBS = [
  'movies', 'tv-anime', 'books-comics', 'characters',
  'music-audio', 'gaming-nostalgia', 'internet-apps', 'hobbies-activities',
  'food-drink', 'restaurants', 'athletes-legends', 'teams-dynasties',
  'cities-travel', 'outdoors-parks', 'gear-tech', 'style-brands',
];

const checkUrls = process.argv.includes('--urls');
const dir = path.join(process.cwd(), 'src', 'catalogs');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();

let errors = 0, warnings = 0, missingImages = 0;
const seenIds = new Set();
const subsCovered = new Set();
const allItems = [];

const err = (f, msg) => { console.error(`ERROR ${f}: ${msg}`); errors++; };
const warn = (f, msg) => { console.warn(`warn  ${f}: ${msg}`); warnings++; };

for (const f of files) {
  let cat;
  try {
    cat = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  } catch (e) {
    err(f, `invalid JSON: ${e.message}`);
    continue;
  }
  if (!cat.id) err(f, 'missing id');
  else {
    if (cat.id !== f.replace(/\.json$/, '')) err(f, `id "${cat.id}" does not match filename`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(cat.id)) err(f, `id "${cat.id}" is not kebab-case`);
    if (seenIds.has(cat.id)) err(f, `duplicate id "${cat.id}"`);
    seenIds.add(cat.id);
  }
  if (!cat.name) err(f, 'missing name');
  if (!Array.isArray(cat.subcategories) || cat.subcategories.length === 0) {
    err(f, 'missing subcategories');
  } else {
    for (const s of cat.subcategories) {
      if (!VALID_SUBS.includes(s)) err(f, `unknown subcategory "${s}"`);
      else subsCovered.add(s);
    }
  }
  if (!Array.isArray(cat.items) || cat.items.length === 0) {
    err(f, 'no items');
    continue;
  }
  if (cat.items.length < 10) warn(f, `only ${cat.items.length} items (guide says 10 to 20)`);
  if (cat.items.length > 25) err(f, `${cat.items.length} items exceeds hard ceiling of 25`);
  const names = new Set();
  for (const it of cat.items) {
    if (!it.name) { err(f, 'item missing name'); continue; }
    if (names.has(it.name)) err(f, `duplicate item name "${it.name}"`);
    names.add(it.name);
    if (it.imageUrl === undefined) err(f, `item "${it.name}" missing imageUrl field`);
    else if (it.imageUrl === '') missingImages++;
    else if (!/^https:\/\//.test(it.imageUrl)) err(f, `item "${it.name}" imageUrl is not https`);
    else if (checkUrls) allItems.push({ f, name: it.name, url: it.imageUrl });
  }
}

if (checkUrls) {
  console.log(`checking ${allItems.length} image URL(s)...`);
  const results = await Promise.allSettled(allItems.map(async ({ f, name, url }) => {
    const res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
    if (!res.ok && res.status !== 206) throw new Error(`${res.status} ${name} in ${f}: ${url}`);
  }));
  for (const r of results) {
    if (r.status === 'rejected') err('urls', r.reason.message);
  }
}

console.log(`\n${files.length} catalog file(s), ${errors} error(s), ${warnings} warning(s), ${missingImages} item(s) missing images`);
const uncovered = VALID_SUBS.filter(s => !subsCovered.has(s));
if (uncovered.length) console.log(`subcategories with zero catalogs: ${uncovered.join(', ')}`);
process.exit(errors ? 1 : 0);
