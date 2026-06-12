import { useState, useEffect } from 'react';
import api, { rupee, fmtDate } from '../api.js';
import { Spinner, EmployeeCell, EmployeeSelect, Modal } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { SlipView } from './SalarySlip.jsx';
import {
  Printer, CheckCheck, Lock, LockOpen, Pencil, Check,
  FileText, Settings, Briefcase, CircleDollarSign, TrendingDown, Landmark,
} from 'lucide-react';

function prevMonth() {
  const d = new Date(); d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

const STATUS_COLORS = { processed: '#6b7a72', approved: '#2e7d32', locked: '#1a1a2e' };
const STATUS_LABELS = { processed: 'Draft', approved: 'Approved', locked: 'Locked' };

export default function Payroll() {
  const [tab, setTab] = useState('payroll');
  return (
    <div>
      <div className="page-head">
        <div><h1>Payroll Management</h1><p>Attendance-based salary: base − absence deduction − advance − penalty = net</p></div>
        <div className="btn-row">
          <button className={`btn sm ${tab === 'payroll' ? '' : 'gray'}`} onClick={() => setTab('payroll')}>Monthly Payroll</button>
          <button className={`btn sm ${tab === 'history' ? '' : 'gray'}`} onClick={() => setTab('history')}>Salary History</button>
        </div>
      </div>
      {tab === 'payroll' ? <MonthlyPayroll /> : <SalaryHistory />}
    </div>
  );
}

function MonthlyPayroll() {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'supervisor';
  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';
  const canEdit = isAdminOrOwner || isSupervisor;
  const canApprove = isAdminOrOwner;
  const canLock = isAdminOrOwner || isSupervisor;
  const canUnlock = isAdminOrOwner;
  const [month, setMonth] = useState(prevMonth());
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [slipData, setSlipData] = useState(null);
  const [adjustRow, setAdjustRow] = useState(null);
  const [adjForm, setAdjForm] = useState({});
  const [adjSaving, setAdjSaving] = useState(false);

  const adjustmentInputValue = (value) => (value === 0 || value == null ? '' : value);
  const setAdjustmentAmount = (field, value) => {
    setAdjForm((current) => ({
      ...current,
      [field]: value === '' ? '' : Number(value),
    }));
  };

  const load = () => { setRows(null); api.get(`/payroll?month=${month}`).then((r) => setRows(r.data)); };
  useEffect(load, [month]);

  const generate = async () => {
    setBusy(true);
    try { await api.post('/payroll/generate', { month }); load(); }
    finally { setBusy(false); }
  };

  const openSlip = async (row) => {
    const { data } = await api.get(`/payroll/slip/${row.employee_id}/${month}`);
    setSlipData(data);
  };

  const openAdjust = (row) => {
    setAdjRow(row);
    setAdjForm({
      overtime: row.overtime || 0,
      bonus: row.bonus || 0,
      food_deduction: row.food_deduction || 0,
      other_deductions: row.other_deductions || 0,
      manual_correction: row.manual_correction || 0,
    });
  };

  const [adjRow, setAdjRow] = useState(null);
  const saveAdj = async () => {
    setAdjSaving(true);
    try {
      await api.put(`/payroll/${adjRow.id}`, {
        overtime: Number(adjForm.overtime) || 0,
        bonus: Number(adjForm.bonus) || 0,
        food_deduction: Number(adjForm.food_deduction) || 0,
        other_deductions: Number(adjForm.other_deductions) || 0,
        manual_correction: Number(adjForm.manual_correction) || 0,
      });
      setAdjRow(null);
      load();
    } finally { setAdjSaving(false); }
  };

  const approve = async (row) => {
    await api.put(`/payroll/${row.id}/approve`);
    load();
  };
  const lock = async (row) => {
    await api.put(`/payroll/${row.id}/lock`);
    load();
  };
  const unlock = async (row) => {
    await api.put(`/payroll/${row.id}/unlock`);
    load();
  };
  const approveAll = async () => {
    setBusy(true);
    try { await api.post('/payroll/approve-all', { month }); load(); }
    finally { setBusy(false); }
  };
  const lockAll = async () => {
    setBusy(true);
    try { await api.post('/payroll/lock-all', { month }); load(); }
    finally { setBusy(false); }
  };

  const totals = (rows || []).reduce((t, r) => ({
    base: t.base + (r.base_salary || 0),
    absenceDed: t.absenceDed + (r.absence_deduction || 0),
    adv: t.adv + (r.advance_deduction || 0),
    pen: t.pen + (r.penalty_deduction || 0),
    net: t.net + (r.net_salary || 0),
  }), { base: 0, absenceDed: 0, adv: 0, pen: 0, net: 0 });

  return (
    <>
      <div className="toolbar">
        <label style={{ fontSize: 13, color: '#6b7a72' }}>Month</label>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <div className="spacer" />
        {rows && rows.length > 0 && (
          <>
            <button className="btn ghost sm" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Printer size={13} strokeWidth={1.8} /> Print</button>
            {canApprove && (
              <button className="btn sm gray" onClick={approveAll} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><CheckCheck size={13} strokeWidth={1.8} /> Approve All</button>
            )}
            {canLock && (
              <button className="btn sm" style={{ background: '#1a1a2e', display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={lockAll} disabled={busy}><Lock size={13} strokeWidth={1.8} /> Lock Month</button>
            )}
          </>
        )}
        <button className="btn" onClick={generate} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{busy ? 'Processing…' : <><Settings size={13} strokeWidth={1.8} /> Process Payroll</>}</button>
      </div>

      {!rows ? <Spinner /> : rows.length === 0 ? (
        <div className="panel"><div className="empty">No payroll for {month}. Click "Process Payroll" to generate.</div></div>
      ) : (
        <>
          <div className="grid stats" style={{ marginBottom: 16 }}>
            <div className="stat-card"><div className="ic"><Briefcase size={16} strokeWidth={1.8} /></div><div><div className="v">{rows.length}</div><div className="l">Employees</div></div></div>
            <div className="stat-card"><div className="ic"><CircleDollarSign size={16} strokeWidth={1.8} /></div><div><div className="v">{rupee(totals.net)}</div><div className="l">Total Net Payout</div></div></div>
            <div className="stat-card"><div className="ic"><TrendingDown size={16} strokeWidth={1.8} /></div><div><div className="v">{rupee(totals.absenceDed)}</div><div className="l">Absence Deducted</div></div></div>
            <div className="stat-card"><div className="ic"><Landmark size={16} strokeWidth={1.8} /></div><div><div className="v">{rupee(totals.adv)}</div><div className="l">Advance Recovered</div></div></div>
          </div>
          <div className="panel">
            <div className="table-wrap">
              <table className="data" style={{ fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Base</th>
                    <th title="Per Day Salary">₹/Day</th>
                    <th title="Total Absent Days">Absent</th>
                    <th title="Extra Absent (beyond quota)">Extra</th>
                    <th style={{ color: '#c0392b' }} title="Absence Deduction">Abs.Ded.</th>
                    <th style={{ color: '#c8860d' }} title="Half-Day Deduction">H.Day</th>
                    <th style={{ color: '#bc6c25' }}>Advance</th>
                    <th style={{ color: '#c0392b' }}>Penalty</th>
                    <th><b style={{ color: '#2e7d32' }}>Net</b></th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td><EmployeeCell row={r} /></td>
                      <td>{rupee(r.base_salary)}</td>
                      <td style={{ color: '#6b7a72' }}>{rupee(r.per_day_salary || Math.round(r.base_salary / (r.total_days_in_month || 30)))}</td>
                      <td>{r.absent_days || 0}</td>
                      <td style={{ color: r.extra_absent_days > 0 ? '#c0392b' : '#6b7a72' }}>{r.extra_absent_days || 0}</td>
                      <td style={{ color: '#c0392b' }}>{r.absence_deduction > 0 ? `− ${rupee(r.absence_deduction)}` : '—'}</td>
                      <td style={{ color: '#c8860d' }}>{r.half_day_deduction > 0 ? `− ${rupee(r.half_day_deduction)}` : '—'}</td>
                      <td style={{ color: '#bc6c25' }}>{r.advance_deduction > 0 ? `− ${rupee(r.advance_deduction)}` : '—'}</td>
                      <td style={{ color: '#c0392b' }}>{r.penalty_deduction > 0 ? `− ${rupee(r.penalty_deduction)}` : '—'}</td>
                      <td>
                        <b style={{ color: '#2e7d32', fontSize: 13 }}>{rupee(r.net_salary)}</b>
                        <AdjTags row={r} />
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLORS[r.status] || '#6b7a72' }}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      </td>
                      <td>
                        <div className="btn-row" style={{ gap: 4 }}>
                          <button className="btn sm ghost" onClick={() => openSlip(r)} title="View Slip" style={{ display: 'inline-flex', alignItems: 'center' }}><FileText size={13} strokeWidth={1.8} /></button>
                          {canEdit && r.status !== 'locked' && (
                            <button className="btn sm gray" onClick={() => openAdjust(r)} title="Adjust" style={{ display: 'inline-flex', alignItems: 'center' }}><Pencil size={12} strokeWidth={1.8} /></button>
                          )}
                          {canApprove && r.status === 'processed' && (
                            <button className="btn sm" style={{ background: '#2e7d32', padding: '3px 7px', display: 'inline-flex', alignItems: 'center' }}
                              onClick={() => approve(r)} title="Approve"><Check size={12} strokeWidth={2} /></button>
                          )}
                          {canLock && (r.status === 'approved' || (isSupervisor && r.status === 'processed')) && (
                            <button className="btn sm" style={{ background: '#1a1a2e', padding: '3px 7px', display: 'inline-flex', alignItems: 'center' }}
                              onClick={() => lock(r)} title="Lock"><Lock size={12} strokeWidth={2} /></button>
                          )}
                          {canUnlock && r.status === 'locked' && (
                            <button className="btn sm" style={{ background: '#c0392b', padding: '3px 7px', display: 'inline-flex', alignItems: 'center' }}
                              title="Unlock — revert to Approved" onClick={() => unlock(r)}><LockOpen size={12} strokeWidth={2} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f5f7f5', fontWeight: 700 }}>
                    <td>TOTAL</td>
                    <td>{rupee(totals.base)}</td>
                    <td></td><td></td><td></td>
                    <td style={{ color: '#c0392b' }}>{totals.absenceDed > 0 ? `− ${rupee(totals.absenceDed)}` : '—'}</td>
                    <td></td>
                    <td style={{ color: '#bc6c25' }}>{totals.adv > 0 ? `− ${rupee(totals.adv)}` : '—'}</td>
                    <td style={{ color: '#c0392b' }}>{totals.pen > 0 ? `− ${rupee(totals.pen)}` : '—'}</td>
                    <td><b style={{ color: '#2e7d32' }}>{rupee(totals.net)}</b></td>
                    <td></td><td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {slipData && (
        <Modal title="Salary Slip" onClose={() => setSlipData(null)}
          footer={
            <>
              <button className="btn gray" onClick={() => setSlipData(null)}>Close</button>
              <button className="btn" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Printer size={13} strokeWidth={1.8} /> Print</button>
            </>
          }>
          <SlipView slip={slipData} />
        </Modal>
      )}

      {adjRow && (
        <Modal title={`Adjustments — ${adjRow.employee_name}`}
          onClose={() => setAdjRow(null)}
          footer={<>
            <button className="btn gray" onClick={() => setAdjRow(null)}>Cancel</button>
            <button className="btn" onClick={saveAdj} disabled={adjSaving}>{adjSaving ? 'Saving…' : 'Save & Recalculate'}</button>
          </>}>
          <div style={{ marginBottom: 10, padding: '8px 12px', background: '#f5f7f5', borderRadius: 8, fontSize: 13 }}>
            Base Salary: <b>{rupee(adjRow.base_salary)}</b> · Absence Ded: <b style={{ color: '#c0392b' }}>{rupee(adjRow.absence_deduction || 0)}</b>
          </div>
          <div className="form-grid">
            <div>
              <label style={{ fontSize: 12, color: '#6b7a72', display: 'block', marginBottom: 4 }}>Overtime (₹)</label>
              <input type="number" min="0" placeholder="0" value={adjustmentInputValue(adjForm.overtime)}
                onChange={(e) => setAdjustmentAmount('overtime', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#6b7a72', display: 'block', marginBottom: 4 }}>Bonus (₹)</label>
              <input type="number" min="0" placeholder="0" value={adjustmentInputValue(adjForm.bonus)}
                onChange={(e) => setAdjustmentAmount('bonus', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#6b7a72', display: 'block', marginBottom: 4 }}>Food Deduction (₹)</label>
              <input type="number" min="0" placeholder="0" value={adjustmentInputValue(adjForm.food_deduction)}
                onChange={(e) => setAdjustmentAmount('food_deduction', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#6b7a72', display: 'block', marginBottom: 4 }}>Other Deductions (₹)</label>
              <input type="number" min="0" placeholder="0" value={adjustmentInputValue(adjForm.other_deductions)}
                onChange={(e) => setAdjustmentAmount('other_deductions', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, color: '#6b7a72', display: 'block', marginBottom: 4 }}>Manual Correction (₹, +/−)</label>
              <input type="number" placeholder="0" value={adjustmentInputValue(adjForm.manual_correction)}
                onChange={(e) => setAdjustmentAmount('manual_correction', e.target.value)} />
              <div style={{ fontSize: 11, color: '#6b7a72', marginTop: 3 }}>Positive = add to salary · Negative = subtract from salary</div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function AdjTags({ row: r }) {
  const tags = [];
  if ((r.overtime || 0) > 0)
    tags.push({ label: `OT +${rupee(r.overtime)}`, bg: '#e8f0f8', color: '#2c6e9b' });
  if ((r.bonus || 0) > 0)
    tags.push({ label: `Bonus +${rupee(r.bonus)}`, bg: '#e6f4ea', color: '#2e7d32' });
  if ((r.food_deduction || 0) > 0)
    tags.push({ label: `Food −${rupee(r.food_deduction)}`, bg: '#fff3e0', color: '#bc6c25' });
  if ((r.other_deductions || 0) > 0)
    tags.push({ label: `Other −${rupee(r.other_deductions)}`, bg: '#f5f5f5', color: '#555' });
  if ((r.manual_correction || 0) > 0)
    tags.push({ label: `Adj +${rupee(r.manual_correction)}`, bg: '#e6f4ea', color: '#2e7d32' });
  if ((r.manual_correction || 0) < 0)
    tags.push({ label: `Adj −${rupee(Math.abs(r.manual_correction))}`, bg: '#fbeae8', color: '#c0392b' });
  if (tags.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
      {tags.map((t, i) => (
        <span key={i} style={{
          fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 10,
          background: t.bg, color: t.color, whiteSpace: 'nowrap',
        }}>{t.label}</span>
      ))}
    </div>
  );
}

function SalaryHistory() {
  const [empId, setEmpId] = useState('');
  const [history, setHistory] = useState(null);

  useEffect(() => {
    if (!empId) { setHistory(null); return; }
    api.get(`/payroll/history/${empId}`).then((r) => setHistory(r.data));
  }, [empId]);

  return (
    <>
      <div className="toolbar">
        <div style={{ minWidth: 300 }}><EmployeeSelect value={empId} onChange={setEmpId} /></div>
      </div>
      {!empId ? (
        <div className="panel"><div className="empty">Select an employee to view their full salary history.</div></div>
      ) : !history ? <Spinner /> : history.length === 0 ? (
        <div className="panel"><div className="empty">No payroll records found for this employee.</div></div>
      ) : (
        <div className="panel">
          <div className="panel-head">
            <h3>Salary History — {history[0]?.employee_name}</h3>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Month</th><th>Base</th><th>Absent</th><th>Absence Ded.</th>
                  <th>Advance</th><th>Penalty</th><th>Net Salary</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.month}</b></td>
                    <td>{rupee(r.base_salary)}</td>
                    <td style={{ color: r.absent_days > 0 ? '#c0392b' : undefined }}>{r.absent_days || 0} days</td>
                    <td style={{ color: '#c0392b' }}>{r.absence_deduction > 0 ? `− ${rupee(r.absence_deduction)}` : '—'}</td>
                    <td style={{ color: '#bc6c25' }}>{r.advance_deduction > 0 ? `− ${rupee(r.advance_deduction)}` : '—'}</td>
                    <td style={{ color: '#c0392b' }}>{r.penalty_deduction > 0 ? `− ${rupee(r.penalty_deduction)}` : '—'}</td>
                    <td><b style={{ color: '#2e7d32' }}>{rupee(r.net_salary)}</b></td>
                    <td><span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLORS[r.status] || '#6b7a72' }}>{STATUS_LABELS[r.status] || r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
