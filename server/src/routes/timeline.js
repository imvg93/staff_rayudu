import express from 'express';
import db from '../db.js';

const router = express.Router();

// Full employee timeline for one screen
router.get('/:employeeId', (req, res) => {
  const id = req.params.employeeId;
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const events = [];
  const push = (date, type, title, detail) => date && events.push({ date, type, title, detail });

  push(employee.joining_date, 'joining', 'Joined the hotel', `${employee.designation || ''} · ${employee.department}`);

  for (const l of db.prepare('SELECT * FROM leaves WHERE employee_id = ?').all(id))
    push(l.from_date, 'leave', `Leave (${l.status})`, `${l.type} · ${l.days} day(s) · ${l.reason || ''}`);

  for (const a of db.prepare('SELECT * FROM advances WHERE employee_id = ?').all(id))
    push(a.date, 'advance', `Advance ₹${a.amount}`, `${a.reason || ''} · ₹${a.monthly_deduction}/mo · balance ₹${a.balance}`);

  for (const p of db.prepare('SELECT * FROM penalties WHERE employee_id = ?').all(id))
    push(p.date, 'penalty', `Penalty ₹${p.amount}`, `${p.type} · ${p.reason || ''}`);

  for (const n of db.prepare('SELECT * FROM performance_notes WHERE employee_id = ?').all(id))
    push(n.date, n.type === 'warning' ? 'warning' : 'note', n.type === 'appreciation' ? 'Appreciation' : n.type === 'warning' ? 'Warning' : 'Note', n.remark);

  for (const pay of db.prepare('SELECT * FROM payroll WHERE employee_id = ?').all(id))
    push(pay.month + '-28', 'salary', `Salary ${pay.month}`, `Net ₹${pay.net_salary} (base ₹${pay.base_salary})`);

  for (const pr of db.prepare('SELECT * FROM promotions WHERE employee_id = ?').all(id))
    push(pr.date, 'promotion', `Promoted → ${pr.to_designation}`, `From ${pr.from_designation} · Salary ₹${pr.salary_before} → ₹${pr.salary_after}`);

  const ex = db.prepare('SELECT * FROM exits WHERE employee_id = ?').get(id);
  if (ex) push(ex.last_working_day, 'exit', 'Exit / Settlement', `${ex.reason || ''} · settlement ₹${ex.settlement_amount}`);

  events.sort((a, b) => (a.date < b.date ? 1 : -1));

  // attendance summary
  const att = db.prepare(`
    SELECT
      SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS present,
      SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) AS absent,
      SUM(CASE WHEN status='half_day' THEN 1 ELSE 0 END) AS half_day,
      SUM(CASE WHEN status='leave' THEN 1 ELSE 0 END) AS leave,
      SUM(CASE WHEN is_late=1 THEN 1 ELSE 0 END) AS late
    FROM attendance WHERE employee_id = ?
  `).get(id);

  res.json({ employee, attendanceSummary: att, events });
});

export default router;
