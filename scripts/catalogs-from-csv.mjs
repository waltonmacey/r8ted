// Converts the catalog builder CSV exports into catalog JSON files.
// Usage: node scripts/catalogs-from-csv.mjs catalogs.csv items.csv
// Writes one JSON per non-empty catalog into src/catalogs/, skips catalogs
// with zero items, skips example rows, overwrites same-id files.
//
// META. The Catalogs sheet carries meta_1_label and meta_2_label per catalog
// and the Items sheet carries meta_1 and meta_2 per item, so meta is emitted
// as an object keyed by that catalog's labels:
//
//   { "name": "Interstellar", "imageUrl": "...",
//     "meta": { "year": "2014", "note": "Space / relativity" } }
//
// An item with both values blank gets no meta key at all rather than an empty
// object, so suggestKeyStat sees undefined and returns an empty string. A
// value present with no label for its column is dropped and warned about,
// since an unlabelled value has nothing to key on.

import fs from 'node:fs';
import path from 'node:path';

const [, , catalogsCsv, itemsCsv] = process.argv;
if (!catalogsCsv || !itemsCsv) {
  console.error('Usage: node scripts/catalogs-from-csv.mjs catalogs.csv items.csv');
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(v => v !== '')) rows.push(row);
  return rows;
}

const isExample = (v) => /example/i.test(v || '');

const catRows = parseCsv(fs.readFileSync(catalogsCsv, 'utf8'));
const itemRows = parseCsv(fs.readFileSync(itemsCsv, 'utf8'));

// Catalogs sheet: domain, subcategory_id, catalog_id, catalog_name, notes,
// items_entered, meta_1_label, meta_2_label
const catalogs = new Map();
for (const r of catRows.slice(1)) {
  const [, sub, id, name, , , label1, label2] = r.map(v => (v || '').trim());
  if (!id || isExample(id) || isExample(name)) continue;
  catalogs.set(id, { id, name, subcategories: [sub], labels: [label1, label2], items: [] });
}

// Items sheet: catalog_id, item_name, image_url, meta_1, meta_2
let unlabelled = 0;
for (const r of itemRows.slice(1)) {
  const [id, itemName, imageUrl, meta1, meta2] = r.map(v => (v || '').trim());
  if (!id || !itemName || isExample(id) || isExample(itemName)) continue;
  const cat = catalogs.get(id);
  if (!cat) {
    console.warn(`skipped item "${itemName}": unknown catalog_id "${id}"`);
    continue;
  }
  const item = { name: itemName, imageUrl: imageUrl || '' };
  const meta = {};
  for (const [label, value] of [[cat.labels[0], meta1], [cat.labels[1], meta2]]) {
    if (!value) continue;
    if (!label) { unlabelled++; continue; }
    meta[label] = value;
  }
  if (Object.keys(meta).length > 0) item.meta = meta;
  cat.items.push(item);
}
if (unlabelled > 0) {
  console.warn(`dropped ${unlabelled} meta value(s) whose catalog has no label for that column`);
}

const outDir = path.join(process.cwd(), 'src', 'catalogs');
fs.mkdirSync(outDir, { recursive: true });

let written = 0, skipped = 0, withMeta = 0;
for (const cat of catalogs.values()) {
  if (cat.items.length === 0) { skipped++; continue; }
  // `labels` is converter scaffolding, not part of the catalog format.
  const { labels, ...out } = cat;
  const file = path.join(outDir, `${cat.id}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  const metaCount = cat.items.filter(i => i.meta).length;
  withMeta += metaCount;
  console.log(`wrote ${path.relative(process.cwd(), file)} (${cat.items.length} items, ${metaCount} with meta)`);
  written++;
}
console.log(`${written} catalog(s) written, ${skipped} empty catalog(s) skipped, ${withMeta} item(s) carry meta`);
