import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from 'recharts';
import api, { today, thisMonth } from '../api.js';
import { useApi, Spinner, Badge, EmployeeCell } from '../components/ui.jsx';
import { Printer, Check } from 'lucide-react';

const STATUSES = [
  { v: 'present',      label: 'P',   cls: 'present',  title: 'Present' },
  { v: 'absent',       label: 'A',   cls: 'absent',   title: 'Absent' },
  { v: 'half_day',     label: 'H',   cls: 'half_day', title: 'Half Day' },
  { v: 'weekly_off',   label: 'W/O', cls: 'leave',    title: 'Weekly Off' },
  { v: 'holiday',      label: 'HOL', cls: 'leave',    title: 'Holiday (paid — no deduction)' },
  { v: 'paid_leave',   label: 'PL',  cls: 'leave',    title: 'Paid Leave' },
  { v: 'unpaid_leave', label: 'UL',  cls: 'absent',   title: 'Unpaid Leave' },
];

export default function Attendance() {
  const [tab, setTab] = useState('mark');
  return (
    <div>
      <div className="page-head">
        <div><h1>Attendance Management</h1><p>Daily entry, monthly reports & analytics</p></div>
        <div className="btn-row">
          <button className={`btn sm ${tab === 'mark' ? '' : 'gray'}`} onClick={() => setTab('mark')}>Daily Entry</button>
          <button className={`btn sm ${tab === 'report' ? '' : 'gray'}`} onClick={() => setTab('report')}>Monthly Report</button>
          <button className={`btn sm ${tab === 'analytics' ? '' : 'gray'}`} onClick={() => setTab('analytics')}>Analytics</button>
        </div>
      </div>
      {tab === 'mark' && <DailyGrid />}
      {tab === 'report' && <MonthlyReport />}
      {tab === 'analytics' && <AttendanceAnalytics />}
    </div>
  );
}

