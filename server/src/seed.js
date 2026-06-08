import bcrypt from 'bcryptjs';
import db, { SCHEMA } from './db.js';

// ---- helpers ---------------------------------------------------------------
const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const daysAgo = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return iso(d);
};
const inDays = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return iso(d);
};
// a date this year on given month/day (for birthdays / anniversaries)
const thisYear = (mm, dd) => `${today.getFullYear()}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
const monthKey = (d = today) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

console.log('Resetting database…');
const tables = ['payroll','attendance','shifts','leaves','advances','penalties','expenses',
  'documents','performance_notes','assets','exits','promotions','employees','users'];
db.exec('PRAGMA foreign_keys = OFF;');
for (const t of tables) db.exec(`DROP TABLE IF EXISTS ${t};`);
db.exec('PRAGMA foreign_keys = ON;');
db.exec(SCHEMA);

// ---- users -----------------------------------------------------------------
const insUser = db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)');
const hash = (p) => bcrypt.hashSync(p, 8);
insUser.run('Rayudu (Owner)', 'owner@rayudu.com', hash('owner123'), 'owner');
insUser.run('Hotel Admin', 'admin@rayudu.com', hash('admin123'), 'admin');
insUser.run('Suresh (Supervisor)', 'supervisor@rayudu.com', hash('super123'), 'supervisor');

// ---- employees -------------------------------------------------------------
const DEPTS = ['Kitchen', 'Dining Service', 'Counter', 'Parcel', 'Cleaning'];
const employees = [
  ['Ravi Kumar',        'Kitchen',        'Head Chef',          22000, 'morning', thisYear(6, 10), '1988-06-10'],
  ['Anjaneyulu',        'Kitchen',        'Cook',               18000, 'morning', thisYear(3, 22), '1990-11-02'],
  ['Mahesh Babu',       'Kitchen',        'Assistant Cook',     14000, 'evening', thisYear(1, 15), '1995-06-12'],
  ['Srinivas Rao',      'Kitchen',        'Tandoor Specialist', 17000, 'evening', thisYear(8, 5),  '1987-09-19'],
  ['Lakshmi Devi',      'Dining Service', 'Steward',            13000, 'morning', thisYear(2, 8),  '1993-04-25'],
  ['Venkatesh',         'Dining Service', 'Waiter',             12500, 'evening', thisYear(5, 30), '1996-12-01'],
  ['Naveen Reddy',      'Dining Service', 'Waiter',             12500, 'morning', thisYear(7, 14), '1998-06-09'],
  ['Prasad',            'Dining Service', 'Captain',            16000, 'evening', thisYear(4, 3),  '1985-02-17'],
  ['Kiran Kumar',       'Counter',        'Cashier',            19000, 'morning', thisYear(9, 12), '1991-07-21'],
  ['Sai Teja',          'Counter',        'Billing Assistant',  14500, 'evening', thisYear(11, 1), '1997-03-30'],
  ['Ramesh',            'Parcel',         'Parcel Incharge',    15500, 'morning', thisYear(2, 18), '1989-10-08'],
  ['Suresh Goud',       'Parcel',         'Packing Staff',      12000, 'evening', thisYear(6, 6),  '1999-06-15'],
  ['Bhaskar',           'Parcel',         'Delivery Coord.',    13500, 'morning', thisYear(10, 25),'1994-08-11'],
  ['Yadamma',           'Cleaning',       'Housekeeping',       11000, 'morning', thisYear(1, 5),  '1980-05-20'],
  ['Pochamma',          'Cleaning',       'Housekeeping',       11000, 'evening', thisYear(3, 9),  '1982-01-28'],
  ['Narsing Rao',       'Cleaning',       'Utility',            11500, 'morning', thisYear(12, 2), '1986-06-07'],
  ['Govardhan',         'Kitchen',        'Helper',             12000, 'evening', thisYear(5, 16), '2000-09-03'],
  ['Shankar',           'Dining Service', 'Waiter',             12500, 'morning', thisYear(8, 27), '1992-06-08'],
];

const insEmp = db.prepare(`INSERT INTO employees
  (emp_code,name,photo_url,department,designation,joining_date,salary,shift,phone,emergency_name,emergency_phone,dob,status,monthly_allowed_holidays)
  VALUES (@emp_code,@name,@photo_url,@department,@designation,@joining_date,@salary,@shift,@phone,@emergency_name,@emergency_phone,@dob,@status,@monthly_allowed_holidays)`);

const empIds = [];
employees.forEach((e, i) => {
  const [name, department, designation, salary, shift, joining_date, dob] = e;
  const code = 'RGM' + String(i + 1).padStart(3, '0');
  const info = insEmp.run({
    emp_code: code,
    name,
    photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    department,
    designation,
    joining_date,
    salary,
    shift,
    phone: '98' + String(400000000 + i * 137711).slice(0, 8),
    emergency_name: 'Family Contact',
    emergency_phone: '90' + String(100000000 + i * 211733).slice(0, 8),
    dob,
    status: 'active',
    monthly_allowed_holidays: 0,
  });
  empIds.push(info.lastInsertRowid);
});

// One exited employee
const exitedInfo = insEmp.run({
  emp_code: 'RGM019',
  name: 'Mohan Das',
  photo_url: 'https://api.dicebear.com/7.x/initials/svg?seed=Mohan%20Das',
  department: 'Dining Service',
  designation: 'Waiter',
  joining_date: '2023-05-01',
  salary: 12500,
  shift: 'evening',
  phone: '9876500019',
  emergency_name: 'Family Contact',
  emergency_phone: '9012300019',
  dob: '1990-02-14',
  status: 'exited',
  monthly_allowed_holidays: 0,
});
const exitedId = exitedInfo.lastInsertRowid;

// ---- attendance (last 30 days) --------------------------------------------
const insAtt = db.prepare(`INSERT OR IGNORE INTO attendance
  (employee_id,date,status,check_in,is_late,remarks) VALUES (?,?,?,?,?,?)`);
empIds.forEach((id, idx) => {
  for (let d = 30; d >= 0; d--) {
    const date = daysAgo(d);
    const dow = new Date(date).getDay();
    // deterministic pseudo-pattern per employee
    const r = (idx * 7 + d * 3) % 20;
    let status = 'present';
    let late = 0;
    let checkIn = '09:05';
    if (r === 0) status = 'absent';
    else if (r === 1) status = 'half_day';
    else if (r === 2) status = 'weekly_off';
    else if (r === 3 || r === 4) { late = 1; checkIn = '09:45'; }
    if (status === 'absent' || status === 'weekly_off') checkIn = null;
    insAtt.run(id, date, status, checkIn, late, late ? 'Late arrival' : null);
  }
});

// ---- demo: Anjaneyulu (₹18,000) has 7 absents this month → 3 extra → ₹1,800 deduction ------
const curMonth = monthKey(today);
const demoEmpId = empIds[1]; // Anjaneyulu
const overrideAtt = db.prepare(`
  INSERT INTO attendance (employee_id,date,status,check_in,is_late,remarks)
  VALUES (?,?,'absent',null,0,'Demo absence')
  ON CONFLICT(employee_id,date) DO UPDATE SET
    status='absent', check_in=null, is_late=0, remarks='Demo absence'
