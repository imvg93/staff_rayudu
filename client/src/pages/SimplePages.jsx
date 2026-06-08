import ResourcePage from '../components/ResourcePage.jsx';
import { Badge } from '../components/ui.jsx';
import { rupee, fmtDate, today } from '../api.js';

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

export function Exits() {
  return (
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
  );
}
