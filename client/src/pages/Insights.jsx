import { useState } from 'react';
import api, { rupee, fmtDate, thisMonth } from '../api.js';
import { useApi, Spinner } from '../components/ui.jsx';
import { AlertTriangle, ChevronDown, ChevronRight, ShieldCheck, Printer, RefreshCw, Check, Flame, CalendarX } from 'lucide-react';

export default function Insights() {
  const [tab, setTab] = useState('leakage');
  return (
    <div>
      <div className="page-head">
        <div><h1>Insights</h1><p>Where money quietly leaks and where staff are overworked</p></div>
        <div className="btn-row">
          <button className={`btn sm ${tab === 'leakage' ? '' : 'gray'}`} onClick={() => setTab('leakage')}>Salary Leakage</button>
          <button className={`btn sm ${tab === 'overload' ? '' : 'gray'}`} onClick={() => setTab('overload')}>Shift Overload</button>
        </div>
      </div>
      {tab === 'leakage' && <SalaryLeakage />}
      {tab === 'overload' && <ShiftOverload />}
    </div>
  );
}

const LEVEL = {
  high:     { color: '#c0392b', bg: '#fbeae8', label: 'High' },
  moderate: { color: '#c8860d', bg: '#fdf3e0', label: 'Moderate' },
  low:      { color: '#2c6e9b', bg: '#e8f0f8', label: 'Low' },
  ok:       { color: '#2e7d32', bg: '#e6f4ea', label: 'OK' },
};

