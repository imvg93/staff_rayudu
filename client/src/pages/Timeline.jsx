import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api, { rupee, fmtDate } from '../api.js';
import { useApi, Spinner } from '../components/ui.jsx';

const EVENT_META = {
  joining:   { color: '#059669', bg: '#F0FDF4', label: 'Joining',   icon: '🏁' },
  leave:     { color: '#2563EB', bg: '#EFF6FF', label: 'Leave',     icon: '🌴' },
  advance:   { color: '#D97706', bg: '#FFFBEB', label: 'Advance',   icon: '💰' },
  penalty:   { color: '#DC2626', bg: '#FEF2F2', label: 'Penalty',   icon: '⚠️' },
  warning:   { color: '#DC2626', bg: '#FEF2F2', label: 'Warning',   icon: '🚨' },
  note:      { color: '#7C3AED', bg: '#F5F3FF', label: 'Note',      icon: '📝' },
  salary:    { color: '#0891B2', bg: '#ECFEFF', label: 'Salary',    icon: '💳' },
  promotion: { color: '#92712A', bg: '#FEF9C3', label: 'Promotion', icon: '🏆' },
  exit:      { color: '#475569', bg: '#F8FAFC', label: 'Exit',      icon: '🚪' },
};

const WHAT_IT_TRACKS = [
  { type: 'joining',   desc: 'Joining date, designation & department' },
  { type: 'leave',     desc: 'All leave requests — approved, pending, rejected' },
  { type: 'advance',   desc: 'Salary advances — amount, monthly deduction & balance' },
  { type: 'penalty',   desc: 'Fines or deductions with reason' },
  { type: 'note',      desc: 'Appreciations, warnings & performance notes' },
  { type: 'salary',    desc: 'Every processed payroll month' },
  { type: 'promotion', desc: 'Designation changes with salary before & after' },
  { type: 'exit',      desc: 'Exit date, reason & settlement amount' },
];

