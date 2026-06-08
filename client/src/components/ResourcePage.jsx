import { useState } from 'react';
import api from '../api.js';
import { useApi, Modal, Field, EmployeeSelect, Spinner, EmployeeCell, Badge } from './ui.jsx';

// Generic list + create/edit/delete page driven by config.
// columns: [{ key, label, render?(row) }]
// fields:  [{ name, label, type, options?, required?, default? }]
export default function ResourcePage({ title, subtitle, endpoint, columns, fields, withEmployeeCol = true }) {
  const { data, loading, error, reload } = useApi(endpoint);
  const [editing, setEditing] = useState(null); // null | {} (new) | row
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState(null);

  const openNew = () => {
    const init = {};
    fields.forEach((f) => { if (f.default !== undefined) init[f.name] = f.default; });
    setForm(init); setEditing({}); setFormErr(null);
  };
  const openEdit = (row) => { setForm({ ...row }); setEditing(row); setFormErr(null); };

  const save = async () => {
    setSaving(true); setFormErr(null);
    try {
      const payload = {};
      fields.forEach((f) => { payload[f.name] = form[f.name]; });
      if (editing.id) await api.put(`${endpoint}/${editing.id}`, payload);
      else await api.post(endpoint, payload);
      setEditing(null); reload();
    } catch (e) {
      setFormErr(e.response?.data?.error || e.message);
    } finally { setSaving(false); }
  };

  const remove = async (row) => {
    if (!confirm('Delete this record?')) return;
    await api.delete(`${endpoint}/${row.id}`); reload();
  };

  const rows = data || [];

  return (
    <div>
      <div className="page-head">
        <div><h1>{title}</h1><p>{subtitle}</p></div>
        <button className="btn" onClick={openNew}>+ Add</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="panel">
        {loading ? <Spinner /> : rows.length === 0 ? (
          <div className="empty">No records yet. Click “Add” to create one.</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  {withEmployeeCol && <th>Employee</th>}
                  {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {withEmployeeCol && <td><EmployeeCell row={row} /></td>}
                    {columns.map((c) => (
                      <td key={c.key}>{c.render ? c.render(row) : row[c.key] ?? '—'}</td>
                    ))}
                    <td>
                      <div className="btn-row">
                        <button className="btn sm gray" onClick={() => openEdit(row)}>Edit</button>
                        <button className="btn sm danger" onClick={() => remove(row)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <Modal
          title={editing.id ? `Edit ${title}` : `Add ${title}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn gray" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </>
          }
        >
          {formErr && <div className="error-msg">{formErr}</div>}
          <div className="form-grid">
            {fields.map((f) => (
              <div key={f.name} style={f.full ? { gridColumn: '1 / -1' } : null}>
                <Field label={f.label}>
                  {f.type === 'employee' ? (
                    <EmployeeSelect value={form[f.name]} onChange={(v) => setForm({ ...form, [f.name]: v })} />
                  ) : f.type === 'select' ? (
                    <select value={form[f.name] ?? ''} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                      <option value="">—</option>
                      {f.options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea rows="3" value={form[f.name] ?? ''} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                  ) : f.type === 'checkbox' ? (
                    <select value={form[f.name] ? '1' : '0'} onChange={(e) => setForm({ ...form, [f.name]: e.target.value === '1' })}>
                      <option value="0">No</option><option value="1">Yes</option>
                    </select>
                  ) : (
                    <input
                      type={f.type || 'text'}
                      value={form[f.name] ?? ''}
                      onChange={(e) => setForm({ ...form, [f.name]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
                    />
                  )}
                </Field>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

export { Badge };
