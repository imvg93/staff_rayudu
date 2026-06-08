import { useState } from 'react';
import { useApi, Spinner, EmployeeSelect } from '../components/ui.jsx';
import api, { rupee, thisMonth } from '../api.js';
import { Printer, Lock, Check } from 'lucide-react';

function prevMonth() {
  const d = new Date(); d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

export default function SalarySlip() {
  const [empId, setEmpId] = useState('');
  const [month, setMonth] = useState(prevMonth());
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!empId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/payroll/slip/${empId}/${month}`);
      setSlip(data);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-head">
        <div><h1>Salary Slip</h1><p>Generate & print individual employee pay slips</p></div>
        {slip && (
          <button className="btn" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Printer size={13} strokeWidth={1.8} /> Print Slip</button>
        )}
      </div>

      <div className="toolbar" style={{ marginBottom: 20 }}>
        <div style={{ minWidth: 280 }}><EmployeeSelect value={empId} onChange={setEmpId} /></div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <button className="btn" onClick={load} disabled={!empId || loading}>
          {loading ? 'Loading…' : 'Generate Slip'}
        </button>
      </div>

      {loading && <Spinner />}
      {slip && !loading && <SlipView slip={slip} />}
      {!slip && !loading && (
        <div className="panel"><div className="empty">Select an employee and month, then click Generate Slip.</div></div>
      )}
    </div>
  );
}

export function SlipView({ slip }) {
  const { employee: e, payroll: p, advances, penalties, attendance: att, month } = slip;
  const monthLabel = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const totalDays = p.total_days_in_month || 30;
  const perDay = p.per_day_salary || Math.round(p.base_salary / totalDays);
  const allowedHolidays = p.allowed_holidays ?? (e.monthly_allowed_holidays ?? 4);
  const absenceDed = p.absence_deduction || 0;
  const halfDed = p.half_day_deduction || 0;
  const totalDed = (p.advance_deduction || 0) + (p.penalty_deduction || 0) + absenceDed + halfDed
    + (p.food_deduction || 0) + (p.other_deductions || 0);

  return (
    <div className="slip-wrap" id="salary-slip">
      <div className="slip-head">
        <h2>🪖 Rayudu Gari Military Hotel</h2>
        <p>Salary Slip — {monthLabel}</p>
      </div>

      <div className="slip-emp">
        <img src={e.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(e.name)}`} alt="" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{e.name}</div>
          <div style={{ color: '#6b7a72', fontSize: 13 }}>{e.emp_code} · {e.designation} · {e.department}</div>
          <div style={{ color: '#6b7a72', fontSize: 12, marginTop: 2 }}>Shift: {e.shift} · Joined: {e.joining_date}</div>
        </div>
      </div>

      <div className="slip-att">
        <div className="item"><div className="v" style={{ color: '#2e7d32' }}>{att?.present || 0}</div><div className="l">Present</div></div>
        <div className="item"><div className="v" style={{ color: '#c0392b' }}>{att?.absent || 0}</div><div className="l">Absent</div></div>
        <div className="item"><div className="v" style={{ color: '#c8860d' }}>{att?.half_day || 0}</div><div className="l">Half Day</div></div>
        <div className="item"><div className="v" style={{ color: '#2c6e9b' }}>{att?.weekly_off || 0}</div><div className="l">Weekly Off</div></div>
        <div className="item"><div className="v" style={{ color: '#2c6e9b' }}>{att?.paid_leave || 0}</div><div className="l">Paid Leave</div></div>
        <div className="item"><div className="v" style={{ color: '#c8860d' }}>{att?.late || 0}</div><div className="l">Late</div></div>
      </div>

      <div style={{ padding: '8px 28px', background: '#f5f7f5', borderBottom: '1px solid var(--line)', fontSize: 12.5, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <span>Total Days in Month: <b>{totalDays}</b></span>
        <span>Allowed Holidays: <b>{allowedHolidays}</b></span>
        <span>Per Day Salary: <b>{rupee(perDay)}</b></span>
        <span style={{ color: '#c0392b' }}>Extra Absent Days: <b>{p.extra_absent_days || 0}</b></span>
      </div>

      <table className="slip-table">
        <thead>
          <tr><th>Earnings</th><th>Amount</th><th>Deductions</th><th>Amount</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Basic Salary</td>
            <td className="earning">{rupee(p.base_salary)}</td>
            <td>Absence Deduction ({p.extra_absent_days || 0} days × {rupee(perDay)})</td>
            <td className="deduction">{absenceDed > 0 ? `− ${rupee(absenceDed)}` : '—'}</td>
          </tr>
          <tr>
            <td>Overtime</td>
            <td className="earning">{(p.overtime || 0) > 0 ? rupee(p.overtime) : '—'}</td>
            <td>Half-Day Deduction ({att?.half_day || 0} days × ½)</td>
            <td className="deduction">{halfDed > 0 ? `− ${rupee(halfDed)}` : '—'}</td>
          </tr>
          <tr>
            <td>Bonus</td>
            <td className="earning">{(p.bonus || 0) > 0 ? rupee(p.bonus) : '—'}</td>
            <td>{advances.length > 0 ? `Advance Recovery (${advances.length} loan${advances.length > 1 ? 's' : ''})` : 'Advance Recovery'}</td>
            <td className="deduction">{(p.advance_deduction || 0) > 0 ? `− ${rupee(p.advance_deduction)}` : '—'}</td>
          </tr>
          <tr>
            <td>Manual Adjustment (+)</td>
            <td className="earning">{(p.manual_correction || 0) > 0 ? rupee(p.manual_correction) : '—'}</td>
            <td>{penalties.length > 0 ? `Penalties (${penalties.length} fine${penalties.length > 1 ? 's' : ''})` : 'Penalties'}</td>
            <td className="deduction">{(p.penalty_deduction || 0) > 0 ? `− ${rupee(p.penalty_deduction)}` : '—'}</td>
          </tr>
          <tr>
            <td></td><td></td>
            <td>Food Deduction</td>
            <td className="deduction">{(p.food_deduction || 0) > 0 ? `− ${rupee(p.food_deduction)}` : '—'}</td>
          </tr>
          <tr>
            <td></td><td></td>
            <td>Other Deductions</td>
            <td className="deduction">{(p.other_deductions || 0) > 0 ? `− ${rupee(p.other_deductions)}` : '—'}</td>
          </tr>
          <tr>
            <td></td><td></td>
            <td>Manual Adjustment (−)</td>
            <td className="deduction">{(p.manual_correction || 0) < 0 ? `− ${rupee(Math.abs(p.manual_correction))}` : '—'}</td>
          </tr>
          <tr style={{ background: '#f9fbf9' }}>
            <td><b>Gross Earnings</b></td>
            <td><b>{rupee((p.base_salary || 0) + (p.overtime || 0) + (p.bonus || 0) + Math.max(0, p.manual_correction || 0))}</b></td>
            <td><b>Total Deductions</b></td>
            <td><b style={{ color: '#c0392b' }}>− {rupee(totalDed + Math.max(0, -(p.manual_correction || 0)))}</b></td>
          </tr>
        </tbody>
      </table>

      {penalties.length > 0 && (
        <div style={{ padding: '10px 28px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontSize: 12, color: '#6b7a72', fontWeight: 600, marginBottom: 6 }}>PENALTY DETAILS</div>
          {penalties.map((pen, i) => (
            <div key={i} style={{ fontSize: 12.5, color: '#c0392b', marginBottom: 2 }}>
              • {pen.type} — {rupee(pen.amount)} ({pen.reason})
            </div>
          ))}
        </div>
      )}

      <div className="slip-net">
        <div>
          <div className="label">Net Salary Payable</div>
          <div style={{ fontSize: 12, color: '#6b7a72', marginTop: 2 }}>
            Base {rupee(p.base_salary)} + Earnings {rupee((p.overtime || 0) + (p.bonus || 0) + Math.max(0, p.manual_correction || 0))} − Deductions {rupee(totalDed + Math.max(0, -(p.manual_correction || 0)))}
          </div>
        </div>
        <div className="amount">{rupee(p.net_salary)}</div>
      </div>

      {p.approved_by && (
        <div style={{ padding: '8px 28px', fontSize: 12, color: '#6b7a72', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 5 }}>
          {p.status === 'locked'
            ? <Lock size={11} strokeWidth={2} style={{ color: '#1a1a2e' }} />
            : <Check size={11} strokeWidth={2} style={{ color: '#2e7d32' }} />}
          {p.status === 'locked' ? 'Locked' : 'Approved'} by <b>{p.approved_by}</b> on {p.approved_at}
        </div>
      )}
    </div>
  );
}
