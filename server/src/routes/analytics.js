import express from 'express';
import db from '../db.js';

const router = express.Router();
const todayStr = () => new Date().toISOString().slice(0, 10);
const monthStr = () => new Date().toISOString().slice(0, 7);

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
