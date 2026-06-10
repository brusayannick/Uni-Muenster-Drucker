/**
 * Geocoding script — resolves street addresses to lat/lng via Nominatim (OSM).
 * Deduplicates: identical street+house_number is geocoded only once, then
 * written to all rows sharing that address.
 *
 * Usage:
 *   node geocode.js              # geocode addresses that still have no coords
 *   node geocode.js --force      # re-geocode every address (overwrite existing)
 *   node geocode.js --id 42      # geocode a single printer by id
 *
 * Nominatim fair-use: max 1 request/second, User-Agent must identify the app.
 */

const db = require('./db');

const NOMINATIM  = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'PrintMapMuenster/1.0 (brusayannick@gmail.com)';
const DELAY_MS   = 1100;

const args      = process.argv.slice(2);
const FORCE     = args.includes('--force');
const ID_IDX    = args.indexOf('--id');
const TARGET_ID = ID_IDX !== -1 ? parseInt(args[ID_IDX + 1], 10) : null;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function nominatim(street, houseNumber) {
  const url = new URL(NOMINATIM);
  const streetStr = [street, houseNumber].filter(Boolean).join(' ');

  url.searchParams.set('street',     streetStr);
  url.searchParams.set('city',       'Münster');
  url.searchParams.set('state',      'Nordrhein-Westfalen');
  url.searchParams.set('country',    'Germany');
  url.searchParams.set('format',     'json');
  url.searchParams.set('limit',      '1');
  url.searchParams.set('addressdetails', '0');

  const res = await fetch(url.toString(), { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

const updateByAddress = db.prepare(`
  UPDATE printers
     SET lat = ?, lng = ?, updated_at = CURRENT_TIMESTAMP
   WHERE street = ? AND COALESCE(house_number, '') = COALESCE(?, '')
`);

const updateById = db.prepare(`
  UPDATE printers
     SET lat = ?, lng = ?, updated_at = CURRENT_TIMESTAMP
   WHERE id = ?
`);

async function run() {
  let targets;

  if (TARGET_ID) {
    // Single-row mode: geocode by id, update only that row
    const p = db.prepare('SELECT * FROM printers WHERE id = ?').get(TARGET_ID);
    if (!p) { console.error(`No printer with id ${TARGET_ID}`); process.exit(1); }

    console.log(`Geocoding id=${TARGET_ID}: ${p.street} ${p.house_number || ''}`);
    const result = await nominatim(p.street, p.house_number);
    if (result) {
      updateById.run(result.lat, result.lng, TARGET_ID);
      console.log(`✓ ${result.lat}, ${result.lng}`);
    } else {
      console.warn('✗ No results from Nominatim');
    }
    return;
  }

  // Deduplicated address mode: group rows by unique (street, house_number)
  const whereClause = FORCE
    ? "WHERE street IS NOT NULL"
    : "WHERE lat IS NULL AND street IS NOT NULL";

  targets = db.prepare(`
    SELECT street, house_number, COUNT(*) as n
      FROM printers
     ${whereClause}
     GROUP BY street, house_number
     ORDER BY street, house_number
  `).all();

  if (!targets.length) {
    console.log('Nothing to geocode.');
    return;
  }

  const totalRows = targets.reduce((s, t) => s + t.n, 0);
  console.log(`${targets.length} unique addresses → ${totalRows} printer rows\n`);

  let ok = 0, fail = 0;

  for (let i = 0; i < targets.length; i++) {
    const { street, house_number, n } = targets[i];
    const label = `[${String(i + 1).padStart(3)}/${targets.length}] ${street} ${house_number || ''}`.trimEnd();

    try {
      const result = await nominatim(street, house_number);
      if (result) {
        updateByAddress.run(result.lat, result.lng, street, house_number);
        console.log(`✓ ${label}  →  ${result.lat}, ${result.lng}  (${n} row${n > 1 ? 's' : ''})`);
        ok++;
      } else {
        console.warn(`✗ ${label}  →  no Nominatim result`);
        fail++;
      }
    } catch (err) {
      console.error(`✗ ${label}  →  ${err.message}`);
      fail++;
    }

    if (i < targets.length - 1) await sleep(DELAY_MS);
  }

  const mappedRows = targets
    .filter((_, i) => /* track ok addresses */ true)
    .reduce((s, t) => s + t.n, 0);

  console.log(`\nDone: ${ok}/${targets.length} addresses geocoded (${fail} failed)`);
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
