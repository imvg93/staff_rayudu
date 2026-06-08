import { useState, useEffect } from 'react';
import api, { rupee, fmtDate, today, thisMonth } from '../api.js';
import { Modal, Field, Spinner, Badge } from '../components/ui.jsx';

const CATS = ['milk', 'vegetables', 'chicken', 'mutton', 'gas', 'misc'];
const CAT_ICON = { milk: '🥛', vegetables: '🥬', chicken: '🍗', mutton: '🥩', gas: '🔥', misc: '📦' };

export default function Expenses() {
  const [month, setMonth] = useState(thisMonth());
  const [list, setList] = useState(null);
  const [summary, setSummary] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: today(), category: 'milk', amount: '', note: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get(`/expenses?month=${month}`).then((r) => setList(r.data));
    api.get(`/expenses/summary/${month}`).then((r) => setSummary(r.data));
  };
  useEffect(load, [month]);

  const save = async () => {
    setSaving(true);
    try { await api.post('/expenses', { ...form, created_by: 'Supervisor' }); setAdding(false); load(); }
    finally { setSaving(false); }
  };
  const remove = async (id) => { if (confirm('Delete?')) { await api.delete(`/expenses/${id}`); load(); } };

  return (
    <div>
      <div className="page-head">
        <div><h1>Daily Expense Tracking</h1><p>Kitchen & operational purchases</p></div>
        <button className="btn" onClick={() => { setForm({ date: today(), category: 'milk', amount: '', note: '' }); setAdding(true); }}>+ Add Expense</button>
      </div>

      <div className="toolbar">
        <label style={{ fontSize: 13, color: '#6b7a72' }}>Month</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <div className="spacer" />
        {summary && <strong>Total: {rupee(summary.total)}</strong>}
      </div>

      <div className="grid stats" style={{ marginBottom: 16 }}>
        {(summary?.byCategory || []).map((c) => (
          <div className="stat-card" key={c.category}>
            <div className="ic">{CAT_ICON[c.category] || '📦'}</div>
            <div><div className="v">{rupee(c.total)}</div><div className="l" style={{ textTransform: 'capitalize' }}>{c.category} · {c.entries}x</div></div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Expense Entries</h3></div>
        {!list ? <Spinner /> : list.length === 0 ? <div className="empty">No expenses this month.</div> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Note</th><th>By</th><th></th></tr></thead>
              <tbody>
                {list.map((x) => (
                  <tr key={x.id}>
                    <td>{fmtDate(x.date)}</td>
                    <td><Badge value="gray" label={`${CAT_ICON[x.category] || ''} ${x.category}`} /></td>
                    <td><b>{rupee(x.amount)}</b></td>
                    <td>{x.note}</td>
                    <td>{x.created_by}</td>
                    <td><button className="btn sm danger" onClick={() => remove(x.id)}>Del</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding && (
        <Modal title="Add Expense" onClose={() => setAdding(false)}
          footer={<>
            <button className="btn gray" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn" onClick={save} disabled={saving || !form.amount}>{saving ? 'Saving…' : 'Save'}</button>
          </>}>
          <div className="form-grid">
            <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Category"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
            <Field label="Amount (₹)"><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
            <Field label="Note"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
