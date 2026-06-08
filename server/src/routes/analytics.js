import express from 'express';
import db from '../db.js';

const router = express.Router();
const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = () => localDate();
const monthStr = () => localDate().slice(0, 7);

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
  const monthExpenses = db.prepare("SELECT COALESCE(SUM(amount),0) s FROM expenses WHERE substr(date,1,7)=?").get(month).s;
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

  // last 7 days expense trend
  const expenseTrend = db.prepare(`
    SELECT date, SUM(amount) AS total FROM expenses
    WHERE date >= date('now','-7 days')
    GROUP BY date ORDER BY date
  `).all();

  res.json({
    totalEmployees,
    present: todayCounts.present || 0,
    absent: todayCounts.absent || 0,
    halfDay: todayCounts.half_day || 0,
    onLeaveToday,
    newJoiners,
    salaryExpense,
    outstandingAdvances,
    monthExpenses,
    pendingLeaves,
    deptDistribution,
    topAttendance,
    lowAttendance,
    expenseTrend,
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
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth(); // 0-indexed
  const moNum = mo + 1;
  const monthStr = `${yr}-${String(moNum).padStart(2, '0')}`;
  const firstOfMonth = `${monthStr}-01`;
  const daysInMonth = new Date(yr, moNum, 0).getDate();

  // Yesterday — use local date parts to avoid UTC offset shifting the day
  const yday = new Date(yr, mo, now.getDate() - 1);
  const ydayStr = `${yday.getFullYear()}-${String(yday.getMonth() + 1).padStart(2, '0')}-${String(yday.getDate()).padStart(2, '0')}`;
  // Only count days that fall within the current month
  const daysElapsed = ydayStr >= firstOfMonth ? yday.getDate() : 0;

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
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth();
  const moNum = mo + 1;
  const monthStr = `${yr}-${String(moNum).padStart(2, '0')}`;
  const firstOfMonth = `${monthStr}-01`;
  const daysInMonth = new Date(yr, moNum, 0).getDate();

  const yday = new Date(yr, mo, now.getDate() - 1);
  const ydayStr = `${yday.getFullYear()}-${String(yday.getMonth() + 1).padStart(2, '0')}-${String(yday.getDate()).padStart(2, '0')}`;
  const daysElapsed = ydayStr >= firstOfMonth ? yday.getDate() : 0;

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
