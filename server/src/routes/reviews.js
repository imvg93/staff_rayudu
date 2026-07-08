import express from 'express';
import QRCode from 'qrcode';
import db from '../db.js';
import { requireRole } from '../middleware/auth.js';
import {
  employeeStats, ensureToken, periodStart, performanceScore, bonusFor,
  BONUS_RULES, SUB_DIMENSIONS, STAR_PERFORMER_MIN_FIVE,
} from '../reviewEngine.js';

const router = express.Router();

const EMP_COLS = `e.name AS employee_name, e.emp_code, e.department, e.branch, e.designation, e.photo_url`;

// ── LIST reviews with filters ─────────────────────────────
// filters: employee_id, branch, department, rating, status, from, to, q, recommend
router.get('/', (req, res) => {
  const { employee_id, branch, department, rating, status, from, to, q, recommend } = req.query;
  let sql = `SELECT r.*, ${EMP_COLS} FROM reviews r JOIN employees e ON e.id = r.employee_id WHERE 1=1`;
  const p = [];
  if (employee_id) { sql += ' AND r.employee_id = ?'; p.push(employee_id); }
  if (branch)      { sql += ' AND e.branch = ?'; p.push(branch); }
  if (department)  { sql += ' AND e.department = ?'; p.push(department); }
  if (rating)      { sql += ' AND r.overall_rating = ?'; p.push(Number(rating)); }
  if (status)      { sql += ' AND r.status = ?'; p.push(status); }
  if (recommend === 'yes') sql += ' AND r.recommend = 1';
  if (recommend === 'no')  sql += ' AND r.recommend = 0';
  if (from)        { sql += ' AND r.created_at >= ?'; p.push(from); }
  if (to)          { sql += ' AND r.created_at <= ?'; p.push(to + 'T23:59:59'); }
  if (q) {
    sql += ' AND (r.comment LIKE ? OR r.customer_name LIKE ? OR e.name LIKE ?)';
    const like = `%${q}%`; p.push(like, like, like);
  }
  sql += ' ORDER BY r.created_at DESC LIMIT 500';
  res.json(db.prepare(sql).all(...p));
});

// ── Distinct branches (for filters) ───────────────────────
router.get('/branches', (req, res) => {
  const rows = db.prepare("SELECT DISTINCT branch FROM employees WHERE branch IS NOT NULL AND branch != '' ORDER BY branch").all();
  res.json(rows.map((r) => r.branch));
});

// ── Employee performance dashboard ────────────────────────
router.get('/employee/:id', (req, res) => {
  const id = req.params.id;
  const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });

  const now = new Date();
  const thisMonthKey = now.toISOString().slice(0, 7);
  const lastMonthDate = new Date(now); lastMonthDate.setMonth(now.getMonth() - 1);
  const lastMonthKey = lastMonthDate.toISOString().slice(0, 7);

  const monthAvg = (ym) => {
    const r = db.prepare(
      "SELECT COALESCE(AVG(overall_rating),0) a, COUNT(*) n FROM reviews WHERE employee_id=? AND status!='hidden' AND substr(created_at,1,7)=?"
    ).get(id, ym);
    return { avg: Math.round(r.a * 100) / 100, count: r.n };
  };

  const trend = db.prepare(`
    SELECT substr(created_at,1,7) AS ym, ROUND(AVG(overall_rating),2) AS avg, COUNT(*) AS count
    FROM reviews WHERE employee_id=? AND status!='hidden'
    GROUP BY ym ORDER BY ym
  `).all(id);

  const recent = db.prepare(`
    SELECT r.*, ${EMP_COLS} FROM reviews r JOIN employees e ON e.id=r.employee_id
    WHERE r.employee_id=? AND r.status!='hidden' ORDER BY r.created_at DESC LIMIT 8
  `).all(id);

  res.json({
    employee: { ...emp, qr_token: ensureToken(id) },
    stats: employeeStats(id),
    thisMonth: monthAvg(thisMonthKey),
    lastMonth: monthAvg(lastMonthKey),
    trend,
    recent,
  });
});

