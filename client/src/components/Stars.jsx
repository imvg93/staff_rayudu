import { useState } from 'react';
import { Star } from 'lucide-react';

// Read-only star display. `value` may be fractional (e.g. 4.3).
export function Stars({ value = 0, size = 15, showValue = false, gap = 1 }) {
  const v = Number(value) || 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ display: 'inline-flex', gap }}>
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = v >= i ? 1 : v >= i - 0.5 ? 0.5 : 0;
          return (
            <span key={i} style={{ position: 'relative', display: 'inline-flex', lineHeight: 0 }}>
              <Star size={size} strokeWidth={1.6} color="#E2C46D" fill="none" />
              {fill > 0 && (
                <span style={{ position: 'absolute', top: 0, left: 0, width: `${fill * 100}%`, overflow: 'hidden', lineHeight: 0 }}>
                  <Star size={size} strokeWidth={1.6} color="#E0A106" fill="#F5B301" />
                </span>
              )}
            </span>
          );
        })}
      </span>
      {showValue && <b style={{ fontSize: size, color: '#334155' }}>{v.toFixed(1)}</b>}
    </span>
  );
}

// Interactive star picker.
export function StarInput({ value = 0, onChange, size = 30 }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <span style={{ display: 'inline-flex', gap: 4 }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0,
            transition: 'transform .1s', transform: active >= i ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          <Star size={size} strokeWidth={1.5} color={active >= i ? '#E0A106' : '#CBD5E1'} fill={active >= i ? '#F5B301' : 'none'} />
        </button>
      ))}
    </span>
  );
}

export const RATING_COLORS = { 5: '#16A34A', 4: '#65A30D', 3: '#CA8A04', 2: '#EA580C', 1: '#DC2626' };
