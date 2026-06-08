import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../api.js';

// data fetching hook
export function useApi(url, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reload = useCallback(() => {
    setLoading(true);
    api.get(url)
      .then((r) => { setData(r.data); setError(null); })
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [url, ...deps]);
  return { data, loading, error, reload, setData };
}

export function StatCard({ icon, value, label, color }) {
  return (
    <div className="stat-card">
      <div className="ic" style={color ? { background: color + '22', color } : null}>{icon}</div>
      <div>
        <div className="v">{value}</div>
        <div className="l">{label}</div>
      </div>
    </div>
  );
}

export function Badge({ value, label }) {
  const cls = String(value || '').toLowerCase().replace(/\s+/g, '_');
  return <span className={`badge ${cls}`}>{label || value || '—'}</span>;
}

export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function EmployeeCell({ row }) {
  const name = row.employee_name || row.name;
  const code = row.emp_code;
  const photo = row.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || '')}`;
  return (
    <div className="emp-cell">
      <img className="avatar" src={photo} alt="" />
      <div><b>{name}</b><small>{code}{row.department ? ' · ' + row.department : ''}</small></div>
    </div>
  );
}

export function Spinner({ text = 'Loading…' }) {
  return <div className="loading">{text}</div>;
}

export function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

// searchable employee picker
export function EmployeeSelect({ value, onChange, allowAll = false, placeholder }) {
  const { data } = useApi('/employees?status=active');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const employees = data || [];
  const selected = employees.find((e) => String(e.id) === String(value));
  const filtered = q.trim()
    ? employees.filter((e) =>
        e.name.toLowerCase().includes(q.toLowerCase()) ||
        e.emp_code.toLowerCase().includes(q.toLowerCase()) ||
        e.department.toLowerCase().includes(q.toLowerCase())
      )
    : employees;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (id) => { onChange(id); setQ(''); setOpen(false); };

  const displayText = value
    ? (selected ? `${selected.emp_code} · ${selected.name}` : '…')
    : (allowAll ? (placeholder || 'All Employees') : '— Select employee —');

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          border: '1px solid var(--line, #d8dfd9)', borderRadius: 6, padding: '7px 10px',
          cursor: 'pointer', background: '#fff', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', fontSize: 13, userSelect: 'none',
          color: value ? '#1a1a1a' : '#999',
        }}
      >
        <span>{displayText}</span>
        <span style={{ fontSize: 10, color: '#999', marginLeft: 6 }}>▾</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#fff', border: '1px solid var(--line, #d8dfd9)', borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', marginTop: 2,
        }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #eee' }}>
            <input
              autoFocus
              placeholder="Search name, code or dept…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: 12.5, background: 'transparent' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {allowAll && (
              <div
                onClick={() => select('')}
                style={{
                  padding: '7px 12px', cursor: 'pointer', fontSize: 12.5,
                  background: !value ? '#f0faf1' : 'transparent',
                  color: !value ? '#2e7d32' : '#555',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f7f5'}
                onMouseLeave={(e) => e.currentTarget.style.background = !value ? '#f0faf1' : 'transparent'}
              >
                {placeholder || 'All Employees'}
              </div>
            )}
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', color: '#999', fontSize: 12 }}>No match found</div>
            )}
            {filtered.map((e) => (
              <div
                key={e.id}
                onClick={() => select(String(e.id))}
                style={{
                  padding: '7px 12px', cursor: 'pointer', fontSize: 12.5,
                  background: String(e.id) === String(value) ? '#f0faf1' : 'transparent',
                }}
                onMouseEnter={(ev) => ev.currentTarget.style.background = '#f5f7f5'}
                onMouseLeave={(ev) => ev.currentTarget.style.background = String(e.id) === String(value) ? '#f0faf1' : 'transparent'}
              >
                <span style={{ fontWeight: 600 }}>{e.name}</span>
                <span style={{ color: '#6b7a72', marginLeft: 6, fontSize: 11.5 }}>{e.emp_code} · {e.department}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
