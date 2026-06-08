import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) =>
    cb(null, `emp-${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

const FIELDS = ['name','department','designation','joining_date','salary','shift',
  'phone','emergency_name','emergency_phone','dob','status','photo_url'];

function nextEmpCode() {
  const row = db.prepare("SELECT emp_code FROM employees WHERE emp_code LIKE 'RGM%' ORDER BY id DESC").all();
  let max = 0;
  for (const r of row) {
    const n = parseInt(String(r.emp_code).replace(/\D/g, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return 'RGM' + String(max + 1).padStart(3, '0');
}

router.get('/', (req, res) => {
  const { department, status } = req.query;
  let sql = 'SELECT * FROM employees WHERE 1=1';
  const params = [];
  if (department) { sql += ' AND department = ?'; params.push(department); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY emp_code';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const code = nextEmpCode();
  const b = req.body;
  const photo = b.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(b.name || code)}`;
  const info = db.prepare(`INSERT INTO employees
    (emp_code,name,photo_url,department,designation,joining_date,salary,shift,phone,emergency_name,emergency_phone,dob,status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      code, b.name, photo, b.department, b.designation, b.joining_date,
      b.salary || 0, b.shift, b.phone, b.emergency_name, b.emergency_phone, b.dob, b.status || 'active');
  res.status(201).json(db.prepare('SELECT * FROM employees WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const cols = FIELDS.filter((f) => req.body[f] !== undefined);
  if (!cols.length) return res.status(400).json({ error: 'No data' });
  const setSql = cols.map((f) => `${f} = ?`).join(',');
  db.prepare(`UPDATE employees SET ${setSql} WHERE id = ?`).run(...cols.map((f) => req.body[f]), req.params.id);
  res.json(db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Photo upload -> returns a URL the client can store as photo_url
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

export default router;
