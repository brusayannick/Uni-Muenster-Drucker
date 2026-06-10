const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'printers.db'));

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA synchronous = NORMAL`);
db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS printers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    street        TEXT,
    house_number  TEXT,
    zip           TEXT DEFAULT '48143',
    district      TEXT,
    lat           REAL,
    lng           REAL,
    type          TEXT DEFAULT 'general',
    status        TEXT DEFAULT 'active',
    opening_hours TEXT,
    phone         TEXT,
    notes         TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_status ON printers(status);
  CREATE INDEX IF NOT EXISTS idx_type   ON printers(type);
`);

module.exports = db;