// ── Overall admin analytics ───────────────────────────────
router.get('/analytics', (req, res) => {
  const base = "FROM reviews r JOIN employees e ON e.id=r.employee_id WHERE r.status!='hidden'";

  const overall = db.prepare(`
    SELECT COUNT(*) total, COALESCE(AVG(overall_rating),0) avg,
      SUM(CASE WHEN overall_rating>=4 THEN 1 ELSE 0 END) positive,
      SUM(CASE WHEN overall_rating<=2 THEN 1 ELSE 0 END) negative,
      COALESCE(AVG(response_time),0) avg_response
    ${base}
  `).get();

  const byBranch = db.prepare(`
    SELECT e.branch AS name, COUNT(*) reviews, ROUND(AVG(r.overall_rating),2) avg
    ${base} GROUP BY e.branch ORDER BY avg DESC
  `).all();

  const byDept = db.prepare(`
    SELECT e.department AS name, COUNT(*) reviews, ROUND(AVG(r.overall_rating),2) avg
    ${base} GROUP BY e.department ORDER BY avg DESC
  `).all();

  const perEmp = db.prepare(`
    SELECT e.id, e.name, e.emp_code, e.department, e.branch, e.photo_url,
      COUNT(*) reviews, ROUND(AVG(r.overall_rating),2) avg
    ${base} GROUP BY e.id HAVING reviews >= 3
  `).all();
  const topPerformers = [...perEmp].sort((a, b) => b.avg - a.avg || b.reviews - a.reviews).slice(0, 5);
  const needImprovement = [...perEmp].sort((a, b) => a.avg - b.avg || b.reviews - a.reviews).slice(0, 5);

  const monthlyGrowth = db.prepare(`
    SELECT substr(created_at,1,7) AS ym, COUNT(*) AS reviews, ROUND(AVG(overall_rating),2) AS avg
    FROM reviews WHERE status!='hidden' GROUP BY ym ORDER BY ym
  `).all();

  const total = overall.total || 0;
  res.json({
    totalReviews: total,
    overallAvg: Math.round((overall.avg || 0) * 100) / 100,
    positive: overall.positive || 0,
    negative: overall.negative || 0,
    satisfaction: total ? Math.round(((overall.positive || 0) / total) * 100) : 0,
    avgResponseScore: Math.round((overall.avg_response || 0) * 100) / 100,
    byBranch, byDept, topPerformers, needImprovement, monthlyGrowth,
  });
});

// ── Leaderboard ───────────────────────────────────────────
router.get('/leaderboard', (req, res) => {
  const period = req.query.period || 'all';
  const since = periodStart(period);
  const p = [];
  let where = "r.status != 'hidden'";
  if (since) { where += ' AND r.created_at >= ?'; p.push(since); }

  const rows = db.prepare(`
    SELECT e.id, e.name, e.emp_code, e.department, e.branch, e.photo_url,
      COUNT(*) reviews, ROUND(AVG(r.overall_rating),2) avg,
      SUM(CASE WHEN r.overall_rating=5 THEN 1 ELSE 0 END) five_star,
      SUM(CASE WHEN r.recommend=1 THEN 1 ELSE 0 END) recommend_yes
    FROM reviews r JOIN employees e ON e.id=r.employee_id
    WHERE ${where} AND e.status='active'
    GROUP BY e.id
  `).all(...p);

  const ranked = rows.map((r) => {
    const recommendRate = r.reviews ? r.recommend_yes / r.reviews : 0;
    const score = performanceScore({ avg: r.avg, reviews: r.reviews, recommendRate });
    const bonus = bonusFor(r.avg, r.reviews);
    return {
      ...r,
      recommendRate: Math.round(recommendRate * 100),
      performanceScore: score,
      bonus,
      starPerformer: r.five_star >= STAR_PERFORMER_MIN_FIVE,
    };
  }).sort((a, b) => b.performanceScore - a.performanceScore || b.avg - a.avg || b.reviews - a.reviews)
    .map((r, i) => ({ rank: i + 1, ...r }));

  // Employee of the Month = best score among reviewers in the last 30 days.
  const eotm = ranked.length ? ranked[0] : null;
  res.json({ period, employeeOfMonth: eotm, rows: ranked });
});

