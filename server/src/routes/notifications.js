import express from 'express';
import db from '../db.js';

const router = express.Router();

// List recent notifications (optionally unread only)
router.get('/', (req, res) => {
  const unread = req.query.unread === '1';
  const rows = db.prepare(`
    SELECT n.*, e.name AS employee_name, e.photo_url, e.emp_code
    FROM review_notifications n LEFT JOIN employees e ON e.id = n.employee_id
    ${unread ? 'WHERE n.is_read = 0' : ''}
    ORDER BY n.created_at DESC LIMIT 50
  `).all();
  const unreadCount = db.prepare('SELECT COUNT(*) c FROM review_notifications WHERE is_read = 0').get().c;
  res.json({ unreadCount, rows });
});

router.put('/:id/read', (req, res) => {
  db.prepare('UPDATE review_notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/read-all', (req, res) => {
  db.prepare('UPDATE review_notifications SET is_read = 1 WHERE is_read = 0').run();
  res.json({ ok: true });
});

export default router;
