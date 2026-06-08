import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

// nav item: { to, label, icon, group, roles? }  roles omitted = all
const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊', group: 'Overview' },
  { to: '/supervisor', label: 'Supervisor Desk', icon: '🎛️', group: 'Overview', roles: ['supervisor', 'admin', 'owner'] },
  { to: '/celebrations', label: 'Celebrations', icon: '🎉', group: 'Overview' },

  { to: '/staff', label: 'Staff Master', icon: '👥', group: 'Workforce' },
  { to: '/attendance', label: 'Attendance', icon: '✅', group: 'Workforce' },
  { to: '/shifts', label: 'Shifts', icon: '🕑', group: 'Workforce' },
  { to: '/leaves', label: 'Leave', icon: '🌴', group: 'Workforce' },
  { to: '/timeline', label: 'Employee Timeline', icon: '📜', group: 'Workforce' },

  { to: '/payroll', label: 'Payroll', icon: '💰', group: 'Finance', roles: ['admin', 'owner'] },
  { to: '/salary-slip', label: 'Salary Slip', icon: '📄', group: 'Finance', roles: ['admin', 'owner'] },
  { to: '/salary-report', label: 'Salary Report', icon: '📊', group: 'Finance', roles: ['admin', 'owner'] },
  { to: '/advances', label: 'Advances & Loans', icon: '🏦', group: 'Finance', roles: ['admin', 'owner'] },
  { to: '/penalties', label: 'Penalties & Fines', icon: '⚠️', group: 'Finance' },
  { to: '/expenses', label: 'Daily Expenses', icon: '🧾', group: 'Finance' },

  { to: '/documents', label: 'Documents', icon: '📁', group: 'Records' },
  { to: '/performance', label: 'Performance Notes', icon: '📝', group: 'Records' },
  { to: '/assets', label: 'Uniforms & Assets', icon: '👕', group: 'Records' },
  { to: '/promotions', label: 'Promotions', icon: '🏅', group: 'Records' },
  { to: '/exits', label: 'Exit & Settlement', icon: '🚪', group: 'Records', roles: ['admin', 'owner'] },
];

const TITLES = { ...Object.fromEntries(NAV.map((n) => [n.to, n.label])), '/salary-slip': 'Salary Slip', '/salary-report': 'Salary Report' };

export default function Layout() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace />;

  const visible = NAV.filter((n) => !n.roles || n.roles.includes(user.role));
  const groups = [...new Set(visible.map((n) => n.group))];
  const title = TITLES[loc.pathname] || (loc.pathname.startsWith('/timeline') ? 'Employee Timeline' : 'Staff Management');

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="crest">🪖</span>
          <div><b>Rayudu Gari</b><span>Military Hotel</span></div>
        </div>
        <nav className="nav">
          {groups.map((g) => (
            <div key={g}>
              <div className="group">{g}</div>
              {visible.filter((n) => n.group === g).map((n) => (
                <NavLink key={n.to} to={n.to} end={n.to === '/'}>
                  <span className="ic">{n.icon}</span>{n.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <h2>{title}</h2>
          <div className="right">
            <span className="role-chip">{user.role}</span>
            <div className="user-mini"><b>{user.name}</b><span>{user.email}</span></div>
            <button className="btn ghost sm" onClick={logout}>Logout</button>
          </div>
        </header>
        <div className="content"><Outlet /></div>
      </div>
    </div>
  );
}
