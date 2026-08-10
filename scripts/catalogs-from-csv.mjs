// Converts the catalog builder CSV exports into catalog JSON files.
// Usage: node scripts/catalogs-from-csv.mjs catalogs.csv items.csv
// Writes one JSON per non-empty catalog into src/catalogs/, skips catalogs
// with zero items, skips example rows, overwrites same-id files.
// Items are written without meta; meta is a later additive pass.

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

// Catalogs sheet: domain, subcategory_id, catalog_id, catalog_name, notes, items_entered
const catalogs = new Map();
for (const r of catRows.slice(1)) {
  const [, sub, id, name] = r.map(v => (v || '').trim());
  if (!id || isExample(id) || isExample(name)) continue;
  catalogs.set(id, { id, name, subcategories: [sub], items: [] });
}

// Items sheet: catalog_id, item_name, image_url
for (const r of itemRows.slice(1)) {
  const [id, itemName, imageUrl] = r.map(v => (v || '').trim());
  if (!id || !itemName || isExample(id) || isExample(itemName)) continue;
  const cat = catalogs.get(id);
  if (!cat) {
    console.warn(`skipped item "${itemName}": unknown catalog_id "${id}"`);
    continue;
  }
  cat.items.push({ name: itemName, imageUrl: imageUrl || '' });
}

const outDir = path.join(process.cwd(), 'src', 'catalogs');
fs.mkdirSync(outDir, { recursive: true });

let written = 0, skipped = 0;
for (const cat of catalogs.values()) {
  if (cat.items.length === 0) { skipped++; continue; }
  const file = path.join(outDir, `${cat.id}.json`);
  fs.writeFileSync(file, JSON.stringify(cat, null, 2) + '\n');
  console.log(`wrote ${path.relative(process.cwd(), file)} (${cat.items.length} items)`);
  written++;
}
console.log(`${written} catalog(s) written, ${skipped} empty catalog(s) skipped`);
