import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { rupee, fmtDate } from '../api.js';
import { Badge, Spinner } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

function monthLabel(month) {
  if (!month) return '---';
  return new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
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

export default function StaffDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isSupervisor = user?.role === 'supervisor';
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/timeline/${id}`)
      .then((r) => setProfile(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (!profile?.employee) return <div className="panel"><div className="empty">Staff member not found.</div></div>;

  const e = profile.employee;
  const salaryHistory = profile.salaryHistory || [];
  const att = profile.attendanceSummary || {};
  const totals = profile.salaryTotals || {};
  const docs = profile.documentSummary || {};
  const advance = profile.advanceSummary || {};

  return (
    <div className="staff-profile-page">
      <div className="page-head">
        <div>
          <h1>{e.name}</h1>
          <p>{e.emp_code} · {e.department} · {e.designation || 'Staff'}</p>
        </div>
        <div className="btn-row">
          <Link className="btn gray" to="/staff">Back to Staff</Link>
          <Link className="btn ghost" to={`/timeline/${e.id}`}>Timeline</Link>
        </div>
      </div>

      <div className="staff-profile-hero panel">
        <div className="staff-profile-id">
          <img
            src={e.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(e.name || 'Staff')}`}
            alt=""
          />
          <div>
            <Badge value={e.status} />
            <h2>{e.name}</h2>
            <p>{e.department} · {e.designation || 'Staff'} · {e.shift || 'Shift not set'}</p>
          </div>
        </div>
        <div className="staff-profile-quick">
          <div><span>Joined</span><b>{fmtDate(e.joining_date)}</b></div>
          <div><span>Joined Month</span><b>{monthLabel(e.joining_date?.slice(0, 7))}</b></div>
          <div><span>Service</span><b>{serviceDuration(e.joining_date)}</b></div>
          <div><span>Current Salary</span><b>{isSupervisor ? '---' : rupee(e.salary)}</b></div>
        </div>
      </div>

      <div className="staff-profile-grid">
        <section className="panel panel-pad">
          <h3 className="staff-profile-title">Personal And Work Details</h3>
          <div className="staff-detail-grid">
            {[
              ['Employee Code', e.emp_code],
              ['Department', e.department],
              ['Designation', e.designation || '---'],
              ['Shift', e.shift || '---'],
              ['Phone', e.phone || '---'],
              ['Emergency Name', e.emergency_name || '---'],
              ['Emergency Phone', e.emergency_phone || '---'],
              ['Date Of Birth', fmtDate(e.dob)],
              ['Monthly Allowed Holidays', e.monthly_allowed_holidays ?? 0],
              ['Status', e.status],
            ].map(([label, value]) => (
              <div key={label} className="staff-detail-kv">
                <span>{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="panel panel-pad">
          <h3 className="staff-profile-title">Attendance Summary</h3>
          <div className="staff-detail-pills">
            {[
              ['Present', att.present || 0, 'present'],
              ['Absent', att.absent || 0, 'absent'],
              ['Half Day', att.half_day || 0, 'half_day'],
              ['Leave', att.leave || 0, 'leave'],
              ['Weekly Off', att.weekly_off || 0, 'gray'],
              ['Holiday', att.holiday || 0, 'leave'],
              ['Late', att.late || 0, 'late'],
            ].map(([label, value, cls]) => (
              <span key={label} className={`badge ${cls}`}>{label}: {value}</span>
            ))}
          </div>
        </section>
      </div>

      {!isSupervisor && (
        <section className="panel panel-pad">
          <h3 className="staff-profile-title">Salary Summary</h3>
          <div className="staff-detail-stats">
            {[
              ['Months Paid', totals.months_paid || 0],
              ['Total Salary Taken', rupee(totals.total_paid)],
              ['Total Deductions', rupee(totals.total_deductions)],
              ['Advance Balance', rupee(advance.balance)],
            ].map(([label, value]) => (
              <div key={label}>
                <b>{value}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!isSupervisor && (
        <section className="panel">
          <div className="panel-head">
            <h3>Month-wise Salary Taken</h3>
          </div>
          {salaryHistory.length === 0 ? (
            <div className="empty">No salary records yet.</div>
          ) : (
            <div className="table-wrap">
              <table className="data staff-salary-mini">
                <thead>
                  <tr>
                    <th>Month</th><th>Base Salary</th><th>Attendance</th><th>Deductions</th><th>Net Taken</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryHistory.map((s) => {
                    const deductions = (s.absence_deduction || 0) + (s.half_day_deduction || 0) + (s.advance_deduction || 0) + (s.penalty_deduction || 0) + (s.food_deduction || 0) + (s.other_deductions || 0);
                    return (
                      <tr key={s.month}>
                        <td><b>{monthLabel(s.month)}</b></td>
                        <td>{rupee(s.base_salary)}</td>
                        <td>P {s.present_days || 0} · A {s.absent_days || 0} · H {s.half_days || 0}</td>
                        <td style={{ color: '#DC2626' }}>{rupee(deductions)}</td>
                        <td><b style={{ color: '#059669' }}>{rupee(s.net_salary)}</b></td>
                        <td><Badge value={s.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="staff-profile-grid">
        <section className="panel panel-pad">
          <h3 className="staff-profile-title">Records</h3>
          <div className="staff-detail-grid">
            <div className="staff-detail-kv"><span>Documents Verified</span><b>{docs.verified || 0}/{docs.total || 0}</b></div>
            <div className="staff-detail-kv"><span>Advance Records</span><b>{advance.advances || 0}</b></div>
            {(profile.leaveSummary || []).map((l) => (
              <div key={l.status} className="staff-detail-kv"><span>{l.status} Leave</span><b>{l.days || 0} day(s)</b></div>
            ))}
          </div>
        </section>

        <section className="panel panel-pad">
          <h3 className="staff-profile-title">Open Related Module</h3>
          <div className="staff-profile-actions">
            <Link className="btn gray" to="/attendance">Attendance</Link>
            <Link className="btn gray" to="/payroll">Payroll</Link>
            <Link className="btn gray" to="/salary-slip">Salary Slip</Link>
            <Link className="btn gray" to="/documents">Documents</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
