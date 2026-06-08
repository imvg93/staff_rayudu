import db from './db.js';

function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function compute(employee_id, month) {
  const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employee_id);
  if (!emp) return null;

  const totalDays = daysInMonth(month);
  const perDay = emp.salary / totalDays;
  const allowed = emp.monthly_allowed_holidays ?? 0;

  const att = db.prepare(`
    SELECT
      SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS present,
      SUM(CASE WHEN status='absent' OR status='unpaid_leave' THEN 1 ELSE 0 END) AS absent,
      SUM(CASE WHEN status='half_day' THEN 1 ELSE 0 END) AS half_day,
      SUM(CASE WHEN status='paid_leave' THEN 1 ELSE 0 END) AS paid_leave
    FROM attendance WHERE employee_id = ? AND substr(date,1,7) = ?
  `).get(employee_id, month);

  const absentDays = att.absent || 0;
  const halfDays   = att.half_day || 0;
  const extra      = Math.max(0, absentDays - allowed);
  const absenceDed = Math.round(perDay * extra);
  const halfDed    = Math.round(perDay * 0.5 * halfDays);

  const advDed = db.prepare(
    'SELECT COALESCE(SUM(monthly_deduction),0) d FROM advances WHERE employee_id = ? AND balance > 0'
  ).get(employee_id).d;
  const penDed = db.prepare(
    "SELECT COALESCE(SUM(amount),0) d FROM penalties WHERE employee_id = ? AND substr(date,1,7) = ?"
  ).get(employee_id, month).d;

  const net = Math.round(emp.salary - absenceDed - halfDed - advDed - penDed);

  return {
    employee_id,
    month,
    base_salary: emp.salary,
    total_days_in_month: totalDays,
    allowed_holidays: allowed,
    present_days: att.present || 0,
    absent_days: absentDays,
    extra_absent_days: extra,
    half_days: halfDays,
    per_day_salary: Math.round(perDay * 100) / 100,
    absence_deduction: absenceDed,
    half_day_deduction: halfDed,
    overtime: 0,
    bonus: 0,
    advance_deduction: advDed,
    penalty_deduction: penDed,
    food_deduction: 0,
    other_deductions: 0,
    manual_correction: 0,
    net_salary: net,
    status: 'processed',
  };
}

const upsertStmt = db.prepare(`
  INSERT INTO payroll
    (employee_id,month,base_salary,total_days_in_month,allowed_holidays,present_days,
     absent_days,extra_absent_days,half_days,per_day_salary,absence_deduction,half_day_deduction,
     overtime,bonus,advance_deduction,penalty_deduction,food_deduction,other_deductions,
     manual_correction,net_salary,status)
  VALUES
    (@employee_id,@month,@base_salary,@total_days_in_month,@allowed_holidays,@present_days,
     @absent_days,@extra_absent_days,@half_days,@per_day_salary,@absence_deduction,@half_day_deduction,
     @overtime,@bonus,@advance_deduction,@penalty_deduction,@food_deduction,@other_deductions,
     @manual_correction,@net_salary,@status)
  ON CONFLICT(employee_id,month) DO UPDATE SET
    base_salary=excluded.base_salary, total_days_in_month=excluded.total_days_in_month,
    allowed_holidays=excluded.allowed_holidays, present_days=excluded.present_days,
    absent_days=excluded.absent_days, extra_absent_days=excluded.extra_absent_days,
    half_days=excluded.half_days, per_day_salary=excluded.per_day_salary,
    absence_deduction=excluded.absence_deduction, half_day_deduction=excluded.half_day_deduction,
    advance_deduction=excluded.advance_deduction, penalty_deduction=excluded.penalty_deduction,
    net_salary=excluded.net_salary, status='processed'
  WHERE payroll.status != 'locked'
`);

export function upsertPayroll(data) {
  if (!data) return;
  upsertStmt.run(data);
}

export function autoSync(employee_id, month) {
  upsertPayroll(compute(employee_id, month));
}
