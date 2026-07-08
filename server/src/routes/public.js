import express from 'express';
import db from '../db.js';
import { SUB_DIMENSIONS } from '../reviewEngine.js';

// Customer-facing endpoints — intentionally UNAUTHENTICATED.
// Reached after scanning an employee's QR code; no login required.
const router = express.Router();

// Basic public profile for the review form (never exposes salary/phone/etc.)
router.get('/employee/:token', (req, res) => {
  const emp = db.prepare(
    "SELECT id, name, emp_code, department, branch, designation, photo_url FROM employees WHERE qr_token = ? AND status = 'active'"
  ).get(req.params.token);
  if (!emp) return res.status(404).json({ error: 'This review link is invalid or no longer active.' });

  const agg = db.prepare(
    "SELECT COUNT(*) total, COALESCE(AVG(overall_rating),0) avg FROM reviews WHERE employee_id=? AND status!='hidden'"
  ).get(emp.id);

  res.json({
    employee: emp,
    totalReviews: agg.total || 0,
    avgRating: Math.round((agg.avg || 0) * 100) / 100,
    dimensions: SUB_DIMENSIONS,
  });
});

// Submit a review for the scanned employee.
router.post('/review', (req, res) => {
  const b = req.body || {};
  const emp = db.prepare("SELECT id, name FROM employees WHERE qr_token = ? AND status = 'active'").get(b.token);
  if (!emp) return res.status(404).json({ error: 'Invalid review link.' });

  const rating = Number(b.overall_rating);
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Please give an overall rating (1–5 stars).' });

  const clamp = (v) => {
    const n = Number(v);
    return n >= 1 && n <= 5 ? n : null;
  };
  const now = new Date().toISOString();

  const info = db.prepare(`
    INSERT INTO reviews
      (employee_id, overall_rating, professionalism, communication, knowledge,
       friendliness, response_time, overall_experience, comment, recommend,
       customer_name, customer_mobile, customer_email, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 'verified', ?)
  `).run(
    emp.id, rating,
    clamp(b.professionalism), clamp(b.communication), clamp(b.knowledge),
    clamp(b.friendliness), clamp(b.response_time), clamp(b.overall_experience),
    (b.comment || '').trim() || null,
    b.recommend === false || b.recommend === 'no' || b.recommend === 0 ? 0 : 1,
    (b.customer_name || '').trim() || null,
    (b.customer_mobile || '').trim() || null,
    (b.customer_email || '').trim() || null,
    now,
  );

  // Fan out notifications (new review + low-rating alert).
  const insNotif = db.prepare(`
    INSERT INTO review_notifications (type, employee_id, review_id, title, message, severity, created_at)
    VALUES (?,?,?,?,?,?,?)
  `);
  insNotif.run('new_review', emp.id, info.lastInsertRowid,
    'New review received', `${emp.name} received a ${rating}★ review.`,
    'info', now);
  if (rating <= 2) {
    insNotif.run('low_rating', emp.id, info.lastInsertRowid,
      'Low rating alert', `${emp.name} received a ${rating}★ review — needs attention.`,
      'alert', now);
  }

  res.status(201).json({ ok: true, message: 'Thank you! Your feedback has been recorded.' });
});

export default router;
