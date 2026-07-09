import express from 'express';
import db from '../db.js';
import { compute, upsertPayroll } from '../payrollEngine.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// Recompute net from stored fields (used after manual adjustment)
function recalcNet(row) {
  return Math.round(
    row.base_salary
    + (row.extra_day_pay || 0)
    + (row.overtime || 0)
    + (row.bonus || 0)
    - (row.absence_deduction || 0)
    - (row.half_day_deduction || 0)
    - (row.advance_deduction || 0)
    - (row.penalty_deduction || 0)
    - (row.food_deduction || 0)
    - (row.other_deductions || 0)
    + (row.manual_correction || 0)
  );
}

// LIST
router.get('/', (req, res) => {
  const { month, employee_id } = req.query;
  let sql = `SELECT p.*, e.name AS employee_name, e.emp_code, e.department, e.designation, e.photo_url
             FROM payroll p JOIN employees e ON e.id = p.employee_id WHERE 1=1`;
  const params = [];
  if (month) { sql += ' AND p.month = ?'; params.push(month); }
  if (employee_id) { sql += ' AND p.employee_id = ?'; params.push(employee_id); }
  sql += ' ORDER BY e.department, e.name';
  res.json(db.prepare(sql).all(...params));
});

// Generate (compute + upsert) for all active employees for a month
router.post('/generate', (req, res) => {
  const { month } = req.body;
  if (!month) return res.status(400).json({ error: 'month (YYYY-MM) required' });
  const emps = db.prepare("SELECT id FROM employees WHERE status='active'").all();
  const tx = db.transaction((ids) => { for (const { id } of ids) upsertPayroll(compute(id, month)); });
  tx(emps);
  res.json({ ok: true, month, count: emps.length });
});

