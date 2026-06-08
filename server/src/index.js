import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

import './db.js'; // ensure schema exists
import { auth } from './middleware/auth.js';
import { crudRouter } from './crud.js';

import authRoutes from './routes/auth.js';
import employeesRoutes from './routes/employees.js';
import attendanceRoutes from './routes/attendance.js';
import payrollRoutes from './routes/payroll.js';
import expensesRoutes from './routes/expenses.js';
import leavesRoutes from './routes/leaves.js';
import timelineRoutes from './routes/timeline.js';
import analyticsRoutes from './routes/analytics.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'RGM Staff API' }));

// public
app.use('/api/auth', authRoutes);

// everything below requires a valid session
app.use('/api', auth);

app.use('/api/employees', employeesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/analytics', analyticsRoutes);

// simple CRUD modules
app.use('/api/shifts', crudRouter('shifts',
  ['employee_id', 'date', 'shift_type', 'department'], { withEmployee: true, orderBy: 'date DESC' }));
app.use('/api/advances', crudRouter('advances',
  ['employee_id', 'amount', 'date', 'monthly_deduction', 'balance', 'reason'], { withEmployee: true, orderBy: 'date DESC' }));
app.use('/api/penalties', crudRouter('penalties',
  ['employee_id', 'date', 'type', 'amount', 'reason'], { withEmployee: true, orderBy: 'date DESC' }));
app.use('/api/documents', crudRouter('documents',
  ['employee_id', 'doc_type', 'number', 'file_url', 'verified'], { withEmployee: true }));
app.use('/api/performance', crudRouter('performance_notes',
  ['employee_id', 'date', 'type', 'remark', 'created_by'], { withEmployee: true, orderBy: 'date DESC' }));
app.use('/api/assets', crudRouter('assets',
  ['employee_id', 'asset_type', 'quantity', 'issued_date', 'returned', 'return_date'], { withEmployee: true }));
app.use('/api/promotions', crudRouter('promotions',
  ['employee_id', 'date', 'from_designation', 'to_designation', 'salary_before', 'salary_after', 'remarks'], { withEmployee: true, orderBy: 'date DESC' }));
app.use('/api/exits', crudRouter('exits',
  ['employee_id', 'resignation_date', 'last_working_day', 'reason', 'notice_days', 'settlement_amount', 'status'], { withEmployee: true }));

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`RGM Staff API running on http://localhost:${PORT}`));
