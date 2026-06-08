import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api, { fmtDate, today } from '../api.js';
import { useApi, Modal, Field, Spinner, Badge, EmployeeCell, EmployeeSelect } from '../components/ui.jsx';

export default function Leaves() {
  const [tab, setTab] = useState('requests');
  return (
    <div>
      <div className="page-head">
        <div><h1>Leave Management</h1><p>Requests, approvals, balance & department reports</p></div>
        <div className="btn-row">
          <button className={`btn sm ${tab === 'requests' ? '' : 'gray'}`} onClick={() => setTab('requests')}>Requests</button>
          <button className={`btn sm ${tab === 'balance' ? '' : 'gray'}`} onClick={() => setTab('balance')}>Balance</button>
          <button className={`btn sm ${tab === 'dept' ? '' : 'gray'}`} onClick={() => setTab('dept')}>Dept Report</button>
        </div>
      </div>
      {tab === 'requests' && <LeaveRequests />}
      {tab === 'balance' && <LeaveBalance />}
      {tab === 'dept' && <DeptReport />}
    </div>
  );
}

function LeaveRequests() {
  const { data, loading, reload } = useApi('/leaves');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ from_date: today(), to_date: today(), type: 'Casual', days: 1, reason: '' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  const setStatus = async (id, status) => { await api.put(`/leaves/${id}/status`, { status }); reload(); };
  const remove = async (id) => { if (confirm('Delete this leave request?')) { await api.delete(`/leaves/${id}`); reload(); } };
  const save = async () => {
    setSaving(true);
    try { await api.post('/leaves', form); setAdding(false); reload(); }
    finally { setSaving(false); }
  };

  const rows = (data || []).filter((l) => !filter || l.status === filter);

  return (
    <>
      <div className="toolbar">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="spacer" />
        <button className="btn" onClick={() => { setForm({ from_date: today(), to_date: today(), type: 'Casual', days: 1, reason: '' }); setAdding(true); }}>+ Apply Leave</button>
      </div>

      <div className="panel">
        {loading ? <Spinner /> : rows.length === 0 ? <div className="empty">No leave requests.</div> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Employee</th><th>From</th><th>To</th><th>Type</th><th>Days</th><th>Reason</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id}>
                    <td><EmployeeCell row={l} /></td>
                    <td>{fmtDate(l.from_date)}</td>
                    <td>{fmtDate(l.to_date)}</td>
                    <td>{l.type}</td>
                    <td>{l.days}</td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.reason || '—'}</td>
                    <td><Badge value={l.status} /></td>
                    <td>
                      <div className="btn-row">
                        {l.status === 'pending' ? (
                          <>
                            <button className="btn sm" onClick={() => setStatus(l.id, 'approved')}>Approve</button>
                            <button className="btn sm danger" onClick={() => setStatus(l.id, 'rejected')}>Reject</button>
                          </>
                        ) : (
                          <button className="btn sm gray" onClick={() => setStatus(l.id, 'pending')}>Reset</button>
                        )}
                        <button className="btn sm danger" onClick={() => remove(l.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding && (
        <Modal title="Apply Leave" onClose={() => setAdding(false)}
          footer={<>
            <button className="btn gray" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn" onClick={save} disabled={saving || !form.employee_id}>{saving ? 'Saving…' : 'Submit'}</button>
          </>}>
          <Field label="Employee"><EmployeeSelect value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })} /></Field>
          <div className="form-grid">
            <Field label="From"><input type="date" value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value })} /></Field>
            <Field label="To"><input type="date" value={form.to_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} /></Field>
            <Field label="Type"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Casual</option><option>Sick</option><option>Earned</option></select></Field>
            <Field label="Days"><input type="number" value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Reason"><textarea rows="2" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
        </Modal>
      )}
    </>
  );
}

function LeaveBalance() {
  const { data, loading } = useApi('/leaves/balance/all');
  return (
    <div className="panel">
      {loading ? <Spinner /> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Employee</th><th>Annual Quota</th><th>Used</th><th>Balance</th></tr></thead>
            <tbody>
              {(data || []).map((b) => (
                <tr key={b.employee_id}>
                  <td><EmployeeCell row={b} /></td>
                  <td>{b.quota} days</td>
                  <td>{b.used} days</td>
                  <td><b style={{ color: b.balance < 5 ? '#c8860d' : '#2e7d32' }}>{b.balance} days</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DeptReport() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const { data, loading } = useApi(`/leaves/report/department?year=${year}`, [year]);

  return (
    <div>
      <div className="toolbar">
        <label style={{ fontSize: 13, color: '#6b7a72' }}>Year</label>
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          {[0, 1, 2].map((i) => {
            const y = String(new Date().getFullYear() - i);
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><h3>Department Leave Summary — {year}</h3></div>
          {loading ? <Spinner /> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Department</th><th style={{ color: '#2e7d32' }}>Approved</th><th style={{ color: '#c8860d' }}>Pending</th><th style={{ color: '#c0392b' }}>Rejected</th><th>Employees on Leave</th></tr></thead>
                <tbody>
                  {(data?.departments || []).map((d) => (
                    <tr key={d.department}>
                      <td><b>{d.department}</b></td>
                      <td><b style={{ color: '#2e7d32' }}>{d.approved_days} days</b></td>
                      <td style={{ color: '#c8860d' }}>{d.pending_days} days</td>
                      <td style={{ color: '#c0392b' }}>{d.rejected_days} days</td>
                      <td>{d.employees_on_leave}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Approved Leave Days by Department</h3></div>
          <div className="panel-pad" style={{ height: 280 }}>
            {loading ? <Spinner /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.departments || []} layout="vertical">
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="department" width={110} fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="approved_days" fill="#3a5a40" name="Approved Days" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="pending_days" fill="#c8860d" name="Pending Days" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
