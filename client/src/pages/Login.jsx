import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { Eye, EyeOff } from 'lucide-react';

const DEMO = [
  { role: 'Owner',      email: 'owner@rayudu.com',      password: 'owner123', color: '#92712A', bg: '#FEF9C3' },
  { role: 'Admin',      email: 'admin@rayudu.com',      password: 'admin123', color: '#1B4332', bg: '#DCFCE7' },
  { role: 'Supervisor', email: 'supervisor@rayudu.com', password: 'super123', color: '#2563EB', bg: '#DBEAFE' },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const fill = (d) => { setEmail(d.email); setPassword(d.password); setErr(null); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await login(email, password);
      nav('/');
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Login failed. Check your credentials.');
    } finally { setBusy(false); }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 38, lineHeight: 1, marginBottom: 10 }}>🪖</div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#0F172A', letterSpacing: '-.2px' }}>
            Rayudu Gari Military Hotel
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B' }}>
            Staff Management System
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} autoComplete="on">
          {err && <div className="error-msg" style={{ marginBottom: 14 }}>{err}</div>}

          <div className="field">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              placeholder="you@rayudu.com"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <div className="password-field">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn"
            style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', marginTop: 4 }}
            disabled={busy}
          >
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Demo credentials */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginBottom: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase' }}>
            Demo Accounts — click to fill
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => fill(d)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  background: '#F8FAFC',
                  cursor: 'pointer', fontFamily: 'var(--font)',
                  textAlign: 'left', width: '100%',
                  transition: 'background .12s, border-color .12s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = d.bg; e.currentTarget.style.borderColor = d.color + '40'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 7, background: d.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14 }}>
                    {d.role === 'Owner' ? '👑' : d.role === 'Admin' ? '🛡️' : '🎛️'}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: d.color }}>{d.role}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{d.email}</div>
                </div>
                <span style={{ fontSize: 11, color: '#CBD5E1', flexShrink: 0 }}>fill →</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
