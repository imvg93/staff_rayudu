import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api, { rupee, fmtDate, today } from '../api.js';
import { useApi, Modal, Field, Spinner, Badge } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const DEPTS = ['Kitchen', 'Dining Service', 'Counter', 'Parcel', 'Cleaning'];
const blank = { name: '', department: 'Kitchen', designation: '', salary: 12000, shift: 'morning',
  phone: '', emergency_name: '', emergency_phone: '', joining_date: today(), dob: '', status: 'active',
  monthly_allowed_holidays: 4 };

export default function Staff() {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'supervisor';

  const [dept, setDept] = useState('');
  const [q, setQ] = useState('');
  const { data, loading, reload } = useApi('/employees' + (dept ? `?department=${encodeURIComponent(dept)}` : ''), [dept]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const openNew = () => { setForm(blank); setEditing({}); };
  const openEdit = (e) => { setForm({ ...e }); setEditing(e); };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data: res } = await api.post('/employees/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((f) => ({ ...f, photo_url: res.url }));
    } finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing.id) await api.put(`/employees/${editing.id}`, form);
      else await api.post('/employees', form);
      setEditing(null); reload();
    } finally { setSaving(false); }
  };
  const remove = async (e) => { if (confirm(`Remove ${e.name}?`)) { await api.delete(`/employees/${e.id}`); reload(); } };

  const rows = (data || []).filter((e) =>
    e.name.toLowerCase().includes(q.toLowerCase()) || e.emp_code.toLowerCase().includes(q.toLowerCase())
  );

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="page-head">
        <div><h1>Staff Master</h1><p>Centralized employee directory · {rows.length} shown</p></div>
        {!isSupervisor && <button className="btn" onClick={openNew}>+ Add Employee</button>}
      </div>

      <div className="toolbar">
        <input placeholder="Search name / code…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">All Departments</option>
          {DEPTS.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>

      <div className="panel">
        {loading ? <Spinner /> : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Code</th><th>Employee</th><th>Department</th><th>Designation</th><th>Shift</th><th>Salary</th><th>Joined</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td>{e.emp_code}</td>
                    <td>
                      <div className="emp-cell">
                        <img className="avatar" src={e.photo_url} alt="" />
                        <div><b>{e.name}</b><small>{e.phone}</small></div>
                      </div>
                    </td>
                    <td>{e.department}</td>
                    <td>{e.designation}</td>
                    <td><Badge value={e.shift === 'morning' ? 'present' : 'leave'} label={e.shift} /></td>
                    <td>{isSupervisor ? '—' : rupee(e.salary)}</td>
                    <td>{fmtDate(e.joining_date)}</td>
                    <td><Badge value={e.status} /></td>
                    <td>
                      <div className="btn-row">
                        <Link className="btn sm ghost" to={`/timeline/${e.id}`}>Timeline</Link>
                        {!isSupervisor && (
                          <>
                            <button className="btn sm gray" onClick={() => openEdit(e)}>Edit</button>
                            <button className="btn sm danger" onClick={() => remove(e)}>Del</button>
                          </>
                        )}
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
          title={editing.id ? `Edit — ${editing.name}` : 'Add Employee'}
          onClose={() => setEditing(null)}
          footer={<>
            <button className="btn gray" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn" onClick={save} disabled={saving || !form.name}>{saving ? 'Saving…' : 'Save'}</button>
          </>}
        >
          {/* Photo upload */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img
              src={form.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(form.name || 'New')}`}
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e3e8e4', cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}
              alt="Click to upload photo"
              title="Click to upload photo"
            />
            <div style={{ fontSize: 11.5, color: '#6b7a72', marginTop: 4 }}>
              {uploading ? 'Uploading…' : 'Click photo to upload'}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => handlePhotoUpload(e.target.files?.[0])} />
          </div>

          <div className="form-grid">
            <div style={{ gridColumn: '1 / -1' }}><Field label="Full Name"><input value={form.name} onChange={set('name')} /></Field></div>
            <Field label="Department"><select value={form.department} onChange={set('department')}>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select></Field>
            <Field label="Designation"><input value={form.designation} onChange={set('designation')} /></Field>
            <Field label="Monthly Salary (₹)"><input type="number" value={form.salary} onChange={set('salary')} /></Field>
            <Field label="Monthly Allowed Holidays"><input type="number" min="0" max="31" value={form.monthly_allowed_holidays ?? 4} onChange={set('monthly_allowed_holidays')} /></Field>
            <Field label="Shift"><select value={form.shift} onChange={set('shift')}><option value="morning">morning</option><option value="evening">evening</option></select></Field>
            <Field label="Phone"><input value={form.phone} onChange={set('phone')} /></Field>
            <Field label="Joining Date"><input type="date" value={form.joining_date || ''} onChange={set('joining_date')} /></Field>
            <Field label="Date of Birth"><input type="date" value={form.dob || ''} onChange={set('dob')} /></Field>
            <Field label="Status"><select value={form.status} onChange={set('status')}><option value="active">active</option><option value="exited">exited</option></select></Field>
            <Field label="Emergency Contact Name"><input value={form.emergency_name || ''} onChange={set('emergency_name')} /></Field>
            <Field label="Emergency Contact Phone"><input value={form.emergency_phone || ''} onChange={set('emergency_phone')} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
