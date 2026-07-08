import { useEffect, useMemo, useState } from 'react';
import api, { fmtDateTime } from '../api.js';
import { useApi, Spinner, EmployeeSelect, Modal } from '../components/ui.jsx';
import { Stars, RATING_COLORS } from '../components/Stars.jsx';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell,
} from 'recharts';
import {
  MessageSquare, Star, ThumbsUp, ShieldCheck, Flag, EyeOff, Reply,
  Download, QrCode, Printer, Search, TrendingUp, TrendingDown, Award,
} from 'lucide-react';

const BONUS_BG = { Gold: '#FEF3C7', Silver: '#F1F5F9', Bronze: '#FEECD8' };

export default function Reviews() {
  const [tab, setTab] = useState('reviews');
  return (
    <div>
      <div className="page-head">
        <div><h1>Customer Reviews</h1><p>Feedback collected from customers via employee QR codes</p></div>
        <div className="btn-row">
          <button className={`btn sm ${tab === 'reviews' ? '' : 'gray'}`} onClick={() => setTab('reviews')}>All Reviews</button>
          <button className={`btn sm ${tab === 'dashboard' ? '' : 'gray'}`} onClick={() => setTab('dashboard')}>Employee Dashboard</button>
          <button className={`btn sm ${tab === 'qr' ? '' : 'gray'}`} onClick={() => setTab('qr')}>QR Codes</button>
        </div>
      </div>
      {tab === 'reviews' && <AllReviews />}
      {tab === 'dashboard' && <EmployeeDashboard />}
      {tab === 'qr' && <QrCodes />}
    </div>
  );
}

/* ─────────────────────────  ALL REVIEWS + MODERATION  ───────────────────────── */
function AllReviews() {
  const [f, setF] = useState({ employee_id: '', branch: '', department: '', rating: '', status: '', from: '', to: '', q: '' });
  const [rows, setRows] = useState(null);
  const { data: branches } = useApi('/reviews/branches');
  const [respondRow, setRespondRow] = useState(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v); });
    return p.toString();
  }, [f]);

  const load = () => { setRows(null); api.get(`/reviews?${query}`).then((r) => setRows(r.data)); };
  useEffect(load, [query]);

  const setStatus = async (row, status) => { await api.put(`/reviews/${row.id}/status`, { status }); load(); };
  const exportCsv = () => { window.open('/api/reviews/export', '_blank'); };

  const DEPTS = ['Kitchen', 'Dining Service', 'Counter', 'Parcel', 'Cleaning'];

  return (
    <>
      <div className="panel" style={{ marginBottom: 16, padding: 14 }}>
        <div className="rev-filters">
          <div style={{ minWidth: 210 }}>
            <EmployeeSelect value={f.employee_id} onChange={(v) => setF({ ...f, employee_id: v })} allowAll placeholder="All Employees" />
          </div>
          <select value={f.branch} onChange={(e) => setF({ ...f, branch: e.target.value })}>
            <option value="">All Branches</option>
            {(branches || []).map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })}>
            <option value="">All Departments</option>
            {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={f.rating} onChange={(e) => setF({ ...f, rating: e.target.value })}>
            <option value="">All Ratings</option>
            {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Star</option>)}
          </select>
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="verified">Verified</option>
            <option value="flagged">Flagged</option>
            <option value="hidden">Hidden</option>
          </select>
          <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} title="From date" />
          <input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} title="To date" />
          <div className="rev-search">
            <Search size={13} strokeWidth={1.8} />
            <input placeholder="Search comments / customer…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
          </div>
          <div className="spacer" />
          <button className="btn sm gray" onClick={exportCsv} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Download size={13} strokeWidth={1.8} /> Export CSV
          </button>
        </div>
      </div>

      {!rows ? <Spinner /> : rows.length === 0 ? (
        <div className="panel"><div className="empty">No reviews match these filters.</div></div>
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: 'var(--subtle)', marginBottom: 8 }}>{rows.length} review{rows.length !== 1 ? 's' : ''}</div>
          <div className="rev-list">
            {rows.map((r) => (
              <ReviewCard key={r.id} r={r} onStatus={setStatus} onRespond={() => setRespondRow(r)} />
            ))}
          </div>
        </>
      )}

      {respondRow && (
        <RespondModal row={respondRow} onClose={() => setRespondRow(null)} onSaved={() => { setRespondRow(null); load(); }} />
      )}
    </>
  );
}

