import express from 'express';
import db from '../db.js';
import { compute } from '../payrollEngine.js';

const router = express.Router();
const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => localDate();
const monthStr = () => localDate().slice(0, 7);

// Resolve the pay window for prorated payroll.
// asOf (YYYY-MM-DD) = pay salary up to and including this date (half-month / any date).
// When omitted, defaults to "yesterday" of the current month (live dashboard behaviour).
function resolvePayWindow(asOf) {
  let cutoff, month, monthNum, year;
  if (asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    cutoff = asOf;
    year = Number(asOf.slice(0, 4));
    monthNum = Number(asOf.slice(5, 7));
    month = asOf.slice(0, 7);
  } else {
    const now = new Date();
    year = now.getFullYear();
    monthNum = now.getMonth() + 1;
    month = `${year}-${String(monthNum).padStart(2, '0')}`;
    // Yesterday, using local date parts to avoid UTC drift
    const yday = new Date(year, now.getMonth(), now.getDate() - 1);
    cutoff = localDate(yday);
  }
  const firstOfMonth = `${month}-01`;
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  // Day-of-month of the cutoff, clamped to this month's range
  const cutoffDay = Number(cutoff.slice(8, 10));
  const daysElapsed = cutoff >= firstOfMonth
    ? Math.min(cutoffDay, daysInMonth)
    : 0;
  return { monthStr: month, firstOfMonth, cutoff, daysElapsed, daysInMonth };
}

