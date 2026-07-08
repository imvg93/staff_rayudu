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
      SUM(CASE WHEN status IN ('paid_leave','unpaid_leave') THEN 1 ELSE 0 END) AS leave,
      SUM(CASE WHEN status='weekly_off' THEN 1 ELSE 0 END) AS weekly_off,
      SUM(CASE WHEN status='holiday' THEN 1 ELSE 0 END) AS holiday,
      SUM(CASE WHEN is_late=1 THEN 1 ELSE 0 END) AS late
    FROM attendance WHERE employee_id = ?
  `).get(id);

  const salaryHistory = db.prepare(`
    SELECT month, base_salary, present_days, absent_days, extra_absent_days, half_days,
           absence_deduction, half_day_deduction, advance_deduction, penalty_deduction,
           overtime, bonus, food_deduction, other_deductions, manual_correction,
           net_salary, status, approved_by, approved_at
    FROM payroll
    WHERE employee_id = ?
    ORDER BY month DESC
  `).all(id);

  const salaryTotals = db.prepare(`
    SELECT
      COUNT(*) AS months_paid,
      COALESCE(SUM(net_salary), 0) AS total_paid,
      COALESCE(SUM(base_salary), 0) AS total_base,
      COALESCE(SUM(absence_deduction + half_day_deduction + advance_deduction + penalty_deduction + food_deduction + other_deductions), 0) AS total_deductions,
      COALESCE(SUM(extra_day_pay + overtime + bonus + manual_correction), 0) AS total_adjustments
    FROM payroll
    WHERE employee_id = ?
  `).get(id);

  const leaveSummary = db.prepare(`
    SELECT status, COUNT(*) AS requests, COALESCE(SUM(days), 0) AS days
    FROM leaves
    WHERE employee_id = ?
    GROUP BY status
  `).all(id);

  const advanceSummary = db.prepare(`
    SELECT
      COUNT(*) AS advances,
      COALESCE(SUM(amount), 0) AS total_advanced,
      COALESCE(SUM(balance), 0) AS balance
    FROM advances
    WHERE employee_id = ?
  `).get(id);

  const documentSummary = db.prepare(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN verified=1 THEN 1 ELSE 0 END), 0) AS verified
    FROM documents
    WHERE employee_id = ?
  `).get(id);

  res.json({
    employee,
    attendanceSummary: att,
    events,
    salaryHistory,
    salaryTotals,
    leaveSummary,
    advanceSummary,
    documentSummary,
  });
});

export default router;