function MetricCard({ icon, value, label, color }) {
  return (
    <div className="panel" style={{ flex: '1 1 150px', minWidth: 150 }}>
      <div className="panel-pad" style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ background: (color || '#3a5a40') + '18', color: color || '#3a5a40', borderRadius: 9, padding: 9, display: 'inline-flex' }}>{icon}</div>
        <div>
          <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.1, color: color || '#1f2a24' }}>{value}</div>
          <div style={{ fontSize: 11.5, color: '#6b7a72' }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

function ShiftOverload() {
  const [month, setMonth] = useState(thisMonth());
  const [showAll, setShowAll] = useState(false);
  const { data, loading } = useApi(`/analytics/overload?month=${month}`, [month]);

  const flagged = (data?.employees || []).filter((e) => e.level !== 'ok');
  const list = showAll ? (data?.employees || []) : flagged;

  return (
    <div>
      <div className="toolbar">
        <label style={{ fontSize: 13, color: '#6b7a72' }}>Month</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <div className="spacer" />
        {data && <button className="btn ghost sm" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Printer size={13} strokeWidth={1.8} /> Print</button>}
      </div>

      {loading || !data ? <Spinner /> : (
        <>
          <div className="btn-row" style={{ gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <MetricCard icon={<Flame size={19} strokeWidth={1.9} />} value={data.summary.high} label="High load" color="#c0392b" />
            <MetricCard icon={<AlertTriangle size={18} strokeWidth={1.9} />} value={data.summary.moderate} label="Moderate load" color="#c8860d" />
            <MetricCard icon={<CalendarX size={18} strokeWidth={1.9} />} value={data.summary.total_rest_skipped} label="Rest days skipped" color="#2c6e9b" />
            <MetricCard icon={<RefreshCw size={18} strokeWidth={1.9} />} value={rupee(data.summary.total_overtime_value)} label="Owed for skipped rest" color="#3a5a40" />
          </div>

          <div className="panel" style={{ marginBottom: 14 }}>
            <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Most overloaded staff</h3>
              <button className={`btn sm ${showAll ? '' : 'gray'}`} onClick={() => setShowAll((s) => !s)}>
                {showAll ? 'Only flagged' : 'Show all'}
              </button>
            </div>
            <div className="panel-pad" style={{ paddingTop: 0 }}>
              {list.length === 0 ? (
                <p style={{ color: '#2e7d32', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0' }}>
                  <ShieldCheck size={15} /> No one is overloaded this month.
                </p>
              ) : (
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>#</th><th>Employee</th><th style={{ minWidth: 150 }}>Load</th>
                        <th title="Entitled weekly-offs worked instead of rested">Rest skipped</th>
                        <th title="Longest run of consecutive days worked">Streak</th>
                        <th>Days worked</th><th>Late</th><th>Owed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((e, i) => {
                        const lv = LEVEL[e.level];
                        return (
                          <tr key={e.employee_id}>
                            <td style={{ color: '#6b7a72' }}>{i + 1}</td>
                            <td>
                              <b>{e.name}</b>
                              <span style={{ color: '#6b7a72', fontSize: 11.5 }}> · {e.department}{e.shift ? ' · ' + e.shift : ''}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 7, background: '#eef1ef', borderRadius: 20, overflow: 'hidden', minWidth: 70 }}>
                                  <div style={{ width: e.score + '%', height: '100%', background: lv.color, borderRadius: 20 }} />
                                </div>
                                <span style={{ fontSize: 10.5, fontWeight: 700, color: lv.color, background: lv.bg, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' }}>{lv.label} {e.score}</span>
                              </div>
                            </td>
                            <td style={{ color: e.rest_skipped > 0 ? '#c0392b' : '#6b7a72', fontWeight: e.rest_skipped > 0 ? 700 : 400 }}>{e.rest_skipped}</td>
                            <td>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: e.longest_streak >= 7 ? '#c0392b' : '#1f2a24' }}>
                                {e.longest_streak >= 7 && <Flame size={12} strokeWidth={2} />}{e.longest_streak}d
                              </span>
                            </td>
                            <td>{e.days_worked}</td>
                            <td style={{ color: e.late > 0 ? '#c8860d' : '#6b7a72' }}>{e.late}</td>
                            <td>{e.overtime_value > 0 ? <b style={{ color: '#3a5a40' }}>{rupee(e.overtime_value)}</b> : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p style={{ color: '#6b7a72', fontSize: 11.5, marginTop: 10 }}>
                Load score blends rest days skipped, longest work streak, extra days worked and lateness. <Flame size={11} style={{ verticalAlign: -1 }} /> marks a 7+ day streak without a break.
              </p>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h3>Department shift staffing</h3></div>
            <div className="panel-pad" style={{ paddingTop: 4 }}>
              {data.departments.map((d) => {
                const mPct = d.total ? (d.morning / d.total) * 100 : 0;
                const ePct = d.total ? (d.evening / d.total) * 100 : 0;
                const uPct = d.total ? (d.unassigned / d.total) * 100 : 0;
                return (
                  <div key={d.department} style={{ padding: '9px 0', borderBottom: '1px solid #f0f2f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>
                        {d.department}
                        {d.thin_shift && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700, color: '#c0392b', background: '#fbeae8', padding: '2px 7px', borderRadius: 20 }}>THIN SHIFT</span>}
                      </span>
                      <span style={{ fontSize: 12, color: '#6b7a72' }}>
                        <b style={{ color: '#c8860d' }}>{d.morning}</b> morning · <b style={{ color: '#2c6e9b' }}>{d.evening}</b> evening{d.unassigned ? <> · <b style={{ color: '#8a9a92' }}>{d.unassigned}</b> unset</> : null}
                      </span>
                    </div>
                    <div style={{ display: 'flex', height: 9, borderRadius: 20, overflow: 'hidden', background: '#eef1ef' }}>
                      {mPct > 0 && <div style={{ width: mPct + '%', background: '#e0a92e' }} title={`${d.morning} morning`} />}
                      {ePct > 0 && <div style={{ width: ePct + '%', background: '#2c6e9b' }} title={`${d.evening} evening`} />}
                      {uPct > 0 && <div style={{ width: uPct + '%', background: '#c9d2cc' }} title={`${d.unassigned} unassigned`} />}
                    </div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11.5, color: '#6b7a72' }}>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, background: '#e0a92e', borderRadius: 2, marginRight: 4 }} />Morning</span>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, background: '#2c6e9b', borderRadius: 2, marginRight: 4 }} />Evening</span>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, background: '#c9d2cc', borderRadius: 2, marginRight: 4 }} />Unassigned</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SalaryLeakage() {
  const [month, setMonth] = useState(thisMonth());
  const { data, loading, reload } = useApi(`/analytics/leakage?month=${month}`, [month]);

  return (
    <div>
      <div className="toolbar">
        <label style={{ fontSize: 13, color: '#6b7a72' }}>Month</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <div className="spacer" />
        {data && <button className="btn ghost sm" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Printer size={13} strokeWidth={1.8} /> Print</button>}
      </div>

      {loading || !data ? <Spinner /> : (
        <>
          <div className="panel" style={{ marginBottom: 14, borderLeft: '4px solid #c0392b' }}>
            <div className="panel-pad" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ background: '#fbeae8', color: '#c0392b', borderRadius: 10, padding: 12, display: 'inline-flex' }}>
                <AlertTriangle size={22} strokeWidth={1.9} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#c0392b', lineHeight: 1.1 }}>{rupee(data.totalAtRisk)}</div>
                <div style={{ fontSize: 13, color: '#6b7a72' }}>Recoverable money at risk this month</div>
              </div>
              <div style={{ fontSize: 12, color: '#6b7a72', maxWidth: 300, lineHeight: 1.5 }}>
                <span style={{ color: '#c0392b', fontWeight: 700 }}>At risk</span> = recoverable now.
                {' '}<span style={{ color: '#c8860d', fontWeight: 700 }}>Review</span> = real cost worth checking, often legitimate.
              </div>
            </div>
          </div>

          {data.buckets.map((b) => <Bucket key={b.key} bucket={b} month={data.month} reload={reload} />)}
        </>
      )}
    </div>
  );
}

function Bucket({ bucket, month, reload }) {
  const [open, setOpen] = useState(false);
  const empty = bucket.count === 0;
  const accent = bucket.risk ? '#c0392b' : '#c8860d';

  return (
    <div className="panel" style={{ marginBottom: 12, opacity: empty ? 0.65 : 1 }}>
      <button
        onClick={() => !empty && setOpen((o) => !o)}
        style={{
          width: '100%', border: 'none', background: 'transparent', cursor: empty ? 'default' : 'pointer',
          padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
        }}
      >
        <span style={{ color: empty ? '#8aa' : accent, display: 'inline-flex' }}>
          {empty ? <ShieldCheck size={18} strokeWidth={1.9} /> : (open ? <ChevronDown size={18} /> : <ChevronRight size={18} />)}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {bucket.label}
            {!bucket.risk && <span style={{ fontSize: 10.5, fontWeight: 600, color: '#c8860d', background: '#fdf3e0', padding: '2px 7px', borderRadius: 20 }}>REVIEW</span>}
          </div>
          <div style={{ fontSize: 12.5, color: '#6b7a72', marginTop: 2 }}>{bucket.description}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: empty ? '#8aa' : accent }}>{rupee(bucket.amount)}</div>
          <div style={{ fontSize: 11.5, color: '#6b7a72' }}>{bucket.count} {bucket.count === 1 ? 'case' : 'cases'}</div>
        </div>
      </button>

      {open && !empty && (
        <div className="panel-pad" style={{ paddingTop: 0 }}>
          <div className="table-wrap">
            <table className="data">
              {bucketHead(bucket.key)}
              <tbody>{bucket.items.map((it, i) => <BucketRow key={i} k={bucket.key} it={it} month={month} reload={reload} />)}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const isAdvance = (k) => k === 'unrecovered_advances' || k === 'exited_advances' || k === 'advance_data_error';

const empCell = (it) => (
  <td>
    <b>{it.name}</b>
    <span style={{ color: '#6b7a72', fontSize: 11.5 }}> · {it.emp_code}{it.department ? ' · ' + it.department : ''}</span>
  </td>
);

function bucketHead(key) {
  if (isAdvance(key))
    return <thead><tr><th>Employee</th><th>Advance</th><th>Balance</th><th>Monthly</th><th>Taken</th><th></th></tr></thead>;
  if (key === 'overpaid_payroll')
    return <thead><tr><th>Employee</th><th>Stored net</th><th>Recomputed</th><th>Overpaid</th><th></th></tr></thead>;
  if (key === 'rest_day_overtime')
    return <thead><tr><th>Employee</th><th>Rest days worked</th><th>Extra pay</th></tr></thead>;
  if (key === 'low_attendance_paid')
    return <thead><tr><th>Employee</th><th>Present</th><th>Absent</th><th>Half</th><th>Net paid</th></tr></thead>;
  if (key === 'ghost_no_attendance')
    return <thead><tr><th>Employee</th><th>Monthly salary</th></tr></thead>;
  return null;
}

function BucketRow({ k, it, month, reload }) {
  if (isAdvance(k)) return <AdvanceRow k={k} it={it} reload={reload} />;
  if (k === 'overpaid_payroll') return <OverpaidRow it={it} month={month} reload={reload} />;
  if (k === 'rest_day_overtime')
    return (
      <tr>{empCell(it)}<td>{it.extra_off_days}</td><td><b style={{ color: '#c8860d' }}>{rupee(it.extra_day_pay)}</b></td></tr>
    );
  if (k === 'low_attendance_paid')
    return (
      <tr>
        {empCell(it)}
        <td style={{ color: '#2e7d32' }}>{it.present_days}</td>
        <td style={{ color: '#c0392b' }}>{it.absent_days}</td>
        <td>{it.half_days}</td>
        <td><b>{rupee(it.net_salary)}</b></td>
      </tr>
    );
  if (k === 'ghost_no_attendance')
    return <tr>{empCell(it)}<td><b>{rupee(it.salary)}</b></td></tr>;
  return null;
}

function AdvanceRow({ k, it, reload }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(it.monthly_deduction || ''));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const amt = Number(val);
    if (!amt || amt <= 0) return;
    setSaving(true);
    try {
      await api.put(`/advances/${it.id}`, { monthly_deduction: amt });
      setEditing(false);
      reload();
    } finally { setSaving(false); }
  };

  return (
    <tr>
      {empCell(it)}
      <td>{rupee(it.amount)}</td>
      <td><b style={{ color: it.balance > it.amount ? '#e65c00' : '#c0392b' }}>{rupee(it.balance)}</b></td>
      <td>{rupee(it.monthly_deduction)}</td>
      <td style={{ fontSize: 12, color: '#6b7a72' }}>{fmtDate(it.date)}</td>
      <td style={{ textAlign: 'right' }}>
        {k === 'unrecovered_advances' ? (
          editing ? (
            <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              <input type="number" value={val} onChange={(e) => setVal(e.target.value)} placeholder="₹/mo"
                style={{ width: 80, padding: '4px 6px' }} autoFocus />
              <button className="btn sm" onClick={save} disabled={saving}>{saving ? '…' : 'Save'}</button>
              <button className="btn sm gray" onClick={() => setEditing(false)}>×</button>
            </span>
          ) : (
            <button className="btn sm gray" onClick={() => setEditing(true)}>Set deduction</button>
          )
        ) : it.emp_status === 'exited' ? (
          <span style={{ fontSize: 11.5, color: '#e65c00', fontWeight: 600 }}>exited</span>
        ) : null}
      </td>
    </tr>
  );
}

function OverpaidRow({ it, month, reload }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const resync = async () => {
    setBusy(true);
    try {
      await api.post('/payroll/resync', { employee_id: it.employee_id, month });
      setDone(true);
      reload();
    } catch (e) {
      alert(e.response?.data?.error || 'Re-sync failed');
    } finally { setBusy(false); }
  };

  return (
    <tr>
      {empCell(it)}
      <td>{rupee(it.stored_net)}</td>
      <td>{rupee(it.recomputed_net)}</td>
      <td><b style={{ color: '#c0392b' }}>{rupee(it.delta)}</b></td>
      <td style={{ textAlign: 'right' }}>
        {it.status === 'locked' ? (
          <span style={{ fontSize: 11.5, color: '#6b7a72' }}>locked</span>
        ) : done ? (
          <span style={{ color: '#2e7d32', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={13} /> Synced</span>
        ) : (
          <button className="btn sm gray" onClick={resync} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={12} strokeWidth={2} /> {busy ? 'Syncing…' : 'Re-sync'}
          </button>
        )}
      </td>
    </tr>
  );
}