// ── Bonus eligibility report ──────────────────────────────
router.get('/bonus', (req, res) => {
  const rows = db.prepare(`
    SELECT e.id, e.name, e.emp_code, e.department, e.branch, e.photo_url,
      COUNT(*) reviews, ROUND(AVG(r.overall_rating),2) avg,
      SUM(CASE WHEN r.overall_rating=5 THEN 1 ELSE 0 END) five_star,
      SUM(CASE WHEN r.recommend=1 THEN 1 ELSE 0 END) recommend_yes
    FROM reviews r JOIN employees e ON e.id=r.employee_id
    WHERE r.status!='hidden' AND e.status='active'
    GROUP BY e.id ORDER BY avg DESC
  `).all();
  const result = rows.map((r) => {
    const recommendRate = r.reviews ? r.recommend_yes / r.reviews : 0;
    return {
      ...r,
      recommendRate: Math.round(recommendRate * 100),
      performanceScore: performanceScore({ avg: r.avg, reviews: r.reviews, recommendRate }),
      bonus: bonusFor(r.avg, r.reviews),
      starPerformer: r.five_star >= STAR_PERFORMER_MIN_FIVE,
    };
  });
  res.json({ rules: BONUS_RULES, starPerformerMin: STAR_PERFORMER_MIN_FIVE, rows: result });
});

// ── QR code for an employee (data URL PNG + review link) ──
router.get('/qr/:employeeId', async (req, res) => {
  const emp = db.prepare('SELECT id, name, emp_code, department, branch, photo_url FROM employees WHERE id = ?').get(req.params.employeeId);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  const token = ensureToken(emp.id);
  const origin = (req.query.origin || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const url = `${origin}/r/${token}`;
  const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: '#0F172A', light: '#FFFFFF' } });
  res.json({ employee: emp, token, url, dataUrl });
});

// ── Moderation: change status ─────────────────────────────
router.put('/:id/status', requireRole('owner', 'admin', 'supervisor'), (req, res) => {
  const { status } = req.body;
  if (!['verified', 'flagged', 'hidden'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const r = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json(db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id));
});

// ── Moderation: admin response ────────────────────────────
router.put('/:id/respond', requireRole('owner', 'admin', 'supervisor'), (req, res) => {
  const r = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE reviews SET admin_response = ? WHERE id = ?').run(req.body.admin_response || null, req.params.id);
  res.json(db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id));
});

// ── CSV export ────────────────────────────────────────────
router.get('/export', (req, res) => {
  const rows = db.prepare(`
    SELECT r.id, e.emp_code, e.name AS employee, e.department, e.branch,
      r.overall_rating, r.professionalism, r.communication, r.knowledge,
      r.friendliness, r.response_time, r.overall_experience,
      r.recommend, r.status, r.customer_name, r.customer_mobile,
      REPLACE(REPLACE(COALESCE(r.comment,''), '"', '""'), CHAR(10), ' ') AS comment,
      r.created_at
    FROM reviews r JOIN employees e ON e.id=r.employee_id
    ORDER BY r.created_at DESC
  `).all();
  const headers = Object.keys(rows[0] || {
    id: '', emp_code: '', employee: '', department: '', branch: '', overall_rating: '',
  });
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => {
      const v = r[h] ?? '';
      return typeof v === 'string' && (v.includes(',') || v.includes('"')) ? `"${v}"` : v;
    }).join(',')),
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="employee-reviews.csv"');
  res.send(csv);
});

export default router;