`);
for (let d = 1; d <= 7; d++) {
  overrideAtt.run(demoEmpId, `${curMonth}-${String(d).padStart(2, '0')}`);
}
// add a few paid_leave and weekly_off records for other employees (current month) for variety
const insExtraAtt = db.prepare(`
  INSERT OR IGNORE INTO attendance (employee_id,date,status,check_in,is_late,remarks)
  VALUES (?,?,?,null,0,?)
`);
insExtraAtt.run(empIds[0], `${curMonth}-04`, 'paid_leave', 'Approved PL');
insExtraAtt.run(empIds[0], `${curMonth}-05`, 'paid_leave', 'Approved PL');
insExtraAtt.run(empIds[3], `${curMonth}-07`, 'unpaid_leave', 'Unpaid leave taken');
insExtraAtt.run(empIds[5], `${curMonth}-04`, 'weekly_off', 'Weekly off');
insExtraAtt.run(empIds[5], `${curMonth}-11`, 'weekly_off', 'Weekly off');

// ---- shifts (next 7 days) --------------------------------------------------
const insShift = db.prepare('INSERT INTO shifts (employee_id,date,shift_type,department) VALUES (?,?,?,?)');
empIds.forEach((id, idx) => {
  const emp = employees[idx];
  for (let d = 0; d < 7; d++) {
    insShift.run(id, inDays(d), emp[4], emp[1]);
  }
});

// ---- leaves ----------------------------------------------------------------
const insLeave = db.prepare(`INSERT INTO leaves
  (employee_id,from_date,to_date,type,reason,days,status) VALUES (?,?,?,?,?,?,?)`);
insLeave.run(empIds[5], inDays(2), inDays(3), 'Casual', 'Personal work', 2, 'pending');
insLeave.run(empIds[9], inDays(5), inDays(5), 'Sick', 'Fever', 1, 'pending');
insLeave.run(empIds[1], daysAgo(10), daysAgo(8), 'Casual', 'Village function', 3, 'approved');
insLeave.run(empIds[13], daysAgo(20), daysAgo(19), 'Sick', 'Health checkup', 2, 'approved');
insLeave.run(empIds[7], daysAgo(5), daysAgo(5), 'Casual', 'Not specified', 1, 'rejected');

// ---- advances --------------------------------------------------------------
const insAdv = db.prepare(`INSERT INTO advances
  (employee_id,amount,date,monthly_deduction,balance,reason) VALUES (?,?,?,?,?,?)`);
insAdv.run(empIds[0], 5000, daysAgo(40), 1000, 3000, 'Medical');
insAdv.run(empIds[2], 3000, daysAgo(25), 1000, 2000, 'Festival');
insAdv.run(empIds[8], 10000, daysAgo(60), 2000, 4000, 'House rent');
insAdv.run(empIds[11], 2000, daysAgo(15), 1000, 2000, 'Personal');

// ---- penalties -------------------------------------------------------------
const insPen = db.prepare('INSERT INTO penalties (employee_id,date,type,amount,reason) VALUES (?,?,?,?,?)');
insPen.run(empIds[2], daysAgo(12), 'Late Arrival', 500, 'Repeated late attendance (5 times)');
insPen.run(empIds[5], daysAgo(8), 'Policy Violation', 300, 'Uniform not worn');
insPen.run(empIds[14], daysAgo(18), 'Equipment Damage', 700, 'Broke serving tray set');

// ---- expenses (last 20 days, hotel categories) -----------------------------
const insExp = db.prepare('INSERT INTO expenses (date,category,amount,note,created_by) VALUES (?,?,?,?,?)');
const expCats = [
  ['milk', 3500], ['vegetables', 2800], ['chicken', 6500], ['mutton', 8200],
  ['gas', 1200], ['misc', 900],
];
for (let d = 20; d >= 0; d--) {
  const date = daysAgo(d);
  // pick 2-3 categories per day
  const n = 2 + (d % 2);
  for (let k = 0; k < n; k++) {
    const [cat, base] = expCats[(d + k) % expCats.length];
    const amount = Math.round(base * (0.8 + ((d * 7 + k * 3) % 5) / 10));
    insExp.run(date, cat, amount, `Daily ${cat} purchase`, 'Suresh (Supervisor)');
  }
}

// ---- documents -------------------------------------------------------------
const insDoc = db.prepare('INSERT INTO documents (employee_id,doc_type,number,file_url,verified) VALUES (?,?,?,?,?)');
empIds.slice(0, 10).forEach((id, i) => {
  insDoc.run(id, 'aadhaar', `XXXX-XXXX-${1000 + i}`, null, 1);
  insDoc.run(id, 'pan', `ABCDE${1000 + i}F`, null, i % 2);
  insDoc.run(id, 'bank', `SBIN000${2000 + i}`, null, 1);
});

// ---- performance notes -----------------------------------------------------
const insNote = db.prepare('INSERT INTO performance_notes (employee_id,date,type,remark,created_by) VALUES (?,?,?,?,?)');
insNote.run(empIds[0], daysAgo(6), 'appreciation', 'Handled peak-hour customer crowd efficiently.', 'Suresh (Supervisor)');
insNote.run(empIds[2], daysAgo(12), 'warning', 'Repeated late attendance.', 'Suresh (Supervisor)');
insNote.run(empIds[4], daysAgo(3), 'appreciation', 'Excellent customer feedback during weekend rush.', 'Suresh (Supervisor)');
insNote.run(empIds[8], daysAgo(9), 'note', 'Requested shift change to morning.', 'Suresh (Supervisor)');
insNote.run(empIds[14], daysAgo(18), 'warning', 'Careless handling of equipment.', 'Suresh (Supervisor)');

// ---- assets ----------------------------------------------------------------
const insAsset = db.prepare(`INSERT INTO assets
  (employee_id,asset_type,quantity,issued_date,returned,return_date) VALUES (?,?,?,?,?,?)`);
empIds.slice(0, 12).forEach((id, i) => {
  insAsset.run(id, 'uniform', 2, daysAgo(90), 0, null);
  if (employees[i][1] === 'Kitchen') insAsset.run(id, 'apron', 1, daysAgo(90), 0, null);
  if (employees[i][1] === 'Counter') insAsset.run(id, 'device', 1, daysAgo(90), 0, null);
  insAsset.run(id, 'cap', 1, daysAgo(90), 0, null);
});
insAsset.run(exitedId, 'uniform', 2, daysAgo(200), 1, daysAgo(30));

// ---- payroll (previous month) — computed from actual seeded attendance -----
const prev = new Date(today);
prev.setMonth(prev.getMonth() - 1);
const prevMonthKey = monthKey(prev);
const prevTotalDays = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate();

const getAtt = db.prepare(`
  SELECT
    SUM(CASE WHEN status='absent' OR status='unpaid_leave' THEN 1 ELSE 0 END) AS absent,
    SUM(CASE WHEN status='half_day' THEN 1 ELSE 0 END) AS half_day,
    SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS present
  FROM attendance WHERE employee_id=? AND substr(date,1,7)=?