function DailyGrid() {
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState(null);
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showList, setShowList] = useState(null); // 'present' | 'absent' | null

  const load = () => {
    api.get(`/attendance?date=${date}`).then((r) => {
      setRows(r.data);
      const m = {};
      r.data.forEach((x) => { m[x.employee_id] = { status: x.status || 'present', is_late: x.is_late || 0 }; });
      setMarks(m);
    });
  };
  useEffect(load, [date]);

  const setStatus = (id, status) => { setMarks({ ...marks, [id]: { ...marks[id], status } }); setSaved(false); };
  const toggleLate = (id) => { setMarks({ ...marks, [id]: { ...marks[id], is_late: marks[id].is_late ? 0 : 1 } }); setSaved(false); };

  const save = async () => {
    setSaving(true);
    const payload = Object.entries(marks).map(([employee_id, m]) => ({ employee_id: Number(employee_id), ...m }));
    await api.post('/attendance/bulk', { date, marks: payload });
    setSaving(false); setSaved(true);
  };

  if (!rows) return <Spinner />;

  const presentList = rows.filter((r) => (marks[r.employee_id]?.status || 'present') === 'present');
  const absentList = rows.filter((r) => (marks[r.employee_id]?.status) === 'absent');
  const listRows = showList === 'present' ? presentList : showList === 'absent' ? absentList : [];

  return (
    <div>
      <div className="toolbar">
        <label style={{ fontSize: 13, color: '#6b7a72' }}>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="spacer" />
        {saved && <span style={{ color: '#2e7d32', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={13} strokeWidth={2.2} /> Saved</span>}
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Attendance'}</button>
      </div>

      <div className="btn-row" style={{ gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          className="btn gray"
          onClick={() => setShowList(showList === 'present' ? null : 'present')}
          style={{ background: showList === 'present' ? '#2e7d32' : '#e6f4ea', color: showList === 'present' ? '#fff' : '#2e7d32', border: 'none' }}
        >
          Present <b style={{ marginLeft: 4 }}>{presentList.length}</b>
        </button>
        <button
          className="btn gray"
          onClick={() => setShowList(showList === 'absent' ? null : 'absent')}
          style={{ background: showList === 'absent' ? '#c0392b' : '#fbeae8', color: showList === 'absent' ? '#fff' : '#c0392b', border: 'none' }}
        >
          Absent <b style={{ marginLeft: 4 }}>{absentList.length}</b>
        </button>
        <span style={{ fontSize: 12, color: '#6b7a72', alignSelf: 'center' }}>Tap a count to see the list</span>
      </div>

      {showList && (
        <div className="panel" style={{ marginBottom: 12 }}>
          <div className="panel-head">
            <h3>{showList === 'present' ? 'Present' : 'Absent'} — {listRows.length}</h3>
          </div>
          <div className="panel-pad">
            {listRows.length === 0 ? (
              <p style={{ color: '#6b7a72', fontSize: 13, margin: 0 }}>No {showList} employees.</p>
            ) : (
              <ol style={{ margin: 0, paddingLeft: 20, columns: '2 220px' }}>
                {listRows.map((r) => (
                  <li key={r.employee_id} style={{ padding: '3px 0', fontSize: 13 }}>
                    {r.name}{r.department ? <span style={{ color: '#6b7a72' }}> · {r.department}</span> : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
      <div className="panel">
        <div className="table-wrap sticky-employee-table">
          <table className="data">
            <thead><tr><th>Employee</th><th>Dept</th><th>Mark</th><th>Late</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const m = marks[r.employee_id] || {};
                return (
                  <tr key={r.employee_id}>
                    <td><EmployeeCell row={r} /></td>
                    <td style={{ fontSize: 12, color: '#6b7a72' }}>{r.department}</td>
                    <td>
                      <div className="btn-row" style={{ flexWrap: 'wrap', gap: 4 }}>
                        {STATUSES.map((s) => (
                          <button key={s.v} title={s.title}
                            className={`btn sm ${m.status === s.v ? '' : 'gray'}`}
                            style={m.status === s.v && s.v === 'absent' ? { background: '#c0392b' }
                              : m.status === s.v && s.v === 'unpaid_leave' ? { background: '#e65c00' }
                              : m.status === s.v && s.v === 'holiday' ? { background: '#0f766e' }
                              : m.status === s.v && (s.v === 'weekly_off' || s.v === 'paid_leave') ? { background: '#2c6e9b' }
                              : {}}
                            onClick={() => setStatus(r.employee_id, s.v)}>{s.label}</button>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button className={`btn sm ${m.is_late ? 'danger' : 'gray'}`} onClick={() => toggleLate(r.employee_id)}>
                        {m.is_late ? 'Late' : '—'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ color: '#6b7a72', fontSize: 12, marginTop: 10 }}>
        P = Present · A = Absent · H = Half-day · W/O = Weekly Off · HOL = Holiday (paid) · PL = Paid Leave · UL = Unpaid Leave
      </p>
    </div>
  );
}

function MonthlyReport() {
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get(`/attendance/report/${month}`).then((r) => setRows(r.data)); }, [month]);

  const totals = (rows || []).reduce((t, r) => ({
    present: t.present + (r.present || 0),
    absent: t.absent + (r.absent || 0),
    half_day: t.half_day + (r.half_day || 0),
    weekly_off: t.weekly_off + (r.weekly_off || 0),
    holiday: t.holiday + (r.holiday || 0),
    paid_leave: t.paid_leave + (r.paid_leave || 0),
    unpaid_leave: t.unpaid_leave + (r.unpaid_leave || 0),
    late: t.late + (r.late || 0),
  }), { present: 0, absent: 0, half_day: 0, weekly_off: 0, holiday: 0, paid_leave: 0, unpaid_leave: 0, late: 0 });

  return (
    <div>
      <div className="toolbar">
        <label style={{ fontSize: 13, color: '#6b7a72' }}>Month</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <div className="spacer" />
        {rows && rows.length > 0 && (
          <button className="btn ghost sm" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Printer size={13} strokeWidth={1.8} /> Print Report</button>
        )}
      </div>
      {!rows ? <Spinner /> : (
        <div className="panel">
          <div className="table-wrap sticky-employee-table">
            <table className="data">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th style={{ color: '#2e7d32' }}>Present</th>
                  <th style={{ color: '#c0392b' }}>Absent</th>
                  <th style={{ color: '#c8860d' }}>Half-day</th>
                  <th style={{ color: '#2c6e9b' }}>W/Off</th>
                  <th style={{ color: '#0f766e' }}>Holiday</th>
                  <th style={{ color: '#2c6e9b' }}>PL</th>
                  <th style={{ color: '#e65c00' }}>UL</th>
                  <th>Allowed Holidays</th>
                  <th>Late</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.employee_id}>
                    <td><EmployeeCell row={r} /></td>
                    <td><b style={{ color: '#2e7d32' }}>{r.present || 0}</b></td>
                    <td><b style={{ color: '#c0392b' }}>{r.absent || 0}</b></td>
                    <td>{r.half_day || 0}</td>
                    <td style={{ color: '#2c6e9b' }}>{r.weekly_off || 0}</td>
                    <td style={{ color: '#0f766e' }}>{r.holiday || 0}</td>
                    <td style={{ color: '#2c6e9b' }}>{r.paid_leave || 0}</td>
                    <td style={{ color: r.unpaid_leave > 0 ? '#e65c00' : undefined }}>{r.unpaid_leave || 0}</td>
                    <td style={{ color: '#6b7a72' }}>{r.monthly_allowed_holidays ?? 4}</td>
                    <td>{r.late > 0 ? <Badge value="late" label={r.late} /> : '—'}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f5f7f5', fontWeight: 700 }}>
                  <td>TOTAL</td>
                  <td style={{ color: '#2e7d32' }}>{totals.present}</td>
                  <td style={{ color: '#c0392b' }}>{totals.absent}</td>
                  <td>{totals.half_day}</td>
                  <td style={{ color: '#2c6e9b' }}>{totals.weekly_off}</td>
                  <td style={{ color: '#0f766e' }}>{totals.holiday}</td>
                  <td style={{ color: '#2c6e9b' }}>{totals.paid_leave}</td>
                  <td style={{ color: '#e65c00' }}>{totals.unpaid_leave}</td>
                  <td></td>
                  <td>{totals.late}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendanceAnalytics() {
  const trend = useApi('/analytics/attendance-trend?days=30');
  const deptAtt = useApi('/analytics/dept-attendance');

  return (
    <div>
      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><h3>30-Day Attendance Trend</h3></div>
          <div className="panel-pad" style={{ height: 280 }}>
            {trend.loading ? <Spinner /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend.data || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={10} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="present" stackId="1" stroke="#2e7d32" fill="#e6f4ea" name="Present" />
                  <Area type="monotone" dataKey="half_day" stackId="1" stroke="#c8860d" fill="#fdf3e0" name="Half Day" />
                  <Area type="monotone" dataKey="leave" stackId="1" stroke="#2c6e9b" fill="#e8f0f8" name="Leave" />
                  <Area type="monotone" dataKey="absent" stackId="1" stroke="#c0392b" fill="#fbeae8" name="Absent" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Today — Department-wise</h3></div>
          <div className="panel-pad" style={{ height: 280 }}>
            {deptAtt.loading ? <Spinner /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptAtt.data || []} layout="vertical">
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="department" width={100} fontSize={10} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" fill="#3a5a40" name="Present" stackId="a" />
                  <Bar dataKey="half_day" fill="#c8860d" name="Half Day" stackId="a" />
                  <Bar dataKey="leave" fill="#2c6e9b" name="Leave" stackId="a" />
                  <Bar dataKey="absent" fill="#c0392b" name="Absent" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
