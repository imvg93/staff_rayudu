# 🪖 Rayudu Gari Military Hotel — Staff Management & Supervisor Control System

A complete, centralized digital platform that replaces manual registers, paperwork, salary
books and document files. All operations are run by **Admin, Owner, and Supervisor** from a
web dashboard — staff do **not** need any app.

> **Demo build.** Pre-loaded with realistic sample staff, attendance, payroll and expenses so
> the whole system can be shown working immediately.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite, React Router, Recharts |
| Backend | Node.js + Express (REST API) |
| Database | SQLite (file-based — **zero setup**, via better-sqlite3) |
| Auth | JWT, role-based (admin / owner / supervisor) |

> The data layer is plain SQL, so it can be pointed at PostgreSQL for production with minimal change.

---

## Quick Start

You need **Node.js 18+** installed. That's it — no database server to install.

### 1) Backend API

```bash
cd server
npm install
npm run db:setup     # creates the SQLite DB + loads demo data
npm run dev          # API on http://localhost:4000
```

### 2) Frontend (in a second terminal)

```bash
cd client
npm install
npm run dev          # opens http://localhost:5173
```

Open **http://localhost:5173** and log in.

---

## Demo Logins

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Owner | `owner@rayudu.com` | `owner123` | Everything |
| Admin | `admin@rayudu.com` | `admin123` | Everything |
| Supervisor | `supervisor@rayudu.com` | `super123` | Operations (no payroll / advances / exits) |

The login screen has one-click buttons to fill each account.

---

## Modules

**Overview** — Workforce Analytics Dashboard · Supervisor Desk · Celebrations
**Workforce** — Staff Master · Attendance · Shifts · Leave · Employee Timeline
**Finance** — Payroll · Advances & Loans · Penalties & Fines · Daily Expenses
**Records** — Documents · Performance Notes · Uniforms & Assets · Exit & Settlement

### Payroll logic
For a selected month, each employee's salary is computed from attendance, then advance
deductions and penalties are applied:

```
Net = (base salary × payable days ÷ 26) + overtime − advance deduction − penalties
```

Matches the spec example: ₹18,000 − ₹2,000 advance − ₹500 penalty = **₹15,500**.

---

## 10-Step Demo Walkthrough

1. Log in as **Admin** → land on the **Analytics Dashboard** with live charts.
2. **Staff Master** → ~18 employees across 5 departments; add one → auto code `RGM0xx`.
3. **Attendance → Daily Entry** → mark P/A/H/L + Late, Save. Switch to **Monthly Report**.
4. **Advances** → add ₹5,000 advance @ ₹1,000/mo → balance tracked.
5. **Payroll** → pick last month → **Process Payroll** → net = base − advance − penalty.
6. **Daily Expenses** → add milk/veg/gas → category summary cards + total update.
7. **Leave** → approve a pending request → balance reflects.
8. **Employee Timeline** → pick an employee → full history on one screen.
9. **Celebrations** → upcoming birthdays & work anniversaries.
10. Log out → log in as **Supervisor** → restricted sidebar + **Supervisor Desk** quick actions.

---

## Project Structure

```
staff/
  server/   Express API + SQLite (src/routes per module, seed.js, schema in db.js)
  client/   React SPA (src/pages per module, shared components, Recharts dashboard)
```

## Reset demo data anytime

```bash
cd server && npm run db:setup
```
