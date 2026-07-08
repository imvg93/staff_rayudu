import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api.js';
import { Stars, StarInput } from '../components/Stars.jsx';
import { CheckCircle2, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';

export default function PublicReview() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const [overall, setOverall] = useState(0);
  const [subs, setSubs] = useState({});
  const [comment, setComment] = useState('');
  const [recommend, setRecommend] = useState(null);
  const [cust, setCust] = useState({ customer_name: '', customer_mobile: '', customer_email: '' });

  useEffect(() => {
    api.get(`/public/employee/${token}`)
      .then((r) => setInfo(r.data))
      .catch(() => setNotFound(true));
  }, [token]);

  const setSub = (key, v) => setSubs((s) => ({ ...s, [key]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!overall) { setErr('Please select an overall star rating.'); return; }
    setBusy(true);
    try {
      await api.post('/public/review', {
        token, overall_rating: overall, ...subs, comment,
        recommend: recommend === null ? true : recommend, ...cust,
      });
      setDone(true);
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Could not submit. Please try again.');
    } finally { setBusy(false); }
  };

  if (notFound) {
    return (
      <div className="pubrev-wrap">
        <div className="pubrev-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🔗</div>
          <h2 style={{ margin: '10px 0 4px' }}>Invalid Review Link</h2>
          <p style={{ color: '#64748B', fontSize: 14 }}>This QR code is not valid or the employee is no longer active.</p>
        </div>
      </div>
    );
  }

  if (!info) {
    return <div className="pubrev-wrap"><div className="pubrev-card" style={{ textAlign: 'center' }}><Loader2 className="spin" size={26} /></div></div>;
  }

  if (done) {
    return (
      <div className="pubrev-wrap">
        <div className="pubrev-card" style={{ textAlign: 'center' }}>
          <CheckCircle2 size={54} color="#16A34A" strokeWidth={1.6} />
          <h2 style={{ margin: '14px 0 6px' }}>Thank you!</h2>
          <p style={{ color: '#475569', fontSize: 14.5 }}>
            Your feedback for <b>{info.employee.name}</b> has been recorded.
          </p>
          <div style={{ margintop: 12 }}><Stars value={overall} size={22} /></div>
          <p style={{ color: '#94A3B8', fontSize: 12.5, marginTop: 18 }}>🪖 Rayudu Gari Military Hotel</p>
        </div>
      </div>
    );
  }

  const e = info.employee;
  return (
    <div className="pubrev-wrap">
      <form className="pubrev-card" onSubmit={submit}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 22 }}>🪖</div>
          <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, letterSpacing: '.4px' }}>RAYUDU GARI MILITARY HOTEL</div>
        </div>

        <div className="pubrev-emp">
          <img src={e.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(e.name)}`} alt="" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{e.name}</div>
            <div style={{ color: '#64748B', fontSize: 13 }}>{e.designation} · {e.department}</div>
            <div style={{ color: '#94A3B8', fontSize: 12 }}>{e.branch} · {e.emp_code}</div>
            {info.totalReviews > 0 && (
              <div style={{ marginTop: 4 }}><Stars value={info.avgRating} size={13} showValue /> <span style={{ fontSize: 11.5, color: '#94A3B8' }}>({info.totalReviews})</span></div>
            )}
          </div>
        </div>

        <div className="pubrev-section" style={{ textAlign: 'center' }}>
          <label className="pubrev-label">How was your experience?</label>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
            <StarInput value={overall} onChange={setOverall} size={38} />
          </div>
          {overall > 0 && (
            <div style={{ fontSize: 13, color: '#475569', marginTop: 6, fontWeight: 600 }}>
              {['Very Poor', 'Poor', 'Average', 'Good', 'Excellent'][overall - 1]}
            </div>
          )}
        </div>

        <div className="pubrev-section">
          <label className="pubrev-label">Rate the service</label>
          <div className="pubrev-subgrid">
            {info.dimensions.map((d) => (
              <div key={d.key} className="pubrev-subrow">
                <span>{d.label}</span>
                <StarInput value={subs[d.key] || 0} onChange={(v) => setSub(d.key, v)} size={20} />
              </div>
            ))}
          </div>
        </div>

        <div className="pubrev-section">
          <label className="pubrev-label">Share your experience (optional)</label>
          <textarea
            className="pubrev-textarea" rows={3} value={comment}
            onChange={(ev) => setComment(ev.target.value)}
            placeholder="Tell us what went well or what could be better…"
          />
        </div>

        <div className="pubrev-section">
          <label className="pubrev-label">Would you recommend this employee?</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="button" className={`pubrev-choice${recommend === true ? ' yes' : ''}`} onClick={() => setRecommend(true)}>
              <ThumbsUp size={16} /> Yes
            </button>
            <button type="button" className={`pubrev-choice${recommend === false ? ' no' : ''}`} onClick={() => setRecommend(false)}>
              <ThumbsDown size={16} /> No
            </button>
          </div>
        </div>

        <div className="pubrev-section">
          <label className="pubrev-label">Your details (optional)</label>
          <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
            <input className="pubrev-input" placeholder="Name" value={cust.customer_name} onChange={(ev) => setCust({ ...cust, customer_name: ev.target.value })} />
            <input className="pubrev-input" placeholder="Mobile number" value={cust.customer_mobile} onChange={(ev) => setCust({ ...cust, customer_mobile: ev.target.value })} />
            <input className="pubrev-input" placeholder="Email address" value={cust.customer_email} onChange={(ev) => setCust({ ...cust, customer_email: ev.target.value })} />
          </div>
        </div>

        {err && <div className="pubrev-err">{err}</div>}

        <button type="submit" className="pubrev-submit" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit Feedback'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#B6C0CC', marginTop: 10 }}>
          Your details are optional and kept confidential.
        </p>
      </form>
    </div>
  );
}
