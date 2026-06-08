import express from 'express';
import db from '../db.js';
import { autoSync } from '../payrollEngine.js';

const router = express.Router();

// List attendance for a given date (default today) joined with employees
router.get('/', (req, res) => {
  const date = req.query.date;
  const employee_id = req.query.employee_id;
  if (employee_id) {
    return res.json(
      db.prepare('SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC').all(employee_id)
    );
  }
  // grid for a date: every active employee + their mark (if any)
  const rows = db.prepare(`
    SELECT e.id AS employee_id, e.emp_code, e.name, e.department, e.shift,
           a.id AS attendance_id, a.status, a.check_in, a.is_late, a.remarks
    FROM employees e
    LEFT JOIN attendance a ON a.employee_id = e.id AND a.date = ?
    WHERE e.status = 'active'
    ORDER BY e.department, e.name
  `).all(date);
  res.json(rows);
});

// Upsert a single attendance mark
router.post('/', (req, res) => {
  const { employee_id, date, status, check_in, is_late, remarks } = req.body;
  if (!employee_id || !date || !status) return res.status(400).json({ error: 'employee_id, date, status required' });
  db.prepare(`
    INSERT INTO attendance (employee_id,date,status,check_in,is_late,remarks)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(employee_id,date) DO UPDATE SET
      status=excluded.status, check_in=excluded.check_in,
      is_late=excluded.is_late, remarks=excluded.remarks
  `).run(employee_id, date, status, check_in || null, is_late ? 1 : 0, remarks || null);
  autoSync(employee_id, date.slice(0, 7));
  res.json({ ok: true });
});

// Bulk upsert (mark whole grid at once)
router.post('/bulk', (req, res) => {
  const { date, marks } = req.body;
  if (!date || !Array.isArray(marks)) return res.status(400).json({ error: 'date and marks[] required' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  try {
    const stmt = db.prepare(`
      INSERT INTO attendance (employee_id,date,status,check_in,is_late,remarks)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(employee_id,date) DO UPDATE SET
        status=excluded.status, check_in=excluded.check_in,
        is_late=excluded.is_late, remarks=excluded.remarks
    `);
    const month = date.slice(0, 7);
    const tx = db.transaction((items) => {
      for (const m of items) {
        if (!m.status) continue;
        stmt.run(m.employee_id, date, m.status, m.check_in || null, m.is_late ? 1 : 0, m.remarks || null);
        autoSync(m.employee_id, month);
      }
    });
    tx(marks);
    res.json({ ok: true, count: marks.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save attendance: ' + err.message });
  }
});

// Monthly report: per-employee counts for a YYYY-MM
router.get('/report/:month', (req, res) => {
  const month = req.params.month;
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'month must be YYYY-MM' });
  const rows = db.prepare(`
    SELECT e.id AS employee_id, e.emp_code, e.name, e.department, e.monthly_allowed_holidays,
      SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS present,
      SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) AS absent,
      SUM(CASE WHEN a.status='half_day' THEN 1 ELSE 0 END) AS half_day,
      SUM(CASE WHEN a.status='weekly_off' THEN 1 ELSE 0 END) AS weekly_off,
      SUM(CASE WHEN a.status='paid_leave' THEN 1 ELSE 0 END) AS paid_leave,
      SUM(CASE WHEN a.status='unpaid_leave' THEN 1 ELSE 0 END) AS unpaid_leave,
      SUM(CASE WHEN a.status='absent' OR a.status='unpaid_leave' THEN 1 ELSE 0 END) AS total_absent,
      SUM(CASE WHEN a.is_late=1 THEN 1 ELSE 0 END) AS late
    FROM employees e
    LEFT JOIN attendance a ON a.employee_id = e.id AND substr(a.date,1,7) = ?
    WHERE e.status='active'
    GROUP BY e.id
    ORDER BY e.department, e.name
  `).all(month);
  res.json(rows);
});

export default router;