// Manual adjustment (bonus, food, correction, overtime) — blocked if locked
router.put('/:id', requireRole('owner', 'admin', 'supervisor'), (req, res) => {
  const row = db.prepare('SELECT * FROM payroll WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.status === 'locked') return res.status(403).json({ error: 'Payroll is locked — cannot edit' });

  const fields = ['overtime', 'bonus', 'food_deduction', 'other_deductions', 'manual_correction'];
  const updated = { ...row };
  fields.forEach((f) => { if (req.body[f] !== undefined) updated[f] = Number(req.body[f]); });
  updated.net_salary = recalcNet(updated);

  db.prepare(`UPDATE payroll SET
    overtime=?, bonus=?, food_deduction=?, other_deductions=?, manual_correction=?, net_salary=?
    WHERE id=?`).run(
    updated.overtime, updated.bonus, updated.food_deduction,
    updated.other_deductions, updated.manual_correction, updated.net_salary,
    req.params.id
  );
  res.json(db.prepare(`SELECT p.*, e.name AS employee_name, e.emp_code, e.department, e.photo_url
    FROM payroll p JOIN employees e ON e.id=p.employee_id WHERE p.id=?`).get(req.params.id));
});

// Approve
router.put('/:id/approve', requireRole('owner', 'admin'), (req, res) => {
  const approvedBy = req.user?.name || 'Admin';
  const now = new Date().toISOString().slice(0, 10);
  const row = db.prepare('SELECT * FROM payroll WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.status === 'locked') return res.status(403).json({ error: 'Already locked' });
  db.prepare("UPDATE payroll SET status='approved', approved_by=?, approved_at=? WHERE id=?")
    .run(approvedBy, now, req.params.id);
  res.json(db.prepare('SELECT * FROM payroll WHERE id = ?').get(req.params.id));
});

// Lock
router.put('/:id/lock', requireRole('owner', 'admin', 'supervisor'), (req, res) => {
  db.prepare("UPDATE payroll SET status='locked' WHERE id=?").run(req.params.id);
  res.json(db.prepare('SELECT * FROM payroll WHERE id = ?').get(req.params.id));
});

// Unlock — revert locked → approved (admin/owner only)
router.put('/:id/unlock', requireRole('owner', 'admin'), (req, res) => {
  const row = db.prepare('SELECT * FROM payroll WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.status !== 'locked') return res.status(400).json({ error: 'Not locked' });
  db.prepare("UPDATE payroll SET status='approved' WHERE id=?").run(req.params.id);
  res.json(db.prepare('SELECT * FROM payroll WHERE id = ?').get(req.params.id));
});

// Approve all for a month (admin/owner only)
router.post('/approve-all', requireRole('admin', 'owner'), (req, res) => {
  const { month } = req.body;
  if (!month) return res.status(400).json({ error: 'month required' });
  const approvedBy = req.user?.name || 'Admin';
  const now = new Date().toISOString().slice(0, 10);
  db.prepare("UPDATE payroll SET status='approved', approved_by=?, approved_at=? WHERE month=? AND status='processed'")
    .run(approvedBy, now, month);
  res.json({ ok: true });
});

// Lock all for a month (owner, admin, supervisor)
router.post('/lock-all', requireRole('owner', 'admin', 'supervisor'), (req, res) => {
  const { month } = req.body;
  if (!month) return res.status(400).json({ error: 'month required' });
  db.prepare("UPDATE payroll SET status='locked' WHERE month=? AND status IN ('processed', 'approved')").run(month);
  res.json({ ok: true });
});

// Re-sync one employee's payroll for a month from current attendance/advances/penalties.
// Used by the Leakage module to correct rows that drifted above a fresh recompute.
router.post('/resync', requireRole('owner', 'admin', 'supervisor'), (req, res) => {
  const { employee_id, month } = req.body;
  if (!employee_id || !month) return res.status(400).json({ error: 'employee_id and month required' });
  const existing = db.prepare('SELECT status FROM payroll WHERE employee_id = ? AND month = ?').get(employee_id, month);
  if (existing?.status === 'locked') return res.status(403).json({ error: 'Payroll is locked — unlock before re-syncing' });
  const fresh = compute(employee_id, month);
  if (!fresh) return res.status(404).json({ error: 'Employee not found' });
  upsertPayroll(fresh);
  res.json(db.prepare('SELECT * FROM payroll WHERE employee_id = ? AND month = ?').get(employee_id, month));
});

// Salary history for one employee
router.get('/history/:employeeId', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, e.name AS employee_name, e.emp_code, e.department, e.designation, e.photo_url
    FROM payroll p JOIN employees e ON e.id = p.employee_id
    WHERE p.employee_id = ? ORDER BY p.month DESC
  `).all(req.params.employeeId);
  res.json(rows);
});

// Salary slip: full breakdown for one employee for one month
router.get('/slip/:employeeId/:month', (req, res) => {
  const { employeeId, month } = req.params;
  const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  let pay = db.prepare('SELECT * FROM payroll WHERE employee_id = ? AND month = ?').get(employeeId, month);
  if (!pay) pay = compute(employeeId, month);

  const advances = db.prepare('SELECT * FROM advances WHERE employee_id = ? AND balance > 0').all(employeeId);
  const penalties = db.prepare("SELECT * FROM penalties WHERE employee_id = ? AND substr(date,1,7) = ?").all(employeeId, month);
  const att = db.prepare(`
    SELECT
      SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS present,
      SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) AS absent,
      SUM(CASE WHEN status='half_day' THEN 1 ELSE 0 END) AS half_day,
      SUM(CASE WHEN status='weekly_off' THEN 1 ELSE 0 END) AS weekly_off,
      SUM(CASE WHEN status='holiday' THEN 1 ELSE 0 END) AS holiday,
      SUM(CASE WHEN status='paid_leave' THEN 1 ELSE 0 END) AS paid_leave,
      SUM(CASE WHEN status='unpaid_leave' THEN 1 ELSE 0 END) AS unpaid_leave,
      SUM(CASE WHEN is_late=1 THEN 1 ELSE 0 END) AS late
    FROM attendance WHERE employee_id = ? AND substr(date,1,7) = ?
  `).get(employeeId, month);

  res.json({ employee: emp, payroll: pay, advances, penalties, attendance: att, month });
});

export default router;
