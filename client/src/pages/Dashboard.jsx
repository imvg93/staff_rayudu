import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area,
} from 'recharts';
import {
  Users, UserCheck, UserX, Umbrella, UserPlus, CircleDollarSign, Landmark, Timer,
  TrendingUp, TrendingDown, CalendarCheck, AlertTriangle, Award,
  Zap, Activity, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import api, { rupee } from '../api.js';
import { Spinner } from '../components/ui.jsx';

/* ── Hooks ──────────────────────────────────────────────── */

function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(e * target));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function useClock() {
  const now = new Date();
  const [time, setTime] = useState({ h: now.getHours(), m: now.getMinutes(), s: now.getSeconds() });
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setTime({ h: n.getHours(), m: n.getMinutes(), s: n.getSeconds() });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function useDashData() {
  const [data, setData] = useState(null);
  const [trend, setTrend] = useState([]);
  const [deptAtt, setDeptAtt] = useState([]);
  const [payrollProgress, setPayrollProgress] = useState(null);
  useEffect(() => {
    Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/analytics/attendance-trend?days=30'),
      api.get('/analytics/dept-attendance'),
      api.get('/analytics/payroll-progress'),
    ]).then(([d, t, da, pp]) => {
      setData(d.data);
      setTrend(t.data || []);
      setDeptAtt(da.data || []);
      setPayrollProgress(pp.data);
    }).catch(() => {});
  }, []);
  return { data, trend, deptAtt, payrollProgress };
}

/* ── Card configs ───────────────────────────────────────── */

const KPI = [
  { icon: Users,            label: 'Total Employees',      key: 'totalEmployees',     color: '#059669', iconBg: '#F0FDF4' },
  { icon: UserCheck,        label: 'Present Today',        key: 'present',            color: '#16A34A', iconBg: '#DCFCE7', pulse: true, subFn: (v, d) => `${d.totalEmployees > 0 ? Math.round((v / d.totalEmployees) * 100) : 0}% attendance rate` },
  { icon: UserX,            label: 'Absent Today',         key: 'absent',             color: '#DC2626', iconBg: '#FEF2F2', subFn: (v, d) => `${d.totalEmployees > 0 ? Math.round((v / d.totalEmployees) * 100) : 0}% absenteeism` },
  { icon: Umbrella,         label: 'On Leave',             key: 'onLeaveToday',       color: '#2563EB', iconBg: '#EFF6FF', sub: 'Approved leaves' },
  { icon: CircleDollarSign, label: 'Monthly Commitment',   key: 'salaryExpense',      color: '#7C3AED', iconBg: '#F5F3FF', fmt: 'rupee', subFn: (v, d) => `Avg ${rupee(Math.round(v / (d.totalEmployees || 1)))}/emp` },
  { icon: UserPlus,         label: 'New Joiners',          key: 'newJoiners',         color: '#0891B2', iconBg: '#ECFEFF', sub: 'Joined this month' },
  { icon: Landmark,         label: 'Outstanding Advances', key: 'outstandingAdvances',color: '#92712A', iconBg: '#FEF9C3', fmt: 'rupee', sub: 'Recovery in progress' },
];

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#14B8A6'];

const chartStyle = {
  backgroundColor: '#fff',
  border: '1px solid #E5E7EB',
  borderRadius: 9,
  boxShadow: '0 4px 20px rgba(17,24,39,.08)',
  fontSize: 12,
  fontFamily: 'Inter, system-ui, sans-serif',
  padding: '8px 12px',
};

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div style={{
      background: '#0F172A', color: '#fff', borderRadius: 8,
      padding: '7px 11px', fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif',
      boxShadow: '0 6px 24px rgba(0,0,0,.35)', pointerEvents: 'none',
      display: 'flex', alignItems: 'center', gap: 7,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: p.fill, flexShrink: 0, display: 'inline-block' }} />
      <span style={{ color: 'rgba(255,255,255,.6)', marginRight: 2 }}>{name}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

/* ── Flip counter ───────────────────────────────────────── */

function FlipDigit({ digit, delay }) {
  const n = parseInt(digit, 10);
  const [go, setGo] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGo(true), delay || 0);
    return () => clearTimeout(t);
  }, []);
  return (
    <span style={{ display: 'inline-block', overflow: 'hidden', height: '1.15em', verticalAlign: 'bottom' }}>
      <span style={{
        display: 'block',
        lineHeight: '1.15em',
        transform: go ? `translateY(-${n * 10}%)` : 'translateY(0)',
        transition: go ? `transform ${0.45 + n * 0.025}s cubic-bezier(.22,1,.36,1)` : 'none',
      }}>
        {[0,1,2,3,4,5,6,7,8,9].map((d) => (
          <span key={d} style={{ display: 'block', height: '1.15em' }}>{d}</span>
        ))}
      </span>
    </span>
  );
}

