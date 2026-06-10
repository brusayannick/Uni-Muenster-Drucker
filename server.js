const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ALLOWED_FIELDS = ['name', 'street', 'house_number', 'zip', 'district', 'lat', 'lng', 'type', 'status', 'opening_hours', 'phone', 'notes'];

app.get('/api/printers', (req, res) => {
  const { status, type, search } = req.query;
  let query = 'SELECT * FROM printers WHERE 1=1';
  const params = [];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }
  if (type && type !== 'all') {
    query += ' AND type = ?';
    params.push(type);
  }
  if (search) {
    query += ' AND (name LIKE ? OR street LIKE ? OR district LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY name ASC';
  res.json(db.prepare(query).all(...params));
});

app.get('/api/printers/:id', (req, res) => {
  const printer = db.prepare('SELECT * FROM printers WHERE id = ?').get(req.params.id);
  if (!printer) return res.status(404).json({ error: 'Not found' });
  res.json(printer);
});

app.post('/api/printers', (req, res) => {
  const fields = ALLOWED_FIELDS.filter(f => req.body[f] !== undefined);
  if (!req.body.name) return res.status(400).json({ error: 'name is required' });

  const cols = fields.join(', ');
  const placeholders = fields.map(() => '?').join(', ');
  const values = fields.map(f => req.body[f]);

  const result = db.prepare(`INSERT INTO printers (${cols}) VALUES (${placeholders})`).run(...values);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.patch('/api/printers/:id', (req, res) => {
  const updates = ALLOWED_FIELDS.filter(f => req.body[f] !== undefined);
  if (!updates.length) return res.status(400).json({ error: 'No valid fields provided' });

  const set = updates.map(f => `${f} = ?`).join(', ');
  const values = updates.map(f => req.body[f]);
  db.prepare(`UPDATE printers SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/printers/:id', (req, res) => {
  db.prepare('DELETE FROM printers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/stats', (_req, res) => {
  const total   = db.prepare('SELECT COUNT(*) as n FROM printers').get().n;
  const active  = db.prepare("SELECT COUNT(*) as n FROM printers WHERE status = 'active'").get().n;
  const mapped  = db.prepare('SELECT COUNT(*) as n FROM printers WHERE lat IS NOT NULL').get().n;
  const byType  = db.prepare("SELECT type, COUNT(*) as n FROM printers GROUP BY type").all();
  res.json({ total, active, mapped, byType });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Print Map → http://localhost:${PORT}`));
