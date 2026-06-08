import express from 'express';
import db from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { status, employee_id } = req.query;
  let sql = `SELECT l.*, e.name AS employee_name, e.emp_code, e.department
             FROM leaves l JOIN employees e ON e.id = l.employee_id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND l.status = ?'; params.push(status); }
  if (employee_id) { sql += ' AND l.employee_id = ?'; params.push(employee_id); }
  sql += ' ORDER BY l.id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  const { employee_id, from_date, to_date, type, reason, days } = req.body;
  if (!employee_id || !from_date || !to_date) return res.status(400).json({ error: 'employee_id, from_date, to_date required' });
  const info = db.prepare(`INSERT INTO leaves (employee_id,from_date,to_date,type,reason,days,status)
    VALUES (?,?,?,?,?,?, 'pending')`).run(employee_id, from_date, to_date, type || 'Casual', reason || null, days || 1);
  res.status(201).json(db.prepare('SELECT * FROM leaves WHERE id = ?').get(info.lastInsertRowid));
});

// Approve / reject
router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: 'bad status' });
  db.prepare('UPDATE leaves SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json(db.prepare('SELECT * FROM leaves WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM leaves WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Leave balance per employee (simple: annual quota - approved days this year)
router.get('/balance/all', (req, res) => {
  const year = new Date().getFullYear();
  const QUOTA = 24;
  const rows = db.prepare(`
    SELECT e.id AS employee_id, e.emp_code, e.name, e.department,
      COALESCE(SUM(CASE WHEN l.status='approved' AND substr(l.from_date,1,4)=? THEN l.days ELSE 0 END),0) AS used
    FROM employees e LEFT JOIN leaves l ON l.employee_id = e.id
    WHERE e.status='active'
    GROUP BY e.id ORDER BY e.department, e.name
  `).all(String(year));
  res.json(rows.map((r) => ({ ...r, quota: QUOTA, balance: QUOTA - r.used })));
});

// Department-wise leave report for a year
router.get('/report/department', (req, res) => {
  const year = req.query.year || String(new Date().getFullYear());
  const rows = db.prepare(`
    SELECT e.department,
      SUM(CASE WHEN l.status='approved' THEN l.days ELSE 0 END) AS approved_days,
      SUM(CASE WHEN l.status='pending' THEN l.days ELSE 0 END) AS pending_days,
      SUM(CASE WHEN l.status='rejected' THEN l.days ELSE 0 END) AS rejected_days,
      COUNT(DISTINCT l.employee_id) AS employees_on_leave
    FROM employees e
    LEFT JOIN leaves l ON l.employee_id = e.id AND substr(l.from_date,1,4) = ?
    WHERE e.status = 'active'
    GROUP BY e.department ORDER BY e.department
  `).all(year);
  res.json({ year, departments: rows });
});

export default router;