`);
const insPay = db.prepare(`INSERT OR IGNORE INTO payroll
  (employee_id,month,base_salary,total_days_in_month,allowed_holidays,present_days,absent_days,
   extra_absent_days,half_days,per_day_salary,absence_deduction,half_day_deduction,
   overtime,bonus,advance_deduction,penalty_deduction,food_deduction,other_deductions,
   manual_correction,net_salary,status)
  VALUES (@employee_id,@month,@base_salary,@total_days_in_month,@allowed_holidays,@present_days,@absent_days,
   @extra_absent_days,@half_days,@per_day_salary,@absence_deduction,@half_day_deduction,
   @overtime,@bonus,@advance_deduction,@penalty_deduction,@food_deduction,@other_deductions,
   @manual_correction,@net_salary,@status)`);

empIds.forEach((id, i) => {
  const base = employees[i][3];
  const perDay = Math.round((base / prevTotalDays) * 100) / 100;
  const allowed = 0; // every absent day deducts
  const att = getAtt.get(id, prevMonthKey) || {};
  const absentDays = att.absent || 0;
  const halfDays = att.half_day || 0;
  const presentDays = att.present || 0;
  const extra = Math.max(0, absentDays - allowed); // = absentDays when allowed=0
  const absenceDed = Math.round(perDay * extra);
  const halfDed = Math.round(perDay * 0.5 * halfDays);
  const advDed = [0, 2, 8, 11].includes(i) ? 1000 : 0;
  const penDed = [2, 5, 14].includes(i) ? (i === 2 ? 500 : 300) : 0;
  const net = Math.round(base - absenceDed - halfDed - advDed - penDed);
  insPay.run({
    employee_id: id, month: prevMonthKey, base_salary: base,
    total_days_in_month: prevTotalDays, allowed_holidays: allowed,
    present_days: presentDays, absent_days: absentDays, extra_absent_days: extra,
    half_days: halfDays, per_day_salary: perDay,
    absence_deduction: absenceDed, half_day_deduction: halfDed,
    overtime: 0, bonus: 0, advance_deduction: advDed, penalty_deduction: penDed,
    food_deduction: 0, other_deductions: 0, manual_correction: 0,
    net_salary: net, status: 'processed',
  });
});

// ---- promotions ------------------------------------------------------------
const insProm = db.prepare(`INSERT INTO promotions
  (employee_id,date,from_designation,to_designation,salary_before,salary_after,remarks)
  VALUES (?,?,?,?,?,?,?)`);
insProm.run(empIds[0], daysAgo(120), 'Cook', 'Head Chef', 18000, 22000, 'Promoted for outstanding performance during peak season.');
insProm.run(empIds[8], daysAgo(90), 'Billing Assistant', 'Cashier', 13000, 19000, 'Excellent accuracy and customer handling.');
insProm.run(empIds[3], daysAgo(60), 'Assistant Cook', 'Tandoor Specialist', 14000, 17000, 'Specialized skill development recognized.');

// ---- exit ------------------------------------------------------------------
db.prepare(`INSERT INTO exits
  (employee_id,resignation_date,last_working_day,reason,notice_days,settlement_amount,status)
  VALUES (?,?,?,?,?,?,?)`)
  .run(exitedId, daysAgo(45), daysAgo(30), 'Relocating to hometown', 15, 8500, 'settled');

console.log('Seed complete.');
console.log('  Employees:', empIds.length + 1, '(1 exited)');
console.log('  Login accounts:');
console.log('    Owner      -> owner@rayudu.com / owner123');
console.log('    Admin      -> admin@rayudu.com / admin123');
console.log('    Supervisor -> supervisor@rayudu.com / super123');
db.close();