function ReviewCard({ r, onStatus, onRespond }) {
  const color = RATING_COLORS[r.overall_rating] || '#64748B';
  return (
    <div className={`rev-card${r.status === 'hidden' ? ' dim' : ''}`}>
      <div className="rev-card-top">
        <img className="avatar" src={r.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.employee_name)}`} alt="" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <b style={{ fontSize: 13.5 }}>{r.employee_name}</b>
            <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{r.emp_code} · {r.department} · {r.branch}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <Stars value={r.overall_rating} size={14} />
            <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{fmtDateTime(r.created_at)}</span>
          </div>
        </div>
        <StatusChip status={r.status} />
      </div>

      {r.comment && <div className="rev-comment" style={{ borderColor: color + '55' }}>“{r.comment}”</div>}

      <div className="rev-subratings">
        {[['Prof.', r.professionalism], ['Comm.', r.communication], ['Know.', r.knowledge], ['Friend.', r.friendliness], ['Resp.', r.response_time], ['Exp.', r.overall_experience]]
          .filter(([, v]) => v)
          .map(([l, v]) => <span key={l} className="rev-sub"><b>{l}</b> {v}★</span>)}
        <span className={`rev-rec ${r.recommend ? 'yes' : 'no'}`}><ThumbsUp size={11} /> {r.recommend ? 'Recommends' : 'Not recommended'}</span>
      </div>

      {(r.customer_name || r.customer_mobile) && (
        <div style={{ fontSize: 11.5, color: 'var(--subtle)', marginTop: 6 }}>
          — {r.customer_name || 'Anonymous'}{r.customer_mobile ? ` · ${r.customer_mobile}` : ''}
        </div>
      )}

      {r.admin_response && (
        <div className="rev-response"><b>Management response:</b> {r.admin_response}</div>
      )}

      <div className="rev-actions">
        {r.status !== 'verified' && <button className="btn xs gray" onClick={() => onStatus(r, 'verified')}><ShieldCheck size={12} /> Verify</button>}
        {r.status !== 'flagged' && <button className="btn xs gray" onClick={() => onStatus(r, 'flagged')}><Flag size={12} /> Flag</button>}
        {r.status !== 'hidden' && <button className="btn xs gray" onClick={() => onStatus(r, 'hidden')}><EyeOff size={12} /> Hide</button>}
        <button className="btn xs gray" onClick={onRespond}><Reply size={12} /> Respond</button>
      </div>
    </div>
  );
}

function StatusChip({ status }) {
  const map = {
    verified: { label: 'Verified', bg: '#DCFCE7', color: '#15803D' },
    flagged: { label: 'Flagged', bg: '#FEF3C7', color: '#B45309' },
    hidden: { label: 'Hidden', bg: '#F1F5F9', color: '#64748B' },
  };
  const s = map[status] || map.verified;
  return <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>;
}

function RespondModal({ row, onClose, onSaved }) {
  const [text, setText] = useState(row.admin_response || '');
  const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); try { await api.put(`/reviews/${row.id}/respond`, { admin_response: text }); onSaved(); } finally { setSaving(false); } };
  return (
    <Modal title={`Respond — ${row.employee_name}`} onClose={onClose}
      footer={<>
        <button className="btn gray" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Response'}</button>
      </>}>
      <div style={{ marginBottom: 10 }}><Stars value={row.overall_rating} size={16} /> <span style={{ fontSize: 12, color: 'var(--subtle)' }}>{row.comment ? `“${row.comment}”` : 'No comment'}</span></div>
      <textarea className="pubrev-textarea" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a public management response…" />
    </Modal>
  );
}

/* ─────────────────────────  EMPLOYEE PERFORMANCE DASHBOARD  ───────────────────────── */
function EmployeeDashboard() {
  const [empId, setEmpId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!empId) { setData(null); return; }
    setLoading(true);
    api.get(`/reviews/employee/${empId}`).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [empId]);

  return (
    <>
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, color: 'var(--subtle)' }}>Employee</label>
        <div style={{ minWidth: 280 }}><EmployeeSelect value={empId} onChange={setEmpId} /></div>
      </div>

      {!empId && <div className="panel"><div className="empty">Select an employee to view their performance dashboard.</div></div>}
      {loading && <Spinner />}
      {data && !loading && <PerfDashboard data={data} />}
    </>
  );
}

export function PerfDashboard({ data }) {
  const { employee: e, stats, thisMonth, lastMonth, trend, recent } = data;
  const momDelta = (thisMonth.avg || 0) - (lastMonth.avg || 0);
  const distData = [5, 4, 3, 2, 1].map((s) => ({ star: `${s}★`, count: stats.distribution[s] || 0, s }));

  return (
    <div>
      <div className="perf-head panel">
        <img className="avatar-lg" src={e.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(e.name)}`} alt="" />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>{e.name}</h2>
            {stats.bonus && <span className="bonus-badge" style={{ background: BONUS_BG[stats.bonus.tier], color: stats.bonus.color }}><Award size={12} /> {stats.bonus.tier} Bonus</span>}
            {stats.starPerformer && <span className="bonus-badge" style={{ background: '#EDE9FE', color: '#6D28D9' }}><Star size={12} /> Star Performer</span>}
          </div>
          <div style={{ color: 'var(--subtle)', fontSize: 13 }}>{e.emp_code} · {e.designation} · {e.department} · {e.branch}</div>
          <div style={{ marginTop: 6 }}><Stars value={stats.avg} size={18} showValue /> <span style={{ fontSize: 12.5, color: 'var(--subtle)' }}>from {stats.total} reviews</span></div>
        </div>
        <div className="perf-score">
          <div className="v">{stats.performanceScore}</div>
          <div className="l">Performance Score</div>
        </div>
      </div>

      <div className="grid stats" style={{ margin: '16px 0' }}>
        <MiniKpi icon={<MessageSquare size={16} />} value={stats.total} label="Total Reviews" />
        <MiniKpi icon={<Star size={16} />} value={stats.avg.toFixed(2)} label="Average Rating" color="#F5B301" />
        <MiniKpi icon={momDelta >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          value={thisMonth.avg ? thisMonth.avg.toFixed(2) : '—'}
          label={`This Month (${momDelta >= 0 ? '+' : ''}${momDelta.toFixed(2)} vs last)`}
          color={momDelta >= 0 ? '#16A34A' : '#DC2626'} />
        <MiniKpi icon={<ThumbsUp size={16} />} value={`${stats.satisfaction}%`} label="Satisfaction" color="#2563EB" />
      </div>

      <div className="perf-grid">
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Rating Distribution</h3>
          {[5, 4, 3, 2, 1].map((s) => {
            const c = stats.distribution[s] || 0;
            const pct = stats.total ? Math.round((c / stats.total) * 100) : 0;
            return (
              <div key={s} className="dist-row">
                <span style={{ width: 26, fontSize: 12.5, color: '#475569' }}>{s}★</span>
                <div className="dist-track"><div className="dist-fill" style={{ width: `${pct}%`, background: RATING_COLORS[s] }} /></div>
                <span style={{ width: 54, textAlign: 'right', fontSize: 12, color: 'var(--subtle)' }}>{c} ({pct}%)</span>
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 12.5 }}>
            <span style={{ color: '#16A34A' }}>👍 {stats.positive} Positive</span>
            <span style={{ color: '#DC2626' }}>👎 {stats.negative} Negative</span>
            <span style={{ color: '#2563EB' }}>{stats.recommendRate}% Recommend</span>
          </div>
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Service Quality Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.subRatings} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={95} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v}★`} />
              <Bar dataKey="avg" radius={[0, 4, 4, 0]} fill="#2563EB" barSize={13}>
                {stats.subRatings.map((d, i) => <Cell key={i} fill={d.avg >= 4.5 ? '#16A34A' : d.avg >= 4 ? '#65A30D' : d.avg >= 3 ? '#CA8A04' : '#EA580C'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Monthly Rating Trend</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trend} margin={{ left: -10, right: 12, top: 6 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F6" />
            <XAxis dataKey="ym" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, n) => n === 'avg' ? `${v}★` : v} />
            <Line type="monotone" dataKey="avg" stroke="#F5B301" strokeWidth={2.4} dot={{ r: 3 }} name="Avg Rating" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Recent Reviews</h3>
        {recent.length === 0 ? <div className="empty">No reviews yet.</div> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {recent.map((r) => (
              <div key={r.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Stars value={r.overall_rating} size={13} />
                  <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{fmtDateTime(r.created_at)}</span>
                </div>
                {r.comment && <div style={{ fontSize: 13, color: '#334155', marginTop: 3 }}>“{r.comment}”</div>}
                {r.customer_name && <div style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 2 }}>— {r.customer_name}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniKpi({ icon, value, label, color }) {
  return (
    <div className="stat-card">
      <div className="ic" style={color ? { background: color + '22', color } : null}>{icon}</div>
      <div><div className="v">{value}</div><div className="l">{label}</div></div>
    </div>
  );
}

/* ─────────────────────────  QR CODES  ───────────────────────── */
function QrCodes() {
  const { data: employees } = useApi('/employees?status=active');
  const [codes, setCodes] = useState({}); // id -> {dataUrl, url}
  const origin = window.location.origin;

  useEffect(() => {
    if (!employees) return;
    let alive = true;
    Promise.all(employees.map((e) =>
      api.get(`/reviews/qr/${e.id}?origin=${encodeURIComponent(origin)}`).then((r) => [e.id, r.data]).catch(() => [e.id, null])
    )).then((entries) => { if (alive) setCodes(Object.fromEntries(entries)); });
    return () => { alive = false; };
  }, [employees, origin]);

  const download = (e, code) => {
    const a = document.createElement('a');
    a.href = code.dataUrl;
    a.download = `QR-${e.emp_code}-${e.name.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  if (!employees) return <Spinner />;

  return (
    <>
      <div className="panel no-print" style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--subtle)' }}>
          <QrCode size={14} style={{ verticalAlign: -2 }} /> Each employee has a unique QR code. Customers scan it to leave a review — no app or search needed.
        </div>
        <button className="btn sm gray" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Printer size={13} /> Print All
        </button>
      </div>
      <div className="qr-grid">
        {employees.map((e) => {
          const code = codes[e.id];
          return (
            <div key={e.id} className="qr-card">
              <div className="qr-card-head">
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{e.name}</div>
                <div style={{ fontSize: 11, color: 'var(--subtle)' }}>{e.emp_code} · {e.department}</div>
                <div style={{ fontSize: 10.5, color: 'var(--subtle)' }}>{e.branch}</div>
              </div>
              {code ? <img className="qr-img" src={code.dataUrl} alt={`QR for ${e.name}`} /> : <div className="qr-img loading">…</div>}
              <div className="qr-caption">Scan to review</div>
              <div className="no-print" style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 }}>
                <button className="btn xs gray" disabled={!code} onClick={() => download(e, code)}><Download size={11} /> PNG</button>
                <a className="btn xs gray" href={code?.url} target="_blank" rel="noreferrer" style={{ pointerEvents: code ? 'auto' : 'none' }}>Open</a>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
