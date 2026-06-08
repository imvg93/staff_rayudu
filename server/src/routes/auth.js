import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken, auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get((email || '').trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
