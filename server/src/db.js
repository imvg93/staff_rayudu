import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_FILE || 'rgm.db';
const dbPath = path.isAbsolute(DB_FILE) ? DB_FILE : path.join(__dirname, '..', DB_FILE);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','owner','supervisor'))
);

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  emp_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  photo_url TEXT,
  department TEXT NOT NULL,
  designation TEXT,
  joining_date TEXT,
  salary REAL DEFAULT 0,
  shift TEXT,
  phone TEXT,
  emergency_name TEXT,
  emergency_phone TEXT,
  dob TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','exited')),
  monthly_allowed_holidays INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present','absent','half_day','weekly_off','paid_leave','unpaid_leave')),
  check_in TEXT,
  is_late INTEGER DEFAULT 0,
  remarks TEXT,
  UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('morning','evening')),
  department TEXT
);

CREATE TABLE IF NOT EXISTS leaves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  type TEXT,
  reason TEXT,
  days INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected'))
);

CREATE TABLE IF NOT EXISTS advances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  monthly_deduction REAL DEFAULT 0,
  balance REAL DEFAULT 0,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS payroll (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  base_salary REAL DEFAULT 0,
  total_days_in_month INTEGER DEFAULT 30,
  allowed_holidays INTEGER DEFAULT 4,
  present_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  extra_absent_days INTEGER DEFAULT 0,
  half_days INTEGER DEFAULT 0,
  per_day_salary REAL DEFAULT 0,
  absence_deduction REAL DEFAULT 0,
  half_day_deduction REAL DEFAULT 0,
  overtime REAL DEFAULT 0,
  bonus REAL DEFAULT 0,
  advance_deduction REAL DEFAULT 0,
  penalty_deduction REAL DEFAULT 0,
  food_deduction REAL DEFAULT 0,
  other_deductions REAL DEFAULT 0,
  manual_correction REAL DEFAULT 0,
  net_salary REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processed',
  approved_by TEXT,
  approved_at TEXT,
  UNIQUE(employee_id, month)
);

CREATE TABLE IF NOT EXISTS penalties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT,
  amount REAL NOT NULL,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  note TEXT,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  number TEXT,
  file_url TEXT,
  verified INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS performance_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('appreciation','warning','note')),
  remark TEXT,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  issued_date TEXT,
  returned INTEGER DEFAULT 0,
  return_date TEXT
);

CREATE TABLE IF NOT EXISTS exits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  resignation_date TEXT,
  last_working_day TEXT,
  reason TEXT,
  notice_days INTEGER DEFAULT 0,
  settlement_amount REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  from_designation TEXT,
  to_designation TEXT,
  salary_before REAL DEFAULT 0,
  salary_after REAL DEFAULT 0,
  remarks TEXT
);
`;

export function initSchema() {
  db.exec(SCHEMA);
}

initSchema();

export default db;
