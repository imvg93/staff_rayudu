import { useState } from 'react';
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import {
  LayoutDashboard, GaugeCircle, PartyPopper,
  Users, CalendarCheck, Clock, Umbrella, ScrollText,
  Banknote, FileText, BarChart3, Landmark, AlertTriangle,
  FolderOpen, ClipboardList, Shirt, TrendingUp, DoorOpen,
  LogOut, Menu,
} from 'lucide-react';

const NAV = [
  { to: '/', label: 'Dashboard',          Icon: LayoutDashboard, group: 'Overview' },
  { to: '/supervisor', label: 'Supervisor Desk', Icon: GaugeCircle,   group: 'Overview', roles: ['supervisor','admin','owner'] },
  { to: '/celebrations', label: 'Celebrations', Icon: PartyPopper,   group: 'Overview' },

  { to: '/staff',      label: 'Staff Master',      Icon: Users,         group: 'Workforce' },
  { to: '/attendance', label: 'Attendance',         Icon: CalendarCheck, group: 'Workforce' },
  { to: '/shifts',     label: 'Shifts',             Icon: Clock,         group: 'Workforce' },
  { to: '/leaves',     label: 'Leave',              Icon: Umbrella,      group: 'Workforce' },
  { to: '/timeline',   label: 'Employee Timeline',  Icon: ScrollText,    group: 'Workforce' },

  { to: '/payroll',       label: 'Payroll',           Icon: Banknote,      group: 'Finance', roles: ['supervisor','admin','owner'] },
  { to: '/salary-slip',   label: 'Salary Slip',       Icon: FileText,      group: 'Finance', roles: ['supervisor','admin','owner'] },
  { to: '/salary-report', label: 'Salary Report',     Icon: BarChart3,     group: 'Finance', roles: ['supervisor','admin','owner'] },
  { to: '/advances',      label: 'Advances & Loans',  Icon: Landmark,      group: 'Finance', roles: ['supervisor','admin','owner'] },
  { to: '/penalties',     label: 'Penalties & Fines', Icon: AlertTriangle,  group: 'Finance' },

  { to: '/documents',   label: 'Documents',         Icon: FolderOpen,    group: 'Records' },
  { to: '/performance', label: 'Performance Notes', Icon: ClipboardList, group: 'Records' },
  { to: '/assets',      label: 'Uniforms & Assets', Icon: Shirt,         group: 'Records' },
  { to: '/promotions',  label: 'Promotions',        Icon: TrendingUp,    group: 'Records' },
  { to: '/exits',       label: 'Exit & Settlement', Icon: DoorOpen,      group: 'Records', roles: ['supervisor','admin','owner'] },
];

const TITLES = {
  ...Object.fromEntries(NAV.map((n) => [n.to, n.label])),
  '/salary-slip': 'Salary Slip',
  '/salary-report': 'Salary Report',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  if (!user) return <Navigate to="/login" replace />;

  const visible = NAV.filter((n) => !n.roles || n.roles.includes(user.role));
  const groups = [...new Set(visible.map((n) => n.group))];
  const title = TITLES[loc.pathname] || (loc.pathname.startsWith('/timeline') ? 'Employee Timeline' : 'Staff Management');
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="layout">
      <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>
        <div className="brand">
          <span className="crest">🪖</span>
          {!collapsed && (
            <div>
              <b>Rayudu Gari</b>
              <span>Military Hotel</span>
            </div>
          )}
        </div>

        <nav className="nav">
          {groups.map((g) => (
            <div key={g}>
              {!collapsed && <div className="group">{g}</div>}
              {visible.filter((n) => n.group === g).map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} end={to === '/'} title={collapsed ? label : ''} className="nav-link">
                  <span className="nav-icon"><Icon size={15} strokeWidth={1.8} /></span>
                  {!collapsed && <span className="nav-label">{label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {!collapsed ? (
          <div className="sidebar-user">
            <div className="sidebar-user-info">
              <div className="sidebar-user-avatar">{initials}</div>
              <div>
                <span className="sidebar-user-name">{user.name}</span>
                <span className="sidebar-user-role">{user.role}</span>
              </div>
            </div>
            <button className="sidebar-logout" onClick={logout} title="Logout">
              <LogOut size={13} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--sb-border)' }}>
            <button className="sidebar-logout" onClick={logout} title="Logout">
              <LogOut size={13} strokeWidth={2} />
            </button>
          </div>
        )}
      </aside>

      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="sidebar-toggle" onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <Menu size={16} strokeWidth={1.8} color="var(--muted)" />
            </button>
            <h2>{title}</h2>
          </div>
          <div className="right">
            <a
              className="company-credit"
              href="https://webresfolio.com"
              target="_blank"
              rel="noreferrer"
            >
              by Webresfolio
            </a>
            <span className="role-chip">{user.role}</span>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
