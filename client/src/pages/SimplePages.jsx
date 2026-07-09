import { useState } from 'react';
import ResourcePage from '../components/ResourcePage.jsx';
import { Badge, EmployeeSelect, Spinner } from '../components/ui.jsx';
import api, { rupee, fmtDate, today } from '../api.js';

const DEPTS = ['Kitchen', 'Dining Service', 'Counter', 'Parcel', 'Cleaning'];

export function Shifts() {
  return (
    <ResourcePage
      title="Shift Management" subtitle="Plan morning/evening shifts department-wise"
      endpoint="/shifts"
      columns={[
        { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
        { key: 'shift_type', label: 'Shift', render: (r) => <Badge value={r.shift_type} /> },
        { key: 'department', label: 'Department' },
      ]}
      fields={[
        { name: 'employee_id', label: 'Employee', type: 'employee' },
        { name: 'date', label: 'Date', type: 'date', default: today() },
        { name: 'shift_type', label: 'Shift', type: 'select', options: ['morning', 'evening'] },
        { name: 'department', label: 'Department', type: 'select', options: DEPTS },
      ]}
    />
  );
}

export function Advances() {
  return (
    <ResourcePage
      title="Advance & Loan Tracking" subtitle="Salary advances with monthly deduction & live balance"
      endpoint="/advances"
      columns={[
        { key: 'amount', label: 'Advance', render: (r) => rupee(r.amount) },
        { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
        { key: 'monthly_deduction', label: 'Monthly', render: (r) => rupee(r.monthly_deduction) },
        { key: 'balance', label: 'Balance', render: (r) => <b style={{ color: r.balance > 0 ? '#c0392b' : '#2e7d32' }}>{rupee(r.balance)}</b> },
        { key: 'reason', label: 'Reason' },
      ]}
      fields={[
        { name: 'employee_id', label: 'Employee', type: 'employee' },
        { name: 'amount', label: 'Advance Amount (₹)', type: 'number' },
        { name: 'date', label: 'Date', type: 'date', default: today() },
        { name: 'monthly_deduction', label: 'Monthly Deduction (₹)', type: 'number' },
        { name: 'balance', label: 'Outstanding Balance (₹)', type: 'number' },
        { name: 'reason', label: 'Reason', type: 'text', full: true },
      ]}
    />
  );
}

export function Penalties() {
  return (
    <ResourcePage
      title="Penalty & Fine Management" subtitle="Late arrival, damage & policy fines (reflected in payroll)"
      endpoint="/penalties"
      columns={[
        { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
        { key: 'type', label: 'Type' },
        { key: 'amount', label: 'Fine', render: (r) => <b style={{ color: '#c0392b' }}>{rupee(r.amount)}</b> },
        { key: 'reason', label: 'Reason' },
      ]}
      fields={[
        { name: 'employee_id', label: 'Employee', type: 'employee' },
        { name: 'date', label: 'Date', type: 'date', default: today() },
        { name: 'type', label: 'Type', type: 'select', options: ['Late Arrival', 'Equipment Damage', 'Policy Violation', 'Other'] },
        { name: 'amount', label: 'Fine Amount (₹)', type: 'number' },
        { name: 'reason', label: 'Reason', type: 'textarea', full: true },
      ]}
    />
  );
}

export function Documents() {
  return (
    <ResourcePage
      title="Staff Document Management" subtitle="Aadhaar, PAN, bank & verification records"
      endpoint="/documents"
      columns={[
        { key: 'doc_type', label: 'Document', render: (r) => <Badge value={r.doc_type} label={r.doc_type?.toUpperCase()} /> },
        { key: 'number', label: 'Number' },
        { key: 'verified', label: 'Verified', render: (r) => r.verified ? <Badge value="approved" label="Verified" /> : <Badge value="pending" label="Pending" /> },
      ]}
      fields={[
        { name: 'employee_id', label: 'Employee', type: 'employee' },
        { name: 'doc_type', label: 'Document Type', type: 'select', options: ['aadhaar', 'pan', 'bank', 'photo', 'other'] },
        { name: 'number', label: 'Number / Reference', type: 'text' },
        { name: 'verified', label: 'Verified', type: 'checkbox' },
      ]}
    />
  );
}

export function Performance() {
  return (
    <ResourcePage
      title="Staff Performance Notes" subtitle="Appreciation, warnings & improvement notes"
      endpoint="/performance"
      columns={[
        { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
        { key: 'type', label: 'Type', render: (r) => <Badge value={r.type} /> },
        { key: 'remark', label: 'Remark' },
        { key: 'created_by', label: 'By' },
      ]}
      fields={[
        { name: 'employee_id', label: 'Employee', type: 'employee' },
        { name: 'date', label: 'Date', type: 'date', default: today() },
        { name: 'type', label: 'Type', type: 'select', options: ['appreciation', 'warning', 'note'] },
        { name: 'remark', label: 'Remark', type: 'textarea', full: true },
        { name: 'created_by', label: 'Recorded By', type: 'text', default: 'Supervisor' },
      ]}
    />
  );
}

export function Assets() {
  return (
    <ResourcePage
      title="Uniform & Asset Tracking" subtitle="Issued uniforms, aprons, caps & devices"
      endpoint="/assets"
      columns={[
        { key: 'asset_type', label: 'Asset', render: (r) => <Badge value="gray" label={r.asset_type} /> },
        { key: 'quantity', label: 'Qty' },
        { key: 'issued_date', label: 'Issued', render: (r) => fmtDate(r.issued_date) },
        { key: 'returned', label: 'Status', render: (r) => r.returned ? <Badge value="exited" label={'Returned ' + fmtDate(r.return_date)} /> : <Badge value="active" label="With employee" /> },
      ]}
      fields={[
        { name: 'employee_id', label: 'Employee', type: 'employee' },
        { name: 'asset_type', label: 'Asset Type', type: 'select', options: ['uniform', 'apron', 'cap', 'device', 'other'] },
        { name: 'quantity', label: 'Quantity', type: 'number', default: 1 },
        { name: 'issued_date', label: 'Issued Date', type: 'date', default: today() },
        { name: 'returned', label: 'Returned?', type: 'checkbox' },
        { name: 'return_date', label: 'Return Date', type: 'date' },
      ]}
    />
  );
}

export function Promotions() {
  return (
    <ResourcePage
      title="Promotion Records" subtitle="Track designations, salary revisions & career progression"
      endpoint="/promotions"
      columns={[
        { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
        { key: 'from_designation', label: 'From' },
        { key: 'to_designation', label: 'To', render: (r) => <b style={{ color: '#3a5a40' }}>{r.to_designation}</b> },
        { key: 'salary_before', label: 'Old Salary', render: (r) => rupee(r.salary_before) },
        { key: 'salary_after', label: 'New Salary', render: (r) => <b style={{ color: '#2e7d32' }}>{rupee(r.salary_after)}</b> },
        { key: 'remarks', label: 'Remarks' },
      ]}
      fields={[
        { name: 'employee_id', label: 'Employee', type: 'employee' },
        { name: 'date', label: 'Promotion Date', type: 'date', default: today() },
        { name: 'from_designation', label: 'From Designation', type: 'text' },
        { name: 'to_designation', label: 'To Designation', type: 'text' },
        { name: 'salary_before', label: 'Previous Salary (₹)', type: 'number' },
        { name: 'salary_after', label: 'New Salary (₹)', type: 'number' },
        { name: 'remarks', label: 'Remarks', type: 'textarea', full: true },
      ]}
    />
  );
}

function SettlementCalculator() {
  const [empId, setEmpId] = useState('');
  const [lastDay, setLastDay] = useState(today());
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const calculate = async () => {
    if (!empId) { setErr('Select the leaving employee first.'); return; }
    setLoading(true); setErr(null); setResult(null);
    try {
      const { data } = await api.get('/analytics/settlement', {
        params: { employee_id: empId, asOf: lastDay },
      });
      setResult(data);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally { setLoading(false); }
  };

  const line = (label, value, tone) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', fontSize: 13 }}>
      <span style={{ color: '#64748B' }}>{label}</span>
      <span style={{ fontWeight: 600, color: tone || '#0F172A', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );

  return (
    <div className="panel" style={{ padding: 18, marginBottom: 18 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>Final Settlement Calculator</div>
      <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 14 }}>
        Employee leaving mid-month? Pick their last working day to see exactly how much to pay.
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 220px', minWidth: 200 }}>
          <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: 600 }}>Leaving Employee</div>
          <EmployeeSelect value={empId} onChange={setEmpId} />
        </div>
        <div style={{ flex: '0 0 160px' }}>
          <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: 600 }}>Last Working Day</div>
          <input type="date" value={lastDay} max={today()} onChange={(e) => setLastDay(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', fontFamily: 'inherit', fontSize: 13 }} />
        </div>
        <button className="btn" onClick={calculate} disabled={loading} style={{ flex: '0 0 auto' }}>
          {loading ? 'Calculating…' : 'Calculate'}
        </button>
      </div>

      {err && <div className="error-msg" style={{ marginTop: 12 }}>{err}</div>}

      {loading && <div style={{ marginTop: 16 }}><Spinner /></div>}

      {result && !loading && (
        <div style={{ marginTop: 16, borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
            {result.employee.name} · {result.employee.emp_code}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
            {result.employee.department} · Monthly {rupee(result.employee.salary)} · Per-day {rupee(result.perDay)}
            {' '}· Paid for {result.paidDayEquivalent} of {result.daysElapsed} days worked till {fmtDate(result.asOf)}
          </div>

          {/* Attendance summary chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {[
              ['Present', result.counts.present, '#16A34A', '#F0FDF4'],
              ['Half-day', result.counts.half_day, '#D97706', '#FFFBEB'],
              ['Week-off', result.counts.weekly_off, '#2563EB', '#EFF6FF'],
              ['Paid leave', result.counts.paid_leave, '#0891B2', '#ECFEFF'],
              ['Absent', result.counts.absent, '#DC2626', '#FEF2F2'],
              ['Unpaid leave', result.counts.unpaid_leave, '#DC2626', '#FEF2F2'],
            ].filter(([, v]) => v > 0).map(([label, v, c, bg]) => (
              <span key={label} style={{ fontSize: 11, fontWeight: 600, color: c, background: bg, padding: '3px 9px', borderRadius: 20 }}>
                {v} {label}
              </span>
            ))}
          </div>

          {line('Earned salary (paid days × per-day)', rupee(result.earnedSalary), '#16A34A')}
          {result.penalties > 0 && line('Penalties this month', '− ' + rupee(result.penalties), '#DC2626')}
          {result.advanceOutstanding > 0 && line('Outstanding advance (full recovery)', '− ' + rupee(result.advanceOutstanding), '#DC2626')}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 12, borderTop: '2px solid #0F172A' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Amount to pay</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: result.netSettlement >= 0 ? '#16A34A' : '#DC2626', fontVariantNumeric: 'tabular-nums' }}>
              {rupee(result.netSettlement)}
            </span>
          </div>
          {result.netSettlement < 0 && (
            <div style={{ fontSize: 11.5, color: '#DC2626', marginTop: 6 }}>
              Negative — the employee still owes {rupee(Math.abs(result.netSettlement))} in advances after their earned pay.
            </div>
          )}
          {result.unmarkedDays > 0 && (
            <div style={{ fontSize: 11.5, color: '#D97706', marginTop: 6 }}>
              Note: {result.unmarkedDays} day(s) in this period have no attendance marked — they are not counted as paid. Mark them if the employee worked.
            </div>
          )}
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>
            Copy this amount into the “Settlement Amount” field when you add the exit record below.
          </div>
        </div>
      )}
    </div>
  );
}

export function Exits() {
  return (
    <>
    <SettlementCalculator />
    <ResourcePage
      title="Exit & Settlement Management" subtitle="Resignations, notice period & final settlement"
      endpoint="/exits"
      columns={[
        { key: 'resignation_date', label: 'Resigned', render: (r) => fmtDate(r.resignation_date) },
        { key: 'last_working_day', label: 'Last Day', render: (r) => fmtDate(r.last_working_day) },
        { key: 'notice_days', label: 'Notice (days)' },
        { key: 'settlement_amount', label: 'Settlement', render: (r) => rupee(r.settlement_amount) },
        { key: 'status', label: 'Status', render: (r) => <Badge value={r.status} /> },
        { key: 'reason', label: 'Reason' },
      ]}
      fields={[
        { name: 'employee_id', label: 'Employee', type: 'employee' },
        { name: 'resignation_date', label: 'Resignation Date', type: 'date', default: today() },
        { name: 'last_working_day', label: 'Last Working Day', type: 'date' },
        { name: 'notice_days', label: 'Notice Period (days)', type: 'number' },
        { name: 'settlement_amount', label: 'Settlement Amount (₹)', type: 'number' },
        { name: 'status', label: 'Status', type: 'select', options: ['pending', 'settled'] },
        { name: 'reason', label: 'Exit Reason', type: 'textarea', full: true },
      ]}
    />
    </>
  );
}
