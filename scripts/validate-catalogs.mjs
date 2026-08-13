// Validates every catalog JSON in src/catalogs/ against the catalog format.
// Usage: node scripts/validate-catalogs.mjs [--urls]
// --urls also checks that every imageUrl actually resolves.
// Items may carry an optional `meta` object, a flat map of label to string,
// which suggestKeyStat joins into the key stat line on ranks 1 to 8.
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
const metaKeyTally = new Map();

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
  let withMeta = 0;
  const metaKeys = new Set();
  for (const it of cat.items) {
    if (!it.name) { err(f, 'item missing name'); continue; }
    if (names.has(it.name)) err(f, `duplicate item name "${it.name}"`);
    names.add(it.name);
    if (it.imageUrl === undefined) err(f, `item "${it.name}" missing imageUrl field`);
    else if (it.imageUrl === '') missingImages++;
    else if (!/^https:\/\//.test(it.imageUrl)) err(f, `item "${it.name}" imageUrl is not https`);
    else if (checkUrls) allItems.push({ f, name: it.name, url: it.imageUrl });

    // meta is optional, but when present it has to be a flat object of
    // non-empty strings, because suggestKeyStat joins its values straight into
    // the card. A nested object or a number would render as [object Object].
    if (it.meta !== undefined) {
      if (it.meta === null || typeof it.meta !== 'object' || Array.isArray(it.meta)) {
        err(f, `item "${it.name}" meta is not an object`);
      } else {
        const keys = Object.keys(it.meta);
        if (keys.length === 0) err(f, `item "${it.name}" has an empty meta object, omit the key instead`);
        for (const k of keys) {
          metaKeys.add(k);
          const v = it.meta[k];
          if (typeof v !== 'string') err(f, `item "${it.name}" meta.${k} is ${typeof v}, expected string`);
          else if (v.trim() === '') err(f, `item "${it.name}" meta.${k} is blank`);
        }
        if (keys.length > 0) withMeta++;
      }
    }
  }

  // A catalog where only some items carry meta produces a list where some
  // cards show a key stat and some do not, which reads as a bug rather than as
  // missing data. Warn rather than error so a part filled catalog still ships.
  if (withMeta > 0 && withMeta < cat.items.length) {
    warn(f, `${withMeta} of ${cat.items.length} items carry meta, so key stats will be uneven`);
  }
  if (metaKeys.size > 0) metaKeyTally.set(f, [...metaKeys].join(', '));
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
console.log(`${metaKeyTally.size} catalog(s) carry meta`);
const uncovered = VALID_SUBS.filter(s => !subsCovered.has(s));
if (uncovered.length) console.log(`subcategories with zero catalogs: ${uncovered.join(', ')}`);
process.exit(errors ? 1 : 0);
