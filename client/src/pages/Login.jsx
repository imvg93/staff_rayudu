import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const DEMO = [
  { role: 'Owner', icon: '👑', email: 'owner@rayudu.com', password: 'owner123', color: '#b08d57' },
  { role: 'Admin', icon: '🛡️', email: 'admin@rayudu.com', password: 'admin123', color: '#3a5a40' },
  { role: 'Supervisor', icon: '🎛️', email: 'supervisor@rayudu.com', password: 'super123', color: '#2c6e9b' },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);

  // close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fill = (d) => { setEmail(d.email); setPassword(d.password); setOpen(false); setErr(null); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await login(email, password);
      nav('/');
    } catch (e) {
      setErr(e.response?.data?.error || 'Login failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="crest">🪖</div>
        <h1>Rayudu Gari Military Hotel</h1>
        <p className="sub">Staff Management & Supervisor Control System</p>
        <form onSubmit={submit}>
          {err && <div className="error-msg">{err}</div>}
          <div className="field">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} autoFocus placeholder="Enter email or use Auto Fill" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password or use Auto Fill" />
          </div>
          <button className="btn" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 16, position: 'relative' }} ref={dropRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              width: '100%', padding: '10px 14px', border: '1.5px dashed #b08d57',
              borderRadius: 10, background: '#fffdf7', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 13.5, fontWeight: 600, color: '#3a5a40',
            }}
          >
            ⚡ Auto Fill Demo Credentials {open ? '▲' : '▼'}
          </button>

          {open && (
            <div style={{
              position: 'absolute', top: '110%', left: 0, right: 0,
              background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12,
              boxShadow: '0 8px 28px rgba(0,0,0,.15)', zIndex: 99, overflow: 'hidden',
            }}>
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  onClick={() => fill(d)}
                  style={{
                    width: '100%', padding: '13px 16px', background: '#fff', border: 'none',
                    borderBottom: '1px solid #f0f4f0', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f6faf6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                >
                  <span style={{ fontSize: 22 }}>{d.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: d.color, fontSize: 13.5 }}>{d.role}</div>
                    <div style={{ fontSize: 12, color: '#6b7a72', marginTop: 2 }}>{d.email} · {d.password}</div>
                  </div>
                  <span style={{ fontSize: 11, color: '#aaa' }}>click to fill →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
