import express from 'express';
import db from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { month, date } = req.query;
  let sql = 'SELECT * FROM expenses WHERE 1=1';
  const params = [];
  if (month) { sql += ' AND substr(date,1,7) = ?'; params.push(month); }
  if (date) { sql += ' AND date = ?'; params.push(date); }
  sql += ' ORDER BY date DESC, id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  const { date, category, amount, note, created_by } = req.body;
  if (!date || !category || amount == null) return res.status(400).json({ error: 'date, category, amount required' });
  const info = db.prepare('INSERT INTO expenses (date,category,amount,note,created_by) VALUES (?,?,?,?,?)')
    .run(date, category, amount, note || null, created_by || null);
  res.status(201).json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { date, category, amount, note } = req.body;
  db.prepare('UPDATE expenses SET date=?, category=?, amount=?, note=? WHERE id=?')
    .run(date, category, amount, note || null, req.params.id);
  res.json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Monthly summary grouped by category
router.get('/summary/:month', (req, res) => {
  const rows = db.prepare(`
    SELECT category, SUM(amount) AS total, COUNT(*) AS entries
    FROM expenses WHERE substr(date,1,7) = ?
    GROUP BY category ORDER BY total DESC
  `).all(req.params.month);
  const total = rows.reduce((s, r) => s + r.total, 0);
  res.json({ month: req.params.month, total, byCategory: rows });
});

export default router;