// Workforce analytics dashboard metrics
router.get('/dashboard', (req, res) => {
  const date = req.query.date || todayStr();
  const month = monthStr();

  const totalEmployees = db.prepare("SELECT COUNT(*) c FROM employees WHERE status='active'").get().c;

  const todayCounts = db.prepare(`
    SELECT
      SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS present,
      SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) AS absent,
      SUM(CASE WHEN status='half_day' THEN 1 ELSE 0 END) AS half_day,
      SUM(CASE WHEN status='leave' THEN 1 ELSE 0 END) AS leave
    FROM attendance WHERE date = ?
  `).get(date);

  const onLeaveToday = db.prepare(
    "SELECT COUNT(*) c FROM leaves WHERE status='approved' AND ? BETWEEN from_date AND to_date"
  ).get(date).c;

  const newJoiners = db.prepare(
    "SELECT COUNT(*) c FROM employees WHERE substr(joining_date,1,7) = ?"
  ).get(month).c;

  const salaryExpense = db.prepare("SELECT COALESCE(SUM(salary),0) s FROM employees WHERE status='active'").get().s;
  const outstandingAdvances = db.prepare('SELECT COALESCE(SUM(balance),0) s FROM advances').get().s;
  const pendingLeaves = db.prepare("SELECT COUNT(*) c FROM leaves WHERE status='pending'").get().c;

  const deptDistribution = db.prepare(`
    SELECT department, COUNT(*) AS count FROM employees WHERE status='active'
    GROUP BY department ORDER BY count DESC
  `).all();

  // attendance % over last 30 days per employee
  const attendance = db.prepare(`
    SELECT e.id, e.name, e.emp_code, e.department,
      SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS present,
      COUNT(a.id) AS total
    FROM employees e LEFT JOIN attendance a ON a.employee_id = e.id
    WHERE e.status='active'
    GROUP BY e.id
  `).all();
  const ranked = attendance
    .map((r) => ({ ...r, pct: r.total ? Math.round((r.present / r.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct);
  const topAttendance = ranked.slice(0, 5);
  const lowAttendance = ranked.slice(-5).reverse();

  res.json({
    totalEmployees,
    present: todayCounts.present || 0,
    absent: todayCounts.absent || 0,
    halfDay: todayCounts.half_day || 0,
    onLeaveToday,
    newJoiners,
    salaryExpense,
    outstandingAdvances,
    pendingLeaves,
    deptDistribution,
    topAttendance,
    lowAttendance,
    date,
  });
});

// Attendance trend: daily present/absent counts for last N days
router.get('/attendance-trend', (req, res) => {
  const days = Math.min(parseInt(req.query.days || '30', 10), 90);
  const rows = db.prepare(`
    SELECT date,
      SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS present,
      SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) AS absent,
      SUM(CASE WHEN status='half_day' THEN 1 ELSE 0 END) AS half_day,
      SUM(CASE WHEN status='leave' THEN 1 ELSE 0 END) AS leave
    FROM attendance
    WHERE date >= date('now', '-' || ? || ' days')
    GROUP BY date ORDER BY date
  `).all(days);
  res.json(rows);
});

// Department-wise attendance for today
router.get('/dept-attendance', (req, res) => {
  const date = req.query.date || todayStr();
  const rows = db.prepare(`
    SELECT e.department,
      COUNT(e.id) AS total,
      SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS present,
      SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) AS absent,
      SUM(CASE WHEN a.status='half_day' THEN 1 ELSE 0 END) AS half_day,
      SUM(CASE WHEN a.status='leave' THEN 1 ELSE 0 END) AS leave
    FROM employees e
    LEFT JOIN attendance a ON a.employee_id = e.id AND a.date = ?
    WHERE e.status = 'active'
    GROUP BY e.department
  `).all(date);
  res.json(rows);
});

// Dynamic payroll progress — prorated earnings based on attendance up to yesterday
router.get('/payroll-progress', (req, res) => {
  const { monthStr, firstOfMonth, cutoff: ydayStr, daysElapsed, daysInMonth } =
    resolvePayWindow(req.query.asOf);

  const employees = db.prepare(
    "SELECT id, salary, monthly_allowed_holidays FROM employees WHERE status = 'active'"
  ).all();

  const totalMonthlySalary = employees.reduce((s, e) => s + (e.salary || 0), 0);

  let earnedGross = 0;
  let absenceDeductions = 0;
  let halfDayDeductions = 0;
  let unpaidLeaveDeductions = 0;
  let sumPresent = 0, sumHalfDay = 0, sumAbsent = 0;
  let sumWeeklyOff = 0, sumPaidLeave = 0, sumUnpaidLeave = 0;

  if (daysElapsed > 0) {
    const rows = db.prepare(`
      SELECT employee_id,
        SUM(CASE WHEN status='present'      THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN status='half_day'     THEN 1 ELSE 0 END) AS half_day,
        SUM(CASE WHEN status='absent'       THEN 1 ELSE 0 END) AS absent,
        SUM(CASE WHEN status='weekly_off'   THEN 1 ELSE 0 END) AS weekly_off,
        SUM(CASE WHEN status='paid_leave'   THEN 1 ELSE 0 END) AS paid_leave,
        SUM(CASE WHEN status='unpaid_leave' THEN 1 ELSE 0 END) AS unpaid_leave,
        COUNT(*) AS total_marked
      FROM attendance
      WHERE date >= ? AND date <= ?
      GROUP BY employee_id
    `).all(firstOfMonth, ydayStr);

    const attMap = Object.fromEntries(rows.map((r) => [r.employee_id, r]));

    for (const emp of employees) {
      const perDay = (emp.salary || 0) / daysInMonth;
      const allowed = emp.monthly_allowed_holidays || 0;
      const a = attMap[emp.id] || {
        present: 0, half_day: 0, absent: 0,
        weekly_off: 0, paid_leave: 0, unpaid_leave: 0, total_marked: 0,
      };

      // Extra absences beyond the free allowance → deducted
      const extraAbsent = Math.max(0, a.absent - allowed);
      const absDed    = extraAbsent * perDay;
      const halfDed   = a.half_day * 0.5 * perDay;
      const unpaidDed = a.unpaid_leave * perDay;

      // Gross = every marked day counts as a full day before deductions
      earnedGross        += a.total_marked * perDay;
      absenceDeductions  += absDed;
      halfDayDeductions  += halfDed;
      unpaidLeaveDeductions += unpaidDed;

      sumPresent    += a.present;
      sumHalfDay    += a.half_day;
      sumAbsent     += a.absent;
      sumWeeklyOff  += a.weekly_off;
      sumPaidLeave  += a.paid_leave;
      sumUnpaidLeave += a.unpaid_leave;
    }
  }

  const totalDeductions = absenceDeductions + halfDayDeductions + unpaidLeaveDeductions;
  const netPayable      = earnedGross - totalDeductions;

  res.json({
    totalMonthlySalary:     Math.round(totalMonthlySalary),
    earnedGross:            Math.round(earnedGross),
    totalDeductions:        Math.round(totalDeductions),
    absenceDeductions:      Math.round(absenceDeductions),
    halfDayDeductions:      Math.round(halfDayDeductions),
    unpaidLeaveDeductions:  Math.round(unpaidLeaveDeductions),
    netPayable:             Math.round(netPayable),
    daysElapsed,
    daysInMonth,
    month:     monthStr,
    asOfDate:  ydayStr,
    attendanceSummary: {
      present:     sumPresent,
      halfDay:     sumHalfDay,
      absent:      sumAbsent,
      weeklyOff:   sumWeeklyOff,
      paidLeave:   sumPaidLeave,
      unpaidLeave: sumUnpaidLeave,
    },
  });
});

// Per-employee payroll deduction details for current month (up to yesterday)
router.get('/payroll-deductions', (req, res) => {
  const { firstOfMonth, cutoff: ydayStr, daysElapsed, daysInMonth } =
    resolvePayWindow(req.query.asOf);

  const employees = db.prepare(
    "SELECT id, name, emp_code, department, salary, monthly_allowed_holidays FROM employees WHERE status = 'active' ORDER BY name"
  ).all();

  if (daysElapsed === 0) return res.json([]);

  // Aggregated counts per employee
  const aggRows = db.prepare(`
    SELECT employee_id,
      SUM(CASE WHEN status='present'      THEN 1 ELSE 0 END) AS present,
      SUM(CASE WHEN status='half_day'     THEN 1 ELSE 0 END) AS half_day,
      SUM(CASE WHEN status='absent'       THEN 1 ELSE 0 END) AS absent,
      SUM(CASE WHEN status='weekly_off'   THEN 1 ELSE 0 END) AS weekly_off,
      SUM(CASE WHEN status='paid_leave'   THEN 1 ELSE 0 END) AS paid_leave,
      SUM(CASE WHEN status='unpaid_leave' THEN 1 ELSE 0 END) AS unpaid_leave,
      COUNT(*) AS total_marked
    FROM attendance WHERE date >= ? AND date <= ?
    GROUP BY employee_id
  `).all(firstOfMonth, ydayStr);
  const aggMap = Object.fromEntries(aggRows.map((r) => [r.employee_id, r]));

  // All absence/half_day/unpaid_leave dates per employee for display
  const dateRows = db.prepare(`
    SELECT employee_id, date, status
    FROM attendance
    WHERE date >= ? AND date <= ?
      AND status IN ('absent','half_day','unpaid_leave')
    ORDER BY employee_id, date
  `).all(firstOfMonth, ydayStr);
  const dateMap = {};
  for (const row of dateRows) {
    if (!dateMap[row.employee_id]) dateMap[row.employee_id] = [];
    dateMap[row.employee_id].push({ date: row.date, status: row.status });
  }

  const result = [];
  for (const emp of employees) {
    const perDay = (emp.salary || 0) / daysInMonth;
    const allowed = emp.monthly_allowed_holidays || 0;
    const a = aggMap[emp.id] || {
      present: 0, half_day: 0, absent: 0,
      weekly_off: 0, paid_leave: 0, unpaid_leave: 0, total_marked: 0,
    };

    const extraAbsent       = Math.max(0, a.absent - allowed);
    const absenceDed        = Math.round(extraAbsent * perDay);
    const halfDayDed        = Math.round(a.half_day * 0.5 * perDay);
    const unpaidLeaveDed    = Math.round(a.unpaid_leave * perDay);
    const totalDeduction    = absenceDed + halfDayDed + unpaidLeaveDed;
    const earnedGross       = Math.round(a.total_marked * perDay);
    const netPayable        = earnedGross - totalDeduction;

    result.push({
      id: emp.id,
      name: emp.name,
      emp_code: emp.emp_code,
      department: emp.department,
      salary: emp.salary || 0,
      perDay: Math.round(perDay),
      allowedHolidays: allowed,
      present: a.present,
      absent: a.absent,
      half_day: a.half_day,
      weekly_off: a.weekly_off,
      paid_leave: a.paid_leave,
      unpaid_leave: a.unpaid_leave,
      extraAbsent,
      absenceDed,
      halfDayDed,
      unpaidLeaveDed,
      totalDeduction,
      earnedGross,
      netPayable,
      dates: dateMap[emp.id] || [],
    });
  }

  res.json(result);
});

// Final settlement for a single leaving employee up to their last working day.
// "If someone leaves mid-month, how much do I actually hand them?"
//   Earned pay (present + weekly-off + paid-leave in full, half-days at ½) up to
//   the last working day, minus this month's penalties, minus the FULL outstanding
//   advance balance (recovered in one go because the employee is leaving).
router.get('/settlement', (req, res) => {
  const employee_id = Number(req.query.employee_id);
  if (!employee_id) return res.status(400).json({ error: 'employee_id is required' });

  const emp = db.prepare(
    'SELECT id, emp_code, name, department, designation, salary, monthly_allowed_holidays, joining_date FROM employees WHERE id = ?'
  ).get(employee_id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  // Last working day — defaults to today when not supplied
  const { monthStr, firstOfMonth, cutoff, daysElapsed, daysInMonth } =
    resolvePayWindow(req.query.asOf || todayStr());

  const perDay = (emp.salary || 0) / daysInMonth;

  const a = db.prepare(`
    SELECT
      SUM(CASE WHEN status='present'      THEN 1 ELSE 0 END) AS present,
      SUM(CASE WHEN status='half_day'     THEN 1 ELSE 0 END) AS half_day,
      SUM(CASE WHEN status='absent'       THEN 1 ELSE 0 END) AS absent,
      SUM(CASE WHEN status='weekly_off'   THEN 1 ELSE 0 END) AS weekly_off,
      SUM(CASE WHEN status='paid_leave'   THEN 1 ELSE 0 END) AS paid_leave,
      SUM(CASE WHEN status='unpaid_leave' THEN 1 ELSE 0 END) AS unpaid_leave,
      COUNT(*) AS marked
    FROM attendance
    WHERE employee_id = ? AND date >= ? AND date <= ?
  `).get(employee_id, firstOfMonth, cutoff);

  const counts = {
    present: a.present || 0, half_day: a.half_day || 0, absent: a.absent || 0,
    weekly_off: a.weekly_off || 0, paid_leave: a.paid_leave || 0,
    unpaid_leave: a.unpaid_leave || 0, marked: a.marked || 0,
  };

  // Paid days = worked + rest days that still count as paid; half-days at ½
  const fullPaidDays = counts.present + counts.weekly_off + counts.paid_leave;
  const paidDayEquivalent = fullPaidDays + 0.5 * counts.half_day;
  const earnedSalary = Math.round(perDay * paidDayEquivalent);
  // Days with no attendance marked yet in the window (info only — not paid)
  const unmarkedDays = Math.max(0, daysElapsed - counts.marked);

  const penalties = db.prepare(
    "SELECT COALESCE(SUM(amount),0) d FROM penalties WHERE employee_id = ? AND substr(date,1,7) = ?"
  ).get(employee_id, monthStr).d;

  const advanceRows = db.prepare(
    'SELECT id, amount, date, balance, reason FROM advances WHERE employee_id = ? AND balance > 0 ORDER BY date'
  ).all(employee_id);
  const advanceOutstanding = advanceRows.reduce((s, r) => s + (r.balance || 0), 0);

  const netSettlement = Math.round(earnedSalary - penalties - advanceOutstanding);

  res.json({
    employee: emp,
    month: monthStr,
    asOf: cutoff,
    daysInMonth,
    daysElapsed,
    perDay: Math.round(perDay),
    counts,
    unmarkedDays,
    paidDayEquivalent,
    earnedSalary,
    penalties: Math.round(penalties),
    advanceOutstanding: Math.round(advanceOutstanding),
    advanceRows,
    netSettlement,
  });
});

// Hidden salary leakage — quantifiable money at risk or silently overpaid.
// Read-only: computes buckets from advances, payroll and attendance.
router.get('/leakage', (req, res) => {
  const month = req.query.month || monthStr();

  // 1. Advances still owed but with no monthly recovery set → never being clawed back
  const unrecoveredAdvances = db.prepare(`
    SELECT a.id, a.amount, a.balance, a.monthly_deduction, a.date, a.reason,
           e.id AS employee_id, e.name, e.emp_code, e.department, e.status AS emp_status
    FROM advances a JOIN employees e ON e.id = a.employee_id
    WHERE a.balance > 0 AND COALESCE(a.monthly_deduction, 0) <= 0
    ORDER BY a.balance DESC
  `).all();

  // 2. Outstanding advances owed by staff who have already exited
  const exitedAdvances = db.prepare(`
    SELECT a.id, a.amount, a.balance, a.monthly_deduction, a.date, a.reason,
           e.id AS employee_id, e.name, e.emp_code, e.department, e.status AS emp_status
    FROM advances a JOIN employees e ON e.id = a.employee_id
    WHERE a.balance > 0 AND e.status = 'exited'
    ORDER BY a.balance DESC
  `).all();

  // 3. Overtime pay for rest days the employee never took (extra_day_pay this month)
  const restDayOvertime = db.prepare(`
    SELECT p.employee_id, p.extra_off_days, p.extra_day_pay,
           e.name, e.emp_code, e.department
    FROM payroll p JOIN employees e ON e.id = p.employee_id
    WHERE p.month = ? AND p.extra_day_pay > 0
    ORDER BY p.extra_day_pay DESC
  `).all(month);

  // 4. Stored payroll that no longer matches a fresh recompute → possible overpayment
  const storedRows = db.prepare(`
    SELECT p.employee_id, p.net_salary, p.status,
           e.name, e.emp_code, e.department
    FROM payroll p JOIN employees e ON e.id = p.employee_id
    WHERE p.month = ?
  `).all(month);
  const overpaidRows = [];
  for (const row of storedRows) {
    const fresh = compute(row.employee_id, month);
    if (!fresh) continue;
    const delta = Math.round(row.net_salary - fresh.net_salary);
    if (delta > 0) {
      overpaidRows.push({
        employee_id: row.employee_id, name: row.name, emp_code: row.emp_code,
        department: row.department, stored_net: Math.round(row.net_salary),
        recomputed_net: fresh.net_salary, delta, status: row.status,
      });
    }
  }
  overpaidRows.sort((a, b) => b.delta - a.delta);

  // 5. Full/near-full pay despite very low attendance this month
  const lowAttendancePaid = db.prepare(`
    SELECT p.employee_id, p.present_days, p.absent_days, p.half_days,
           p.total_days_in_month, p.net_salary, e.name, e.emp_code, e.department
    FROM payroll p JOIN employees e ON e.id = p.employee_id
    WHERE p.month = ? AND p.net_salary > 0
      AND p.present_days < (p.total_days_in_month * 0.3)
    ORDER BY p.net_salary DESC
  `).all(month);

  // 6. Active, salaried staff with no attendance marked at all this month
  const ghostNoAttendance = db.prepare(`
    SELECT e.id AS employee_id, e.name, e.emp_code, e.department, e.salary
    FROM employees e
    WHERE e.status = 'active' AND e.salary > 0
      AND NOT EXISTS (
        SELECT 1 FROM attendance a WHERE a.employee_id = e.id AND substr(a.date,1,7) = ?
      )
    ORDER BY e.salary DESC
  `).all(month);

  // 7. Data integrity: advance balance greater than the amount ever given
  const advanceDataErrors = db.prepare(`
    SELECT a.id, a.amount, a.balance, a.monthly_deduction, a.date, a.reason,
           e.id AS employee_id, e.name, e.emp_code, e.department, e.status AS emp_status
    FROM advances a JOIN employees e ON e.id = a.employee_id
    WHERE a.balance > a.amount
    ORDER BY (a.balance - a.amount) DESC
  `).all();

  const sum = (rows, key) => Math.round(rows.reduce((s, r) => s + (r[key] || 0), 0));

  const buckets = [
    {
      key: 'unrecovered_advances', risk: true,
      label: 'Unrecovered advances',
      description: 'Advances still owed with no monthly deduction set — nothing is being clawed back.',
      amount: sum(unrecoveredAdvances, 'balance'),
      count: unrecoveredAdvances.length,
      items: unrecoveredAdvances,
    },
    {
      key: 'exited_advances', risk: true,
      label: 'Advances owed by exited staff',
      description: 'Employees who have left still carry an outstanding advance balance.',
      amount: sum(exitedAdvances, 'balance'),
      count: exitedAdvances.length,
      items: exitedAdvances,
    },
    {
      key: 'overpaid_payroll', risk: true,
      label: 'Payroll higher than recompute',
      description: 'Stored net salary exceeds a fresh calculation from current attendance & deductions.',
      amount: sum(overpaidRows, 'delta'),
      count: overpaidRows.length,
      items: overpaidRows,
    },
    {
      key: 'rest_day_overtime', risk: false,
      label: 'Overtime for skipped rest days',
      description: 'Extra pay because entitled weekly-offs were worked instead of rested. Real cost, but earned.',
      amount: sum(restDayOvertime, 'extra_day_pay'),
      count: restDayOvertime.length,
      items: restDayOvertime,
    },
    {
      key: 'low_attendance_paid', risk: false,
      label: 'Paid despite low attendance',
      description: 'Net salary paid while present on under 30% of the month — worth a manual check.',
      amount: sum(lowAttendancePaid, 'net_salary'),
      count: lowAttendancePaid.length,
      items: lowAttendancePaid,
    },
    {
      key: 'ghost_no_attendance', risk: false,
      label: 'Active staff with no attendance marked',
      description: 'On the payroll but not one day marked this month — an attendance gap that leads to full pay for no recorded work.',
      amount: sum(ghostNoAttendance, 'salary'),
      count: ghostNoAttendance.length,
      items: ghostNoAttendance,
    },
    {
      key: 'advance_data_error', risk: false,
      label: 'Advance balance exceeds amount given',
      description: 'Outstanding balance is larger than the advance ever issued — a tracking error inflating what is owed.',
      amount: Math.round(advanceDataErrors.reduce((s, r) => s + (r.balance - r.amount), 0)),
      count: advanceDataErrors.length,
      items: advanceDataErrors,
    },
  ];

  const totalAtRisk = buckets.filter((b) => b.risk).reduce((s, b) => s + b.amount, 0);

  res.json({ month, totalAtRisk, buckets });
});

// Shift overload analyzer — who is being worked too hard, and where shifts are thin.
// Read-only: scores each active employee on rest days skipped, work streaks,
// total days worked and lateness, plus a department shift-staffing view.
router.get('/overload', (req, res) => {
  const month = req.query.month || monthStr();
  const [y, m] = month.split('-').map(Number);
  const totalDays = new Date(y, m, 0).getDate();

  const emps = db.prepare(
    "SELECT id, name, emp_code, department, shift, salary, monthly_allowed_holidays FROM employees WHERE status='active'"
  ).all();

  const attRows = db.prepare(
    'SELECT employee_id, date, status, is_late FROM attendance WHERE substr(date,1,7) = ? ORDER BY employee_id, date'
  ).all(month);
  const byEmp = {};
  for (const r of attRows) (byEmp[r.employee_id] ||= []).push(r);

  // Longest run of consecutive calendar days actually worked (present/half_day).
  const longestStreak = (dates) => {
    if (!dates.length) return 0;
    const days = [...new Set(dates.map((d) => Number(d.slice(8, 10))))].sort((a, b) => a - b);
    let best = 1, cur = 1;
    for (let i = 1; i < days.length; i++) {
      if (days[i] === days[i - 1] + 1) { cur++; if (cur > best) best = cur; }
      else cur = 1;
    }
    return best;
  };

  const employees = emps.map((e) => {
    const rows = byEmp[e.id] || [];
    let present = 0, half = 0, weeklyOff = 0, late = 0;
    const workedDates = [];
    for (const r of rows) {
      if (r.status === 'present') { present++; workedDates.push(r.date); }
      else if (r.status === 'half_day') { half++; workedDates.push(r.date); }
      else if (r.status === 'weekly_off') weeklyOff++;
      if (r.is_late) late++;
    }
    const daysWorked = present + half;
    const allowed = e.monthly_allowed_holidays ?? 0;
    const restSkipped = Math.max(0, allowed - weeklyOff);
    const streak = longestStreak(workedDates);
    const expectedWorkDays = Math.max(0, totalDays - allowed);
    const extraDaysWorked = Math.max(0, daysWorked - expectedWorkDays);

    // Transparent weighted score (0–100). Components returned so the UI can justify it.
    const comp = {
      rest: restSkipped * 12,
      streak: Math.max(0, streak - 6) * 8,
      extra: extraDaysWorked * 3,
      late: late * 2,
    };
    const score = Math.min(100, Math.round(comp.rest + comp.streak + comp.extra + comp.late));
    const level = score >= 50 ? 'high' : score >= 25 ? 'moderate' : score > 0 ? 'low' : 'ok';
    const overtimeValue = Math.round((e.salary / totalDays) * restSkipped);

    return {
      employee_id: e.id, name: e.name, emp_code: e.emp_code, department: e.department, shift: e.shift,
      present, half_day: half, weekly_off: weeklyOff, days_worked: daysWorked, allowed,
      rest_skipped: restSkipped, longest_streak: streak, late, extra_days_worked: extraDaysWorked,
      overtime_value: overtimeValue, score, level, components: comp,
    };
  }).sort((a, b) => b.score - a.score);

  // Department shift-staffing (based on each employee's fixed shift assignment).
  const deptMap = {};
  for (const e of emps) {
    const d = e.department || '—';
    deptMap[d] ||= { department: d, morning: 0, evening: 0, unassigned: 0, total: 0 };
    deptMap[d].total++;
    if (e.shift === 'morning') deptMap[d].morning++;
    else if (e.shift === 'evening') deptMap[d].evening++;
    else deptMap[d].unassigned++;
  }
  const departments = Object.values(deptMap).map((d) => ({
    ...d,
    // A shift is "thin" when a 2+ person team leaves one shift empty.
    thin_shift: d.total >= 2 && (d.morning === 0 || d.evening === 0),
    skew: d.total ? Math.round((Math.abs(d.morning - d.evening) / d.total) * 100) : 0,
  })).sort((a, b) => b.skew - a.skew);

  const summary = {
    high: employees.filter((e) => e.level === 'high').length,
    moderate: employees.filter((e) => e.level === 'moderate').length,
    total_rest_skipped: employees.reduce((s, e) => s + e.rest_skipped, 0),
    total_overtime_value: employees.reduce((s, e) => s + e.overtime_value, 0),
    thin_departments: departments.filter((d) => d.thin_shift).length,
  };

  res.json({ month, totalDays, summary, employees, departments });
});

// Celebrations: birthdays & work anniversaries in next 30 days
router.get('/celebrations', (req, res) => {
  const emps = db.prepare("SELECT id, name, emp_code, department, dob, joining_date, photo_url FROM employees WHERE status='active'").all();
  const now = new Date();
  const within = (mmdd) => {
    if (!mmdd) return null;
    const [, m, d] = mmdd.split('-');
    let next = new Date(now.getFullYear(), Number(m) - 1, Number(d));
    if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) next.setFullYear(now.getFullYear() + 1);
    const diff = Math.round((next - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    return diff;
  };
  const birthdays = [];
  const anniversaries = [];
  for (const e of emps) {
    const bd = within(e.dob);
    if (bd !== null && bd <= 30) birthdays.push({ ...e, in_days: bd });
    const an = within(e.joining_date);
    if (an !== null && an <= 30) {
      const years = now.getFullYear() - Number(e.joining_date.slice(0, 4));
      anniversaries.push({ ...e, in_days: an, years });
    }
  }
  birthdays.sort((a, b) => a.in_days - b.in_days);
  anniversaries.sort((a, b) => a.in_days - b.in_days);
  res.json({ birthdays, anniversaries });
});

export default router;
