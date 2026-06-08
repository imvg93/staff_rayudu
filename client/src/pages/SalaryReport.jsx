import { useState, useEffect } from 'react';
import api, { rupee } from '../api.js';
import { Spinner, EmployeeSelect } from '../components/ui.jsx';
import { Printer, Users, CircleDollarSign, TrendingDown, Landmark } from 'lucide-react';

function prevMonth() {
  const d = new Date(); d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

export default function SalaryReport() {
  const [month, setMonth] = useState(prevMonth());
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [empFilter, setEmpFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    setRows(null);
    api.get(`/payroll?month=${month}`)
      .then((r) => setRows(r.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [month]);

  const visible = empFilter
    ? (rows || []).filter((r) => String(r.employee_id) === empFilter)
    : (rows || []);

  const monthLabel = month
    ? new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '';
  const generated = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="page-head no-print">
        <div><h1>Salary Report</h1><p>Full printable monthly salary report with deduction breakdown</p></div>
        {rows && rows.length > 0 && (
          <button className="btn" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Printer size={13} strokeWidth={1.8} /> Print Report</button>
        )}
      </div>

      <div className="toolbar no-print">
        <label style={{ fontSize: 13, color: '#6b7a72' }}>Month</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <div style={{ minWidth: 240 }}>
          <EmployeeSelect value={empFilter} onChange={setEmpFilter} placeholder="All Employees" allowAll />
        </div>
      </div>

      {loading ? <Spinner /> : !rows ? null : rows.length === 0 ? (
        <div className="panel no-print"><div className="empty">No payroll for {month}. Go to Payroll and click "Process Payroll" first.</div></div>
      ) : (
        <div>
          {/* Print header — only shown when printing */}
          <div className="print-only" style={{ textAlign: 'center', marginBottom: 24, borderBottom: '2px solid #3a5a40', paddingBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>🪖 Rayudu Gari Military Hotel</h2>
            <div style={{ fontSize: 14, marginTop: 4 }}>Monthly Salary Report — {monthLabel}</div>
            <div style={{ fontSize: 12, color: '#6b7a72', marginTop: 2 }}>Generated on {generated}</div>
          </div>

          {/* Summary stats */}
          <div className="grid stats no-print" style={{ marginBottom: 16 }}>
            <div className="stat-card"><div className="ic"><Users size={16} strokeWidth={1.8} /></div><div><div className="v">{visible.length}</div><div className="l">Employees</div></div></div>
            <div className="stat-card"><div className="ic"><CircleDollarSign size={16} strokeWidth={1.8} /></div><div><div className="v">{rupee(visible.reduce((s, r) => s + (r.net_salary || 0), 0))}</div><div className="l">Total Payout</div></div></div>
            <div className="stat-card"><div className="ic"><TrendingDown size={16} strokeWidth={1.8} /></div><div><div className="v">{rupee(visible.reduce((s, r) => s + (r.absence_deduction || 0), 0))}</div><div className="l">Absence Deducted</div></div></div>
            <div className="stat-card"><div className="ic"><Landmark size={16} strokeWidth={1.8} /></div><div><div className="v">{rupee(visible.reduce((s, r) => s + (r.advance_deduction || 0), 0))}</div><div className="l">Advance Recovered</div></div></div>
          </div>

          {/* Full table */}
          <div className="panel">
            <div className="table-wrap">
              <table className="data salary-report-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th rowSpan={2}>Employee</th>
                    <th colSpan={4} style={{ textAlign: 'center', background: '#e6f4ea' }}>Attendance</th>
                    <th colSpan={4} style={{ textAlign: 'center', background: '#fbeae8' }}>Deductions</th>
                    <th colSpan={2} style={{ textAlign: 'center', background: '#e8f0f8' }}>Adjustments</th>
                    <th rowSpan={2} style={{ background: '#e6f4ea' }}>Net Salary</th>
                    <th rowSpan={2}>Status</th>
                  </tr>
                  <tr>
                    <th style={{ background: '#f0faf1', fontSize: 11 }}>Present</th>
                    <th style={{ background: '#f0faf1', fontSize: 11 }}>Absent</th>
                    <th style={{ background: '#f0faf1', fontSize: 11 }}>Extra Abs.</th>
                    <th style={{ background: '#f0faf1', fontSize: 11 }}>Half Day</th>
                    <th style={{ background: '#fdf1f0', fontSize: 11 }}>Abs.Ded.</th>
                    <th style={{ background: '#fdf1f0', fontSize: 11 }}>H.Day Ded.</th>
                    <th style={{ background: '#fdf1f0', fontSize: 11 }}>Advance</th>
                    <th style={{ background: '#fdf1f0', fontSize: 11 }}>Penalty</th>
                    <th style={{ background: '#eef3fa', fontSize: 11 }}>Bonus</th>
                    <th style={{ background: '#eef3fa', fontSize: 11 }}>Manual</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.employee_name}</div>
                        <div style={{ fontSize: 11, color: '#6b7a72' }}>{r.emp_code} · {r.department}</div>
                        <div style={{ fontSize: 11, color: '#6b7a72' }}>Base: {rupee(r.base_salary)} · ₹{Math.round(r.per_day_salary || r.base_salary / (r.total_days_in_month || 30))}/day</div>
                      </td>
                      <td style={{ textAlign: 'center', color: '#2e7d32', fontWeight: 600 }}>{r.present_days || 0}</td>
                      <td style={{ textAlign: 'center', color: r.absent_days > 0 ? '#c0392b' : undefined }}>{r.absent_days || 0}</td>
                      <td style={{ textAlign: 'center', color: r.extra_absent_days > 0 ? '#c0392b' : '#6b7a72', fontWeight: r.extra_absent_days > 0 ? 700 : 400 }}>{r.extra_absent_days || 0}</td>
                      <td style={{ textAlign: 'center' }}>{r.half_days || 0}</td>
                      <td style={{ textAlign: 'right', color: '#c0392b' }}>{(r.absence_deduction || 0) > 0 ? `− ${rupee(r.absence_deduction)}` : '—'}</td>
                      <td style={{ textAlign: 'right', color: '#c8860d' }}>{(r.half_day_deduction || 0) > 0 ? `− ${rupee(r.half_day_deduction)}` : '—'}</td>
                      <td style={{ textAlign: 'right', color: '#bc6c25' }}>{(r.advance_deduction || 0) > 0 ? `− ${rupee(r.advance_deduction)}` : '—'}</td>
                      <td style={{ textAlign: 'right', color: '#c0392b' }}>{(r.penalty_deduction || 0) > 0 ? `− ${rupee(r.penalty_deduction)}` : '—'}</td>
                      <td style={{ textAlign: 'right', color: '#2e7d32' }}>{(r.bonus || 0) > 0 ? `+ ${rupee(r.bonus)}` : '—'}</td>
                      <td style={{ textAlign: 'right', color: (r.manual_correction || 0) >= 0 ? '#2e7d32' : '#c0392b' }}>
                        {(r.manual_correction || 0) !== 0 ? ((r.manual_correction > 0 ? '+' : '') + rupee(r.manual_correction)) : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}><b style={{ color: '#2e7d32', fontSize: 13 }}>{rupee(r.net_salary)}</b></td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 600,
                          color: r.status === 'locked' ? '#1a1a2e' : r.status === 'approved' ? '#2e7d32' : '#6b7a72' }}>
                          {r.status === 'locked' ? 'Locked' : r.status === 'approved' ? 'Approved' : 'Draft'}
                        </span>
                        {r.approved_by && <div style={{ fontSize: 10, color: '#6b7a72' }}>{r.approved_by}</div>}
                      </td>
                    </tr>
                  ))}
                  {visible.length > 1 && (
                    <tr style={{ background: '#f5f7f5', fontWeight: 700 }}>
                      <td>TOTAL ({visible.length} employees)</td>
                      <td style={{ textAlign: 'center' }}></td>
                      <td style={{ textAlign: 'center', color: '#c0392b' }}>{visible.reduce((s, r) => s + (r.absent_days || 0), 0)}</td>
                      <td style={{ textAlign: 'center', color: '#c0392b' }}>{visible.reduce((s, r) => s + (r.extra_absent_days || 0), 0)}</td>
                      <td style={{ textAlign: 'center' }}>{visible.reduce((s, r) => s + (r.half_days || 0), 0)}</td>
                      <td style={{ textAlign: 'right', color: '#c0392b' }}>− {rupee(visible.reduce((s, r) => s + (r.absence_deduction || 0), 0))}</td>
                      <td style={{ textAlign: 'right', color: '#c8860d' }}>− {rupee(visible.reduce((s, r) => s + (r.half_day_deduction || 0), 0))}</td>
                      <td style={{ textAlign: 'right', color: '#bc6c25' }}>− {rupee(visible.reduce((s, r) => s + (r.advance_deduction || 0), 0))}</td>
                      <td style={{ textAlign: 'right', color: '#c0392b' }}>− {rupee(visible.reduce((s, r) => s + (r.penalty_deduction || 0), 0))}</td>
                      <td></td><td></td>
                      <td style={{ textAlign: 'right' }}><b style={{ color: '#2e7d32' }}>{rupee(visible.reduce((s, r) => s + (r.net_salary || 0), 0))}</b></td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="no-print" style={{ marginTop: 12, fontSize: 12, color: '#6b7a72' }}>
            Formula: Net = Base Salary − Absence Deduction (extra absent days × per day salary) − Half-Day Deduction − Advance Recovery − Penalties ± Adjustments
          </div>
        </div>
      )}
    </div>
  );
}
