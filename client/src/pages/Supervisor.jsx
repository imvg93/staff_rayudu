import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { rupee, today, thisMonth } from '../api.js';
import { useApi, Spinner, Badge, EmployeeCell, Modal, Field, EmployeeSelect } from '../components/ui.jsx';

const QUICK = [
  { icon: '✅', label: 'Mark Attendance', to: '/attendance' },
  { icon: '🕑', label: 'Assign Shift', to: '/shifts' },
  { icon: '🌴', label: 'Approve Leave', to: '/leaves' },
  { icon: '📝', label: 'Performance Note', to: '/performance' },
  { icon: '👥', label: 'Staff Records', to: '/staff' },
];

export default function Supervisor() {
  const nav = useNavigate();
  const dash = useApi('/analytics/dashboard');
  const leaves = useApi('/leaves?status=pending');
  const [expOpen, setExpOpen] = useState(false);

  const approve = async (id, status) => { await api.put(`/leaves/${id}/status`, { status }); leaves.reload(); };

  return (
    <div>
      <div className="page-head">
        <div><h1>Supervisor Desk</h1><p>Command center for daily workforce operations</p></div>
        <button className="btn" onClick={() => setExpOpen(true)}>+ Quick Expense</button>
      </div>

      <div className="quick-actions" style={{ marginBottom: 18 }}>
        {QUICK.map((q) => (
          <div className="qa" key={q.label} onClick={() => nav(q.to)}>
            <div className="ic">{q.icon}</div>
            <div className="l">{q.label}</div>
          </div>
        ))}
      </div>

      {dash.data && (
        <div className="grid stats" style={{ marginBottom: 18 }}>
          <div className="stat-card"><div className="ic">👥</div><div><div className="v">{dash.data.totalEmployees}</div><div className="l">On Roll</div></div></div>
          <div className="stat-card"><div className="ic">✅</div><div><div className="v">{dash.data.present}</div><div className="l">Present Today</div></div></div>
          <div className="stat-card"><div className="ic">❌</div><div><div className="v">{dash.data.absent}</div><div className="l">Absent Today</div></div></div>
          <div className="stat-card"><div className="ic">⏳</div><div><div className="v">{dash.data.pendingLeaves}</div><div className="l">Leaves to Approve</div></div></div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head"><h3>Pending Leave Approvals</h3></div>
        {leaves.loading ? <Spinner /> : (leaves.data || []).length === 0 ? (
          <div className="empty">No pending leave requests 🎉</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Employee</th><th>From</th><th>To</th><th>Type</th><th>Reason</th><th></th></tr></thead>
              <tbody>
                {leaves.data.map((l) => (
                  <tr key={l.id}>
                    <td><EmployeeCell row={l} /></td>
                    <td>{l.from_date}</td>
                    <td>{l.to_date}</td>
                    <td><Badge value="gray" label={l.type} /></td>
                    <td>{l.reason}</td>
                    <td>
                      <div className="btn-row">
                        <button className="btn sm" onClick={() => approve(l.id, 'approved')}>Approve</button>
                        <button className="btn sm danger" onClick={() => approve(l.id, 'rejected')}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {expOpen && <QuickExpense onClose={() => setExpOpen(false)} onSaved={() => { setExpOpen(false); dash.reload(); }} />}
    </div>
  );
}

function QuickExpense({ onClose, onSaved }) {
  const [form, setForm] = useState({ date: today(), category: 'vegetables', amount: '', note: '' });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try { await api.post('/expenses', { ...form, created_by: 'Supervisor' }); onSaved(); }
    finally { setSaving(false); }
  };
  return (
    <Modal title="Quick Expense Entry" onClose={onClose}
      footer={<>
        <button className="btn gray" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={save} disabled={saving || !form.amount}>{saving ? 'Saving…' : 'Save'}</button>
      </>}>
      <div className="form-grid">
        <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <Field label="Category"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {['milk', 'vegetables', 'chicken', 'mutton', 'gas', 'misc'].map((c) => <option key={c} value={c}>{c}</option>)}
        </select></Field>
        <Field label="Amount (₹)"><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
        <Field label="Note"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
