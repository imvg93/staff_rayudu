import express from 'express';
import db from './db.js';

// Build a standard REST router for a table.
//   table   : table name
//   fields  : columns the client may set on create/update
//   options : { orderBy, withEmployee } -- withEmployee joins employee name/code
export function crudRouter(table, fields, options = {}) {
  const router = express.Router();
  const orderBy = options.orderBy || 'id DESC';
  const joinEmp = options.withEmployee;

  const selectSql = joinEmp
    ? `SELECT t.*, e.name AS employee_name, e.emp_code, e.department
         FROM ${table} t LEFT JOIN employees e ON e.id = t.employee_id`
    : `SELECT * FROM ${table} t`;

  // LIST (optional ?employee_id= filter)
  router.get('/', (req, res) => {
    const { employee_id } = req.query;
    let sql = selectSql;
    const params = [];
    if (employee_id) {
      sql += ' WHERE t.employee_id = ?';
      params.push(employee_id);
    }
    sql += ` ORDER BY t.${orderBy}`;
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  });

  // GET one
  router.get('/:id', (req, res) => {
    const row = db.prepare(`${selectSql} WHERE t.id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  // CREATE
  router.post('/', (req, res) => {
    const cols = fields.filter((f) => req.body[f] !== undefined);
    if (!cols.length) return res.status(400).json({ error: 'No data' });
    const placeholders = cols.map(() => '?').join(',');
    const values = cols.map((f) => normalize(req.body[f]));
    const info = db
      .prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`)
      .run(...values);
    const row = db.prepare(`${selectSql} WHERE t.id = ?`).get(info.lastInsertRowid);
    res.status(201).json(row);
  });

  // UPDATE
  router.put('/:id', (req, res) => {
    const cols = fields.filter((f) => req.body[f] !== undefined);
    if (!cols.length) return res.status(400).json({ error: 'No data' });
    const setSql = cols.map((f) => `${f} = ?`).join(',');
    const values = cols.map((f) => normalize(req.body[f]));
    db.prepare(`UPDATE ${table} SET ${setSql} WHERE id = ?`).run(...values, req.params.id);
    const row = db.prepare(`${selectSql} WHERE t.id = ?`).get(req.params.id);
    res.json(row);
  });

  // DELETE
  router.delete('/:id', (req, res) => {
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
  });

  return router;
}

// SQLite has no boolean type; store booleans as 0/1.
function normalize(v) {
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}
