import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useApi, Spinner, Badge, EmployeeCell } from '../components/ui.jsx';
import { CalendarCheck, Clock, Umbrella, ClipboardList, Users, UserCheck, UserX, Timer } from 'lucide-react';

const QUICK = [
  { icon: <CalendarCheck size={18} strokeWidth={1.7} />, label: 'Mark Attendance', to: '/attendance' },
  { icon: <Clock size={18} strokeWidth={1.7} />, label: 'Assign Shift', to: '/shifts' },
  { icon: <Umbrella size={18} strokeWidth={1.7} />, label: 'Approve Leave', to: '/leaves' },
  { icon: <ClipboardList size={18} strokeWidth={1.7} />, label: 'Performance Note', to: '/performance' },
  { icon: <Users size={18} strokeWidth={1.7} />, label: 'Staff Records', to: '/staff' },
];

export default function Supervisor() {
  const nav = useNavigate();
  const dash = useApi('/analytics/dashboard');
  const leaves = useApi('/leaves?status=pending');

  const approve = async (id, status) => { await api.put(`/leaves/${id}/status`, { status }); leaves.reload(); };

  return (
    <div>
      <div className="page-head">
        <div><h1>Supervisor Desk</h1><p>Command center for daily workforce operations</p></div>
      </div>

      <div className="quick-actions" style={{ marginBottom: 18 }}>
        {QUICK.map((q) => (
          <div className="qa" key={q.label} onClick={() => nav(q.to)}>
            <div className="ic">{q.icon}</div>
            <div className="l">{q.label}</div>
          </div>
        ))}
      </div>

      {dash.data && (
        <div className="grid stats" style={{ marginBottom: 18 }}>
          <div className="stat-card"><div className="ic"><Users size={16} strokeWidth={1.8} /></div><div><div className="v">{dash.data.totalEmployees}</div><div className="l">On Roll</div></div></div>
          <div className="stat-card"><div className="ic"><UserCheck size={16} strokeWidth={1.8} /></div><div><div className="v">{dash.data.present}</div><div className="l">Present Today</div></div></div>
          <div className="stat-card"><div className="ic"><UserX size={16} strokeWidth={1.8} /></div><div><div className="v">{dash.data.absent}</div><div className="l">Absent Today</div></div></div>
          <div className="stat-card"><div className="ic"><Timer size={16} strokeWidth={1.8} /></div><div><div className="v">{dash.data.pendingLeaves}</div><div className="l">Leaves to Approve</div></div></div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head"><h3>Pending Leave Approvals</h3></div>
        {leaves.loading ? <Spinner /> : (leaves.data || []).length === 0 ? (
          <div className="empty">No pending leave requests 🎉</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Employee</th><th>From</th><th>To</th><th>Type</th><th>Reason</th><th></th></tr></thead>
              <tbody>
                {leaves.data.map((l) => (
                  <tr key={l.id}>
                    <td><EmployeeCell row={l} /></td>
                    <td>{l.from_date}</td>
                    <td>{l.to_date}</td>
                    <td><Badge value="gray" label={l.type} /></td>
                    <td>{l.reason}</td>
                    <td>
                      <div className="btn-row">
                        <button className="btn sm" onClick={() => approve(l.id, 'approved')}>Approve</button>
                        <button className="btn sm danger" onClick={() => approve(l.id, 'rejected')}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

