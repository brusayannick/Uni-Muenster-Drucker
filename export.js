/* Exports all printers from the SQLite DB to a static JSON file that the
   frontend loads directly. This is what makes the app deployable as a pure
   static site (e.g. Vercel) with no server or database at runtime.

   Workflow after changing data locally:
     npm run export      # regenerates public/data/printers.json
     git commit + push   # Vercel redeploys automatically

   NOTE: exports ALL fields, including contact_name / email / hostname /
   serial_number. To keep sensitive fields out of the public file, add their
   names to OMIT_FIELDS below and re-run. */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const OMIT_FIELDS = []; // e.g. ['email', 'contact_name', 'hostname', 'serial_number']

const db = new DatabaseSync(path.join(__dirname, 'printers.db'));

// Flush any WAL contents into the main db file so the export is complete.
db.exec('PRAGMA wal_checkpoint(TRUNCATE)');

const rows = db.prepare('SELECT * FROM printers ORDER BY name ASC').all();

const printers = rows.map(row => {
  const o = { ...row };
  for (const f of OMIT_FIELDS) delete o[f];
  return o;
});

const outDir = path.join(__dirname, 'public', 'data');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'printers.json');
fs.writeFileSync(outFile, JSON.stringify(printers));

console.log(`Exported ${printers.length} printers → public/data/printers.json`);
