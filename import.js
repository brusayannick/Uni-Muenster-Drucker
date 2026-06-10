/**
 * Imports Book1.csv into the printers table.
 *
 * - Adds new columns (serial_number, model, hostname, room, contact_name,
 *   email, public_access) if they don't exist yet.
 * - Clears previous rows, then bulk-inserts all CSV rows.
 * - Splits "Aegidiistr. 5" → street="Aegidiistr.", house_number="5".
 * - lat/lng remain NULL; run `node geocode.js` afterwards to fill them.
 *
 * Usage:  node import.js [path/to/Book1.csv]
 */

const fs   = require('fs');
const path = require('path');
const db   = require('./db');

const CSV_PATH = process.argv[2] || path.join(__dirname, 'Book1.csv');

// ── Schema migration ──────────────────────────────────────────────────────────

const NEW_COLS = [
  ['serial_number', 'TEXT'],
  ['model',         'TEXT'],
  ['hostname',      'TEXT'],
  ['room',          'TEXT'],
  ['contact_name',  'TEXT'],
  ['email',         'TEXT'],
  ['public_access', 'INTEGER DEFAULT 0'],
];

const existingCols = db.prepare("PRAGMA table_info(printers)").all().map(r => r.name);
for (const [col, def] of NEW_COLS) {
  if (!existingCols.includes(col)) {
    db.exec(`ALTER TABLE printers ADD COLUMN ${col} ${def}`);
    console.log(`  + added column: ${col}`);
  }
}

// ── CSV parser ────────────────────────────────────────────────────────────────
// Handles semicolon delimiter and optional "quoted; fields" with embedded semicolons.

function parseLine(line) {
  const fields = [];
  let cur = '';
  let inQuote = false;

  for (const ch of line) {
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ';' && !inQuote) {
      fields.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

// ── Street / house-number splitter ────────────────────────────────────────────
// "Am Stadtgraben 13-15" → { street: "Am Stadtgraben", house_number: "13-15" }
// "Albert-Schweitzer-Str." → { street: "Albert-Schweitzer-Str.", house_number: null }

const STREET_RE = /^(.+?)\s+(\d[\d\/\-]*\s*[a-zA-Z]?)$/;

function splitStreet(raw) {
  const m = raw.match(STREET_RE);
  if (m) return { street: m[1].trim(), house_number: m[2].trim() };
  return { street: raw, house_number: null };
}

// ── Read & parse CSV ──────────────────────────────────────────────────────────

const raw   = fs.readFileSync(CSV_PATH, 'utf8');
const lines = raw.split(/\r?\n/).filter(l => l.trim());

// Skip header row
const dataLines = lines.slice(1);

// ── Import ────────────────────────────────────────────────────────────────────

const INSERT = db.prepare(`
  INSERT INTO printers
    (serial_number, model, hostname, name, street, house_number, room,
     contact_name, phone, email, public_access, type, status)
  VALUES
    (@serial_number, @model, @hostname, @name, @street, @house_number, @room,
     @contact_name, @phone, @email, @public_access, 'university', 'active')
`);

db.exec('DELETE FROM printers');  // clear seed data
db.exec('BEGIN');

let ok = 0, skipped = 0;

try {
  for (const line of dataLines) {
    const f = parseLine(line);
    // expect at least 5 meaningful fields
    if (f.length < 5 || !f[0]) { skipped++; continue; }

    const [serial_number, model, hostname, name, rawStreet, room, contact_name, phone, email, pub] = f;
    const { street, house_number } = splitStreet(rawStreet || '');

    INSERT.run({
      serial_number:  serial_number  || null,
      model:          model          || null,
      hostname:       hostname       || null,
      name:           name           || null,
      street:         street         || null,
      house_number:   house_number   || null,
      room:           room           || null,
      contact_name:   contact_name   || null,
      phone:          phone          || null,
      email:          email          || null,
      public_access:  pub?.includes('x') ? 1 : 0,
    });
    ok++;
  }
  db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  throw err;
}

console.log(`\nImported ${ok} printers (${skipped} skipped).`);
console.log(`Run "node geocode.js" to geocode all ${ok} addresses.`);