function FlipNumber({ formatted, color }) {
  return (
    <span style={{ color: color || 'inherit', display: 'inline-flex', alignItems: 'flex-end', letterSpacing: '-.5px', lineHeight: 1 }}>
      {String(formatted).split('').map((ch, i) =>
        /\d/.test(ch)
          ? <FlipDigit key={i} digit={ch} delay={120 + i * 55} />
          : <span key={i} style={{ display: 'inline-block', lineHeight: '1.15em', alignSelf: 'flex-end', marginBottom: '0.01em' }}>{ch}</span>
      )}
    </span>
  );
}

/* ── Weekly Attendance Pulse ────────────────────────────── */

const DAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function WeeklyPulse({ trend }) {
  const last7 = (trend || []).slice(-7).map((r) => ({
    ...r,
    label: (() => { const d = new Date(r.date); return `${DAY_ABBR[d.getDay()]} ${d.getDate()}`; })(),
  }));

  if (!last7.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 8 }}>
        <Activity size={28} strokeWidth={1} style={{ color: 'var(--line)' }} />
        <div style={{ fontSize: 12.5, color: 'var(--subtle)' }}>Data builds as attendance is recorded</div>
      </div>
    );
  }

  const max = Math.max(...last7.map((r) => (r.present||0) + (r.absent||0) + (r.half_day||0) + (r.leave||0)), 1);

  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {/* Bar chart */}
      <div style={{ flex: 1, height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={last7} margin={{ top: 8, right: 4, bottom: 0, left: -22 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="label" fontSize={10.5} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={chartStyle}
              cursor={{ fill: '#F8FAFC' }}
              formatter={(v, name) => [v, name]}
            />
            <Bar dataKey="present"  stackId="a" fill="#10B981" name="Present"  radius={[0,0,0,0]} isAnimationActive animationDuration={900} animationEasing="ease-out" />
            <Bar dataKey="half_day" stackId="a" fill="#F59E0B" name="Half Day" radius={[0,0,0,0]} isAnimationActive animationDuration={900} animationEasing="ease-out" />
            <Bar dataKey="leave"    stackId="a" fill="#3B82F6" name="Leave"    radius={[0,0,0,0]} isAnimationActive animationDuration={900} animationEasing="ease-out" />
            <Bar dataKey="absent"   stackId="a" fill="#EF4444" name="Absent"   radius={[4,4,0,0]} isAnimationActive animationDuration={900} animationEasing="ease-out" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Right: per-day attendance % pills */}
      <div style={{ width: 110, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', paddingLeft: 16, borderLeft: '1px solid #F1F5F9' }}>
        {last7.map((r) => {
          const tot = (r.present||0) + (r.absent||0) + (r.half_day||0) + (r.leave||0);
          const pct = tot > 0 ? Math.round((r.present||0) / tot * 100) : 0;
          const c = pct >= 80 ? '#059669' : pct >= 60 ? '#D97706' : '#DC2626';
          const bg = pct >= 80 ? '#F0FDF4' : pct >= 60 ? '#FFFBEB' : '#FEF2F2';
          return (
            <div key={r.date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ fontSize: 10.5, color: '#64748B', minWidth: 48 }}>{r.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: c, background: bg, padding: '2px 7px', borderRadius: 20, minWidth: 40, textAlign: 'center' }}>
                {tot > 0 ? pct + '%' : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function PayrollKpiCard({ pp }) {
  const net = pp ? pp.netPayable : 0;
  const color = '#16A34A';
  return (
    <div className="kpi-card" style={{ '--kc-glow': '#16A34A22', '--kc-accent': color }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: '#DCFCE7', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CalendarCheck size={17} strokeWidth={1.8} />
        </div>
        {pp && (
          <span style={{ fontSize: 10, color: '#94A3B8', background: '#F8FAFC', border: '1px solid #E8ECF0', borderRadius: 20, padding: '2px 7px' }}>
            Till {pp.asOfDate}
          </span>
        )}
      </div>
      <div className="kpi-value"><FlipNumber formatted={rupee(net)} color={color} /></div>
      <div className="kpi-label">Net Payable</div>
      {pp && (
        <>
          <div className="kpi-divider" />
          <div className="kpi-sub" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <span><span style={{ color: '#7C3AED', fontWeight: 600 }}>{rupee(pp.earnedGross)}</span> earned</span>
            {pp.totalDeductions > 0 && (
              <span><span style={{ color: '#DC2626', fontWeight: 600 }}>−{rupee(pp.totalDeductions)}</span> deducted</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ cfg, value, data }) {
  const { icon: Icon, label, color, iconBg, pulse, sub, subFn, fmt } = cfg;
  const numVal = typeof value === 'number' ? value : 0;
  const display = fmt === 'rupee' ? rupee(numVal) : numVal.toLocaleString('en-IN');
  const subText = subFn ? subFn(numVal, data || {}) : sub;

  return (
    <div className={`kpi-card${pulse ? ' kpi-glow' : ''}`}
      style={{ '--kc-glow': color + '22', '--kc-accent': color }}>

      {/* Icon bubble */}
      <div style={{
        width: 36, height: 36, borderRadius: 9,
        background: iconBg, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={17} strokeWidth={1.8} />
      </div>

      {/* Value — flip counter */}
      <div className="kpi-value"><FlipNumber formatted={display} color={color} /></div>

      {/* Label */}
      <div className="kpi-label">{label}</div>

      {/* Divider + contextual sub-text */}
      {subText && (
        <>
          <div className="kpi-divider" />
          <div className="kpi-sub">
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0, opacity: .75 }} />
            {subText}
          </div>
        </>
      )}
    </div>
  );
}

function AttendanceDonut({ present, absent, leave, total }) {
  const unmarked = Math.max(0, total - present - absent - leave);
  const segments = [
    { name: 'Present', value: present, color: '#10B981' },
    { name: 'Leave',   value: leave,   color: '#3B82F6' },
    { name: 'Absent',  value: absent,  color: '#EF4444' },
    ...(unmarked > 0 ? [{ name: 'Unmarked', value: unmarked, color: '#E5E7EB' }] : []),
  ].filter((d) => d.value > 0);

  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  const pctColor = pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div style={{ position: 'relative', height: 150, marginBottom: 12 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={segments} dataKey="value" nameKey="name"
            outerRadius={68} innerRadius={46} paddingAngle={2}
            isAnimationActive animationDuration={900} animationEasing="ease-out"
            strokeWidth={2} stroke="#fff" startAngle={90} endAngle={-270}>
            {segments.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip content={<PieTooltip />} wrapperStyle={{ zIndex: 50 }} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center overlay */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: pctColor, lineHeight: 1, fontFeatureSettings: "'tnum'" }}>{pct}%</div>
        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2, fontWeight: 500 }}>present</div>
      </div>
    </div>
  );
}

function DeptBar({ dept, present, total, delay }) {
  const [w, setW] = useState('0%');
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  useEffect(() => {
    const t = setTimeout(() => setW(pct + '%'), 300 + delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  const color = pct >= 80 ? '#16A34A' : pct >= 60 ? '#D97706' : '#DC2626';
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)' }}>{dept}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{present}/{total}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36, textAlign: 'right' }}>{pct}%</span>
        </div>
      </div>
      <div className="dept-bar-track">
        <div className="dept-bar-fill" style={{ width: w, '--db-color': color }} />
      </div>
    </div>
  );
}

const RANK_BG = ['#D4AF37', '#A8A9AD', '#CD7F32', '#40916C', '#2563EB'];
const RANK_NUM = ['1', '2', '3', '4', '5'];

function PerformerCard({ emp, rank }) {
  const photo = emp.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emp.name || '')}`;
  const ringColor = RANK_BG[rank] || '#E5E7EB';
  const pctColor = emp.pct >= 90 ? '#16A34A' : emp.pct >= 75 ? '#D97706' : '#6B7280';
  return (
    <div className="performer-card">
      <div className="rank-badge" style={{ background: ringColor }}>{RANK_NUM[rank]}</div>
      <img src={photo} alt="" style={{
        width: 56, height: 56, borderRadius: '50%', objectFit: 'cover',
        border: `3px solid ${ringColor}`,
        boxShadow: `0 0 0 3px ${ringColor}22`,
      }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>{emp.name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{emp.department}</div>
      </div>
      <div style={{
        fontSize: 14, fontWeight: 700, color: pctColor,
        background: pctColor + '15', padding: '4px 12px', borderRadius: 20,
      }}>{emp.pct}%</div>
      <div style={{ fontSize: 10.5, color: 'var(--subtle)' }}>{emp.present}/{emp.total} days present</div>
    </div>
  );
}

function AlertItem({ emp, idx }) {
  const red = emp.pct < 60;
  const color = red ? '#DC2626' : '#D97706';
  const bg = red ? '#FEF2F2' : '#FFFBEB';
  const border = red ? '#FECACA' : '#FDE68A';
  return (
    <div className="alert-item" style={{ borderColor: color, background: bg, animationDelay: idx * 65 + 'ms' }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AlertTriangle size={15} color={color} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{emp.department}</div>
      </div>
      <div style={{
        fontWeight: 700, fontSize: 14, color, flexShrink: 0,
        background: color + '15', padding: '4px 10px', borderRadius: 20, border: `1px solid ${border}`,
      }}>{emp.pct}%</div>
    </div>
  );
}

function PayrollBar({ label, value, max, color, delay }) {
  const [w, setW] = useState('0%');
  useEffect(() => {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    const t = setTimeout(() => setW(pct + '%'), 400 + delay);
    return () => clearTimeout(t);
  }, [value, max, delay]);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{rupee(value)}</span>
      </div>
      <div className="payroll-bar-track">
        <div className="payroll-bar-fill" style={{ width: w, background: color }} />
      </div>
    </div>
  );
}

function TimelineItem({ icon: Icon, color, bg, text, time, idx }) {
  return (
    <div className="tl-item" style={{ animationDelay: idx * 65 + 'ms' }}>
      <div className="tl-dot" style={{ background: bg, color }}>
        <Icon size={13} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, paddingTop: 3 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{text}</div>
        <div style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 2 }}>{time}</div>
      </div>
    </div>
  );
}

/* ── Section header helper ───────────────────────────── */
function SH({ icon: Icon, title, sub, color = '#1B4332' }) {
  return (
    <div className="dash-section-head">
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: color + '18', color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={15} strokeWidth={2} />
      </div>
      <h2 className="dash-section-head" style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{title}</h2>
      {sub && <span style={{ fontSize: 11, color: 'var(--subtle)', marginLeft: 4 }}>{sub}</span>}
    </div>
  );
}

/* ── Payroll Deductions Modal ───────────────────────────── */

const STATUS_LABEL = { absent: 'Absent', half_day: 'Half Day', unpaid_leave: 'Unpaid Leave' };
const STATUS_COLOR = { absent: '#DC2626', half_day: '#D97706', unpaid_leave: '#7C3AED' };
const STATUS_BG    = { absent: '#FEF2F2', half_day: '#FFFBEB', unpaid_leave: '#F5F3FF' };

function fmtDate(d) {
  const [, m, day] = d.split('-');
  return `${day} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1]}`;
}

function PayrollDeductionsModal({ asOfDate, onClose }) {
  const [rows, setRows] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    api.get('/analytics/payroll-deductions').then((r) => setRows(r.data));
  }, []);

  const deducted = (rows || []).filter((e) => e.totalDeduction > 0);
  const noDeduction = (rows || []).filter((e) => e.totalDeduction === 0);

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: 40 }}>
      <div className="modal" style={{ maxWidth: 680, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', letterSpacing: '-.2px' }}>Payroll Deductions</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Till {asOfDate} · {deducted.length} employee{deducted.length !== 1 ? 's' : ''} affected</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#F1F5F9', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 22px 18px' }}>
          {!rows ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}><Spinner /></div>
          ) : deducted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748B', fontSize: 13 }}>
              <UserCheck size={32} strokeWidth={1} style={{ display: 'block', margin: '0 auto 10px', opacity: .25 }} />
              No salary deductions this month
            </div>
          ) : (
            <>
              {deducted.map((emp) => (
                <div key={emp.id} style={{ border: '1px solid #E8ECF0', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
                  {/* Employee row */}
                  <div
                    onClick={() => toggle(emp.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', background: '#FAFAFA' }}
                  >
                    {/* Avatar */}
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{emp.department} · {emp.emp_code}</div>
                    </div>
                    {/* Deduction chips */}
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      {emp.absenceDed > 0 && (
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: '#DC2626', background: '#FEF2F2', padding: '2px 7px', borderRadius: 20 }}>
                          −{rupee(emp.absenceDed)} absent
                        </span>
                      )}
                      {emp.halfDayDed > 0 && (
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: '#D97706', background: '#FFFBEB', padding: '2px 7px', borderRadius: 20 }}>
                          −{rupee(emp.halfDayDed)} half-day
                        </span>
                      )}
                      {emp.unpaidLeaveDed > 0 && (
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: '#7C3AED', background: '#F5F3FF', padding: '2px 7px', borderRadius: 20 }}>
                          −{rupee(emp.unpaidLeaveDed)} unpaid
                        </span>
                      )}
                    </div>
                    <div style={{ marginLeft: 6, color: '#94A3B8', flexShrink: 0 }}>
                      {expanded[emp.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expanded[emp.id] && (
                    <div style={{ padding: '12px 14px 14px', borderTop: '1px solid #F1F5F9', background: '#fff' }}>
                      {/* Salary & per-day */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        {[
                          { label: 'Monthly Salary', v: rupee(emp.salary), c: '#0F172A', bg: '#F8FAFC' },
                          { label: 'Per Day Rate',   v: rupee(emp.perDay), c: '#2563EB', bg: '#EFF6FF' },
                          { label: 'Allowed Holidays', v: emp.allowedHolidays + ' days', c: '#16A34A', bg: '#F0FDF4' },
                        ].map((s) => (
                          <div key={s.label} style={{ flex: 1, padding: '7px 9px', borderRadius: 8, background: s.bg, textAlign: 'center' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: s.c }}>{s.v}</div>
                            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Deduction reasons */}
                      {emp.absenceDed > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', marginBottom: 5 }}>
                            Extra Absences ({emp.extraAbsent} day{emp.extraAbsent !== 1 ? 's' : ''} beyond {emp.allowedHolidays} allowed) — −{rupee(emp.absenceDed)}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {emp.dates.filter((d) => d.status === 'absent').map((d) => (
                              <span key={d.date} style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 20, background: '#FEF2F2', color: '#DC2626', fontWeight: 500 }}>{fmtDate(d.date)}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {emp.halfDayDed > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#D97706', marginBottom: 5 }}>
                            Half Days ({emp.half_day} day{emp.half_day !== 1 ? 's' : ''} × ½ per-day) — −{rupee(emp.halfDayDed)}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {emp.dates.filter((d) => d.status === 'half_day').map((d) => (
                              <span key={d.date} style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 20, background: '#FFFBEB', color: '#D97706', fontWeight: 500 }}>{fmtDate(d.date)}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {emp.unpaidLeaveDed > 0 && (
                        <div style={{ marginBottom: 4 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#7C3AED', marginBottom: 5 }}>
                            Unpaid Leave ({emp.unpaid_leave} day{emp.unpaid_leave !== 1 ? 's' : ''} × full per-day) — −{rupee(emp.unpaidLeaveDed)}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {emp.dates.filter((d) => d.status === 'unpaid_leave').map((d) => (
                              <span key={d.date} style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 20, background: '#F5F3FF', color: '#7C3AED', fontWeight: 500 }}>{fmtDate(d.date)}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Net summary */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
                        <span style={{ fontSize: 11.5, color: '#64748B' }}>Earned Gross <b style={{ color: '#0F172A' }}>{rupee(emp.earnedGross)}</b> − Deductions <b style={{ color: '#DC2626' }}>{rupee(emp.totalDeduction)}</b></span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>Net {rupee(emp.netPayable)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* No-deduction employees collapsed list */}
              {noDeduction.length > 0 && (
                <div style={{ marginTop: 6, padding: '9px 14px', borderRadius: 9, background: '#F0FDF4', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserCheck size={14} strokeWidth={2} style={{ color: '#16A34A', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#15803D' }}>
                    <b>{noDeduction.length}</b> employee{noDeduction.length !== 1 ? 's' : ''} with no deductions: {noDeduction.map((e) => e.name).join(', ')}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────────────── */

export default function Dashboard() {
  const { data, trend, deptAtt, payrollProgress } = useDashData();
  const [showDeductions, setShowDeductions] = useState(false);
  const clock = useClock();
  const pad = (n) => String(n).padStart(2, '0');

  if (!data) {
    return (
      <div style={{ padding: '80px 0' }}>
        <Spinner text="Loading Command Center…" />
      </div>
    );
  }

  const dateStr = new Date(data.date).toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const attPct = data.totalEmployees > 0
    ? Math.round((data.present / data.totalEmployees) * 100) : 0;

  const deptSource = deptAtt.length > 0 ? deptAtt : data.deptDistribution.map((d) => ({
    department: d.department, total: d.count, present: Math.round(d.count * 0.82),
  }));

  const tlEvents = [
    { icon: CalendarCheck, color: '#16A34A', bg: '#F0FDF4', time: 'Today',
      text: `${data.present} of ${data.totalEmployees} employees marked present today` },
    data.absent > 0
      ? { icon: AlertTriangle, color: '#DC2626', bg: '#FEF2F2', time: 'Today',
          text: `${data.absent} absent today — attendance follow-up may be needed` }
      : null,
    data.newJoiners > 0
      ? { icon: UserPlus, color: '#7C3AED', bg: '#F5F3FF', time: 'This month',
          text: `${data.newJoiners} new joiner${data.newJoiners > 1 ? 's' : ''} onboarded this month` }
      : null,
    { icon: CircleDollarSign, color: '#4a1b8a', bg: '#EDE9FE', time: 'This month',
      text: `Total payroll: ${rupee(data.salaryExpense)} across ${data.totalEmployees} employees` },
    data.pendingLeaves > 0
      ? { icon: Timer, color: '#D97706', bg: '#FFFBEB', time: 'Action needed',
          text: `${data.pendingLeaves} leave request${data.pendingLeaves > 1 ? 's' : ''} pending approval` }
      : null,
  ].filter(Boolean);

  return (
    <div>

      {/* ── Hero Banner ── */}
      <div className="dash-hero">
        <div className="dash-hero-orb dash-hero-orb-1" />
        <div className="dash-hero-orb dash-hero-orb-2" />
        <div className="dash-hero-orb dash-hero-orb-3" />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.9px', color: 'rgba(255,255,255,.38)', textTransform: 'uppercase', marginBottom: 7 }}>
              🪖 Rayudu Gari Military Hotel — Staff Command Center
            </div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-.3px', color: '#fff', lineHeight: 1.2 }}>
              Workforce Overview
            </h1>
            <div style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,.45)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span className="live-dot" />{dateStr}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
            {/* Live clock */}
            <div className="dash-hero-stat" style={{ background: 'rgba(255,255,255,.06)', backdropFilter: 'blur(8px)', minWidth: 90, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {pad(clock.h)}<span style={{ opacity: clock.s % 2 === 0 ? 1 : .3, transition: 'opacity .2s' }}>:</span>{pad(clock.m)}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', marginTop: 4, fontFeatureSettings: "'tnum'", letterSpacing: '.5px' }}>
                :{pad(clock.s)}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', marginTop: 3, fontWeight: 500, letterSpacing: '.4px', textTransform: 'uppercase' }}>Live Time</div>
            </div>

            {/* Stats */}
            {[
              { label: 'Attendance', value: attPct + '%', color: attPct >= 80 ? '#86efac' : attPct >= 60 ? '#fde68a' : '#fca5a5' },
              { label: 'Payroll',    value: rupee(data.salaryExpense), color: '#c4b5fd' },
              { label: 'Total Staff',value: String(data.totalEmployees), color: '#93c5fd' },
            ].map((s) => (
              <div key={s.label} className="dash-hero-stat" style={{ background: 'rgba(255,255,255,.06)', backdropFilter: 'blur(8px)' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color, letterSpacing: '-.4px', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.38)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 1: KPI Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {KPI.slice(0, 5).map((cfg) => (
          <KpiCard key={cfg.key} cfg={cfg} value={data[cfg.key]} data={data} />
        ))}
        <PayrollKpiCard pp={payrollProgress} />
        {KPI.slice(5).map((cfg) => (
          <KpiCard key={cfg.key} cfg={cfg} value={data[cfg.key]} data={data} />
        ))}
      </div>

      {/* ── Section 2: 30-Day Trend — Full Width ── */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={13} strokeWidth={2} />
            </div>
            <h3 style={{ margin: 0 }}>30-Day Attendance Trend</h3>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[['#1B4332', 'Present'], ['#DC2626', 'Absent'], ['#2563EB', 'Leave']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: c }} />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel-pad" style={{ height: 220 }}>
          {trend.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
              <Activity size={30} strokeWidth={1} style={{ color: 'var(--line)' }} />
              <div style={{ fontSize: 12.5, color: 'var(--subtle)' }}>Trend builds as attendance data accumulates</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1B4332" stopOpacity={.28} />
                    <stop offset="95%" stopColor="#1B4332" stopOpacity={.02} />
                  </linearGradient>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={.22} />
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={.02} />
                  </linearGradient>
                  <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={.18} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} interval={4}
                  fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartStyle} />
                <Area type="monotone" dataKey="present" stackId="a" stroke="#1B4332" strokeWidth={1.5}
                  fill="url(#gP)" isAnimationActive animationDuration={1200} animationEasing="ease-out" name="Present" />
                <Area type="monotone" dataKey="absent" stackId="a" stroke="#DC2626" strokeWidth={1.5}
                  fill="url(#gA)" isAnimationActive animationDuration={1200} animationEasing="ease-out" name="Absent" />
                <Area type="monotone" dataKey="leave" stackId="a" stroke="#2563EB" strokeWidth={1.5}
                  fill="url(#gL)" isAnimationActive animationDuration={1200} animationEasing="ease-out" name="Leave" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Section 3: Weekly Attendance Pulse ── */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: '#F0FDF4', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={13} strokeWidth={2} />
            </div>
            <h3 style={{ margin: 0 }}>Weekly Attendance Pulse</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {[['#10B981','Present'],['#F59E0B','Half Day'],['#3B82F6','Leave'],['#EF4444','Absent']].map(([c,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel-pad" style={{ paddingTop: 8 }}>
          <WeeklyPulse trend={trend} />
        </div>
      </div>

      {/* ── Section 3: Three-col — Donut | Attendance | Payroll ── */}
      <div className="three-col" style={{ marginBottom: 16 }}>

        {/* Premium Dept Donut */}
        <div className="panel">
          <div className="panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: '#F0FDF4', color: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={13} strokeWidth={2} />
              </div>
              <h3 style={{ margin: 0 }}>Departments</h3>
            </div>
          </div>
          <div className="panel-pad" style={{ paddingTop: 4 }}>
            {/* Donut with center overlay */}
            <div style={{ position: 'relative', height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.deptDistribution} dataKey="count" nameKey="department"
                    outerRadius={82} innerRadius={54} paddingAngle={3}
                    isAnimationActive animationDuration={1000} animationEasing="ease-out"
                    strokeWidth={2} stroke="#fff">
                    {data.deptDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} wrapperStyle={{ zIndex: 50 }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center metric */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none',
              }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', lineHeight: 1, fontFeatureSettings: "'tnum'" }}>
                  {data.totalEmployees}
                </div>
                <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 3, fontWeight: 500 }}>Total Staff</div>
              </div>
            </div>
            {/* Premium legend */}
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {data.deptDistribution.map((d, i) => {
                const pct = data.totalEmployees > 0 ? Math.round((d.count / data.totalEmployees) * 100) : 0;
                return (
                  <div key={d.department} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.department}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{d.count}</span>
                    <span style={{ fontSize: 10, color: '#94A3B8', minWidth: 28, textAlign: 'right' }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Attendance Ring + Dept Bars */}
        <div className="panel">
          <div className="panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={13} strokeWidth={2} />
              </div>
              <h3 style={{ margin: 0 }}>Attendance</h3>
            </div>
            <span style={{ fontSize: 11, color: 'var(--subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="live-dot" style={{ width: 5, height: 5 }} /> Live
            </span>
          </div>
          <div className="panel-pad" style={{ paddingTop: 4 }}>
            <AttendanceDonut present={data.present} absent={data.absent} leave={data.onLeaveToday} total={data.totalEmployees} />
            {/* Quick stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginBottom: 14 }}>
              {[
                { label: 'Present', value: data.present, color: '#16A34A', bg: '#F0FDF4' },
                { label: 'Absent',  value: data.absent,  color: '#DC2626', bg: '#FEF2F2' },
                { label: 'Leave',   value: data.onLeaveToday, color: '#2563EB', bg: '#EFF6FF' },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: 'center', padding: '8px 6px', borderRadius: 9, background: s.bg }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: s.color + 'aa', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Dept bars */}
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>Dept breakdown</div>
            {deptSource.slice(0, 5).map((d, i) => (
              <DeptBar key={d.department} dept={d.department} present={d.present} total={d.total} delay={i * 80} />
            ))}
          </div>
        </div>

        {/* Payroll Insights — dynamic */}
        <div className="panel">
          <div className="panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircleDollarSign size={13} strokeWidth={2} />
              </div>
              <h3 style={{ margin: 0 }}>Payroll</h3>
            </div>
            {payrollProgress && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10.5, color: 'var(--subtle)' }}>Till {payrollProgress.asOfDate}</span>
                <button
                  onClick={() => setShowDeductions(true)}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 7,
                    border: '1px solid #E0D9FB', background: '#F5F3FF', color: '#7C3AED',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    transition: 'background .12s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#EDE9FE'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#F5F3FF'; }}
                >
                  <AlertTriangle size={11} strokeWidth={2.2} />
                  Why deducted?
                </button>
              </div>
            )}
          </div>
          <div className="panel-pad" style={{ paddingTop: 4 }}>
            {payrollProgress ? (
              <>
                {/* Net payable — hero metric */}
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#0F1F3D,#1E3A5F)', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    Net Payable Till {payrollProgress.asOfDate}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 3, letterSpacing: '-.4px', fontFeatureSettings: "'tnum'" }}>
                    {rupee(payrollProgress.netPayable)}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.4)', marginTop: 3 }}>
                    {payrollProgress.daysElapsed} of {payrollProgress.daysInMonth} days · {Math.round((payrollProgress.daysElapsed / payrollProgress.daysInMonth) * 100)}% of month
                  </div>
                  {/* Progress bar */}
                  <div style={{ marginTop: 8, height: 4, background: 'rgba(255,255,255,.12)', borderRadius: 99 }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      background: 'linear-gradient(90deg,#34d399,#10b981)',
                      width: `${Math.round((payrollProgress.daysElapsed / payrollProgress.daysInMonth) * 100)}%`,
                      transition: 'width 1s cubic-bezier(.4,0,.2,1)',
                    }} />
                  </div>
                </div>

                {/* Commitment vs earned */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {[
                    { label: 'Monthly Commitment', v: payrollProgress.totalMonthlySalary, c: '#6D28D9', bg: '#F5F3FF' },
                    { label: 'Earned Gross',        v: payrollProgress.earnedGross,        c: '#1E40AF', bg: '#EFF6FF' },
                  ].map((s) => (
                    <div key={s.label} style={{ flex: 1, padding: '9px 10px', borderRadius: 9, background: s.bg }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: s.c, fontFeatureSettings: "'tnum'" }}>{rupee(s.v)}</div>
                      <div style={{ fontSize: 10, color: s.c + 'aa', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Deductions breakdown */}
                {payrollProgress.totalDeductions > 0 && (
                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
                      Deductions
                    </div>
                    {[
                      { label: 'Extra Absences',  v: payrollProgress.absenceDeductions,     c: '#DC2626' },
                      { label: 'Half Days',        v: payrollProgress.halfDayDeductions,     c: '#D97706' },
                      { label: 'Unpaid Leave',     v: payrollProgress.unpaidLeaveDeductions, c: '#7C3AED' },
                    ].filter((d) => d.v > 0).map((d) => (
                      <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.c, flexShrink: 0 }} />
                          <span style={{ fontSize: 11.5, color: '#64748B' }}>{d.label}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: d.c }}>−{rupee(d.v)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid #F1F5F9', marginTop: 4 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#374151' }}>Total Deductions</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#DC2626' }}>−{rupee(payrollProgress.totalDeductions)}</span>
                    </div>
                  </div>
                )}

                {/* Outstanding advances */}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  {[
                    { label: 'Advances Out',   v: data.outstandingAdvances, c: '#92400E', bg: '#FEF3C7' },
                  ].map((s) => (
                    <div key={s.label} style={{ flex: 1, padding: '8px 10px', borderRadius: 9, background: s.bg }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: s.c, fontFeatureSettings: "'tnum'" }}>{rupee(s.v)}</div>
                      <div style={{ fontSize: 10, color: s.c + 'aa', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Fallback while loading */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Monthly Commitment', v: data.salaryExpense,       c: '#6D28D9', bg: '#F5F3FF' },
                  { label: 'Advances Out',        v: data.outstandingAdvances, c: '#92400E', bg: '#FEF3C7' },
                ].map((s) => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: 9, background: s.bg }}>
                    <span style={{ fontSize: 11.5, color: s.c + 'cc', fontWeight: 500 }}>{s.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: s.c }}>{rupee(s.v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 4: Top Performers + Alerts ── */}
      <div className="two-col" style={{ marginBottom: 16 }}>
        {data.topAttendance?.length > 0 && (
          <div className="panel">
            <div className="panel-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: '#FEF9C3', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award size={13} strokeWidth={2} />
                </div>
                <h3 style={{ margin: 0 }}>Top Performers</h3>
              </div>
              <span style={{ fontSize: 11, color: 'var(--subtle)' }}>Highest attendance this month</span>
            </div>
            <div className="panel-pad" style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(data.topAttendance.length, 5)}, 1fr)`,
              gap: 10,
            }}>
              {data.topAttendance.slice(0, 5).map((emp, i) => (
                <PerformerCard key={emp.id} emp={emp} rank={i} />
              ))}
            </div>
          </div>
        )}

        <div className="panel">
          <div className="panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: '#FFFBEB', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={13} strokeWidth={2} />
              </div>
              <h3 style={{ margin: 0 }}>Needs Attention</h3>
            </div>
            <span style={{ fontSize: 11, color: 'var(--subtle)' }}>Low attendance</span>
          </div>
          <div className="panel-pad">
            {!data.lowAttendance?.length ? (
              <div style={{ textAlign: 'center', padding: '22px 0', color: 'var(--subtle)' }}>
                <UserCheck size={28} strokeWidth={1} style={{ display: 'block', margin: '0 auto 8px', opacity: .2 }} />
                <div style={{ fontSize: 12.5 }}>All employees are on track</div>
              </div>
            ) : (
              data.lowAttendance.map((emp, i) => <AlertItem key={emp.id} emp={emp} idx={i} />)
            )}
          </div>
        </div>
      </div>

      {/* ── Section 5: Attendance Bar + Activity ── */}
      <div className="two-col">
        {/* Attendance Leaders Bar */}
        <div className="panel">
          <div className="panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: '#EDE9FE', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={13} strokeWidth={2} />
              </div>
              <h3 style={{ margin: 0 }}>Leaders</h3>
            </div>
            <span style={{ fontSize: 11, color: 'var(--subtle)' }}>Top 5</span>
          </div>
          <div className="panel-pad" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topAttendance} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 100]} fontSize={10} unit="%"
                  tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={80} fontSize={10}
                  tick={{ fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [v + '%', 'Attendance']} contentStyle={chartStyle} cursor={{ fill: '#F9FAFB' }} />
                <Bar dataKey="pct" radius={[0, 5, 5, 0]} barSize={10} isAnimationActive animationDuration={1100} animationEasing="ease-out">
                  {data.topAttendance.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="panel">
          <div className="panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: '#F0FDF4', color: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={13} strokeWidth={2} />
              </div>
              <h3 style={{ margin: 0 }}>Activity</h3>
            </div>
            <span style={{ fontSize: 11, color: 'var(--subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="live-dot" style={{ width: 5, height: 5 }} /> Today
            </span>
          </div>
          <div className="panel-pad">
            {tlEvents.map((ev, i) => <TimelineItem key={i} idx={i} {...ev} />)}
          </div>
        </div>
      </div>

      {showDeductions && payrollProgress && (
        <PayrollDeductionsModal
          asOfDate={payrollProgress.asOfDate}
          onClose={() => setShowDeductions(false)}
        />
      )}
    </div>
  );
}