function monthLabel(month) {
  if (!month) return '---';
  return new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function serviceDuration(joiningDate) {
  if (!joiningDate) return '---';
  const start = new Date(joiningDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return 'New joiner';
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years && rem) return `${years} yr ${rem} mo`;
  if (years) return `${years} yr`;
  return `${rem || 0} mo`;
}

export default function Timeline() {
  const { id } = useParams();
  const nav = useNavigate();
  const employees = useApi('/employees');
  const [selected, setSelected] = useState(id || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (id) setSelected(id); }, [id]);
  useEffect(() => {
    if (!selected) { setData(null); return; }
    setData(null);
    setLoading(true);
    api.get(`/timeline/${selected}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [selected]);

  const handleSelect = (val) => {
    setSelected(val);
    if (val) nav(`/timeline/${val}`); else nav('/timeline');
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Staff Profile</h1>
          <p>Complete staff record: joining, attendance, salary, documents and history</p>
        </div>
      </div>

      {/* Employee selector */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500, flexShrink: 0 }}>Select Staff Member</span>
          <select
            value={selected}
            onChange={(e) => handleSelect(e.target.value)}
            style={{ flex: 1, minWidth: 220, maxWidth: 380, height: 38, borderRadius: 8, border: '1px solid #E5E7EB', padding: '0 12px', fontSize: 13, color: '#0F172A', background: '#fff', cursor: 'pointer' }}
          >
            <option value="">— Choose an employee —</option>
            {(employees.data || []).map((e) => (
              <option key={e.id} value={e.id}>{e.emp_code} · {e.name} · {e.department}</option>
            ))}
          </select>
          {selected && data && (
            <span style={{ fontSize: 12, color: '#94A3B8' }}>
              {data.events.length} event{data.events.length !== 1 ? 's' : ''} recorded
            </span>
          )}
        </div>
      </div>

      {/* Empty state — explain the page */}
      {!selected && (
        <div>
          {/* What this page does */}
          <div className="panel" style={{ marginBottom: 16 }}>
            <div style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#0F1F3D,#1B4332)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  🪖
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', letterSpacing: '-.2px' }}>What is this page?</div>
                  <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>Everything about a staff member in one place</div>
                </div>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#475569', lineHeight: 1.7 }}>
                The <b>Employee Timeline</b> shows the full life story of any staff member —
                every leave, advance, salary, promotion, penalty and more — sorted from newest to oldest.
                Use it before processing disputes, reviewing a salary, or checking someone's history.
              </p>

              {/* Event type grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {WHAT_IT_TRACKS.map(({ type, desc }) => {
                  const m = EVENT_META[type];
                  return (
                    <div key={type} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 12px', borderRadius: 10,
                      background: m.bg, border: `1px solid ${m.color}18`,
                    }}>
                      <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{m.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: m.color, marginBottom: 2 }}>{m.label}</div>
                        <div style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.5 }}>{desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick-access employee cards */}
          {(employees.data || []).length > 0 && (
            <div className="panel">
              <div style={{ padding: '14px 20px 8px', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Quick Select</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(employees.data || []).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => handleSelect(String(e.id))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 12px', borderRadius: 8,
                      border: '1px solid #E5E7EB', background: '#F8FAFC',
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'background .12s, border-color .12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#93C5FD'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                  >
                    <img
                      src={e.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(e.name)}`}
                      alt=""
                      style={{ width: 26, height: 26, borderRadius: 6, objectFit: 'cover' }}
                    />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{e.name}</div>
                      <div style={{ fontSize: 10.5, color: '#94A3B8' }}>{e.emp_code} · {e.department}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {selected && loading && <div style={{ padding: '60px 0' }}><Spinner /></div>}

      {/* Employee detail */}
      {selected && data && (
        <div className="two-col">
          {/* LEFT — timeline events */}
          <div className="panel">
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>📋</div>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>Activity History</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94A3B8', background: '#F1F5F9', padding: '2px 8px', borderRadius: 20 }}>
                {data.events.length} events
              </span>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {data.events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: 13 }}>
                  No events recorded yet
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  {data.events.map((ev, i) => {
                    const m = EVENT_META[ev.type] || { color: '#64748B', bg: '#F8FAFC', icon: '•' };
                    return (
                      <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 18, position: 'relative' }}>
                        {/* Vertical line */}
                        {i < data.events.length - 1 && (
                          <div style={{ position: 'absolute', left: 15, top: 32, bottom: 0, width: 1, background: '#F1F5F9' }} />
                        )}
                        {/* Dot */}
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: m.bg, border: `2px solid ${m.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                          {m.icon}
                        </div>
                        {/* Content */}
                        <div style={{ flex: 1, paddingTop: 3 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: m.color, background: m.bg, padding: '1px 7px', borderRadius: 20 }}>{m.label}</span>
                            <span style={{ fontSize: 11, color: '#94A3B8' }}>{fmtDate(ev.date)}</span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>{ev.title}</div>
                          {ev.detail && <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>{ev.detail}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — profile + stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Profile card */}
            <div className="panel">
              <div style={{ padding: '20px', textAlign: 'center', borderBottom: '1px solid #F1F5F9' }}>
                <img
                  src={data.employee.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.employee.name)}`}
                  alt=""
                  style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover', border: '3px solid #F1F5F9' }}
                />
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 10, letterSpacing: '-.2px' }}>{data.employee.name}</div>
                <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 3 }}>{data.employee.designation || 'Staff'}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, background: '#F0FDF4', color: '#059669', fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                  {data.employee.department}
                </div>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Employee Code', value: data.employee.emp_code },
                  { label: 'Current Salary', value: rupee(data.employee.salary), bold: true, color: '#7C3AED' },
                  { label: 'Joined On', value: fmtDate(data.employee.joining_date) },
                  { label: 'Joined Month', value: monthLabel(data.employee.joining_date?.slice(0, 7)) },
                  { label: 'Service', value: serviceDuration(data.employee.joining_date) },
                  { label: 'Phone', value: data.employee.phone || '—' },
                  { label: 'Status', value: data.employee.status === 'active' ? '✅ Active' : '⛔ Inactive' },
                ].map((r) => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F8FAFC' }}>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>{r.label}</span>
                    <span style={{ fontSize: 12.5, fontWeight: r.bold ? 700 : 500, color: r.color || '#0F172A' }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="panel">
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Open Related Module</span>
              </div>
              <div style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { to: '/attendance', label: 'Attendance' },
                  { to: '/payroll', label: 'Payroll' },
                  { to: '/salary-slip', label: 'Salary Slip' },
                  { to: '/documents', label: 'Documents' },
                ].map((a) => (
                  <Link key={a.to} to={a.to} className="btn sm gray" style={{ justifyContent: 'center' }}>
                    {a.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Salary overview */}
            <div className="panel">
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Salary Overview</span>
              </div>
              <div style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Months Paid', value: data.salaryTotals?.months_paid || 0, color: '#2563EB', bg: '#EFF6FF' },
                  { label: 'Total Taken', value: rupee(data.salaryTotals?.total_paid), color: '#059669', bg: '#F0FDF4' },
                  { label: 'Deductions', value: rupee(data.salaryTotals?.total_deductions), color: '#DC2626', bg: '#FEF2F2' },
                  { label: 'Adv Balance', value: rupee(data.advanceSummary?.balance), color: '#D97706', bg: '#FFFBEB' },
                ].map((s) => (
                  <div key={s.label} style={{ padding: '10px 12px', borderRadius: 10, background: s.bg }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: s.color, lineHeight: 1.15 }}>{s.value}</div>
                    <div style={{ fontSize: 10.5, color: s.color + 'aa', marginTop: 3, fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Month-wise salary */}
            <div className="panel">
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Month-wise Salary</span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>{data.salaryHistory?.length || 0} month(s)</span>
              </div>
              <div style={{ padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!data.salaryHistory?.length ? (
                  <div style={{ padding: '12px 0', color: '#94A3B8', fontSize: 12.5, textAlign: 'center' }}>
                    No salary records yet
                  </div>
                ) : data.salaryHistory.slice(0, 8).map((s) => (
                  <div key={s.month} style={{ border: '1px solid #F1F5F9', borderRadius: 10, padding: '10px 11px', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>{monthLabel(s.month)}</div>
                        <div style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 2 }}>
                          Present {s.present_days || 0} | Absent {s.absent_days || 0} | Half {s.half_days || 0}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#059669' }}>{rupee(s.net_salary)}</div>
                        <div style={{ fontSize: 10.5, color: '#64748B', textTransform: 'capitalize' }}>{s.status}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid #F8FAFC', fontSize: 11.5 }}>
                      <span style={{ color: '#64748B' }}>Base {rupee(s.base_salary)}</span>
                      <span style={{ color: '#DC2626' }}>Ded {rupee((s.absence_deduction || 0) + (s.half_day_deduction || 0) + (s.advance_deduction || 0) + (s.penalty_deduction || 0))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance summary */}
            <div className="panel">
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Attendance Summary</span>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Present',      value: data.attendanceSummary.present,  color: '#059669', bg: '#F0FDF4' },
                  { label: 'Absent',       value: data.attendanceSummary.absent,   color: '#DC2626', bg: '#FEF2F2' },
                  { label: 'Half-day',     value: data.attendanceSummary.half_day, color: '#D97706', bg: '#FFFBEB' },
                  { label: 'On Leave',     value: data.attendanceSummary.leave,    color: '#2563EB', bg: '#EFF6FF' },
                  { label: 'Weekly Off',    value: data.attendanceSummary.weekly_off, color: '#0F766E', bg: '#ECFDF5' },
                  { label: 'Holiday',       value: data.attendanceSummary.holiday,  color: '#0F766E', bg: '#ECFDF5' },
                  { label: 'Late Entries', value: data.attendanceSummary.late,     color: '#7C3AED', bg: '#F5F3FF' },
                ].map((r) => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12.5, color: '#475569' }}>{r.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: r.color, background: r.bg, padding: '2px 10px', borderRadius: 20, minWidth: 36, textAlign: 'center' }}>
                      {r.value || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Records summary */}
            <div className="panel">
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Records Summary</span>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#64748B' }}>Documents Verified</span>
                  <b style={{ color: '#059669' }}>{data.documentSummary?.verified || 0}/{data.documentSummary?.total || 0}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: '#64748B' }}>Advance Records</span>
                  <b style={{ color: '#D97706' }}>{data.advanceSummary?.advances || 0}</b>
                </div>
                {(data.leaveSummary || []).map((l) => (
                  <div key={l.status} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: '#64748B', textTransform: 'capitalize' }}>{l.status} Leave</span>
                    <b style={{ color: '#2563EB' }}>{l.days || 0} day(s)</b>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

