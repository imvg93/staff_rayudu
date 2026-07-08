import { useEffect, useState } from 'react';
import api from '../api.js';
import { useApi, Spinner } from '../components/ui.jsx';
import { Stars } from '../components/Stars.jsx';
import { Trophy, Award, Star, Medal, Crown } from 'lucide-react';

const PERIODS = [
  ['today', 'Today'], ['weekly', 'Weekly'], ['monthly', 'Monthly'],
  ['quarterly', 'Quarterly'], ['yearly', 'Yearly'], ['all', 'All Time'],
];
const BONUS_BG = { Gold: '#FEF3C7', Silver: '#F1F5F9', Bronze: '#FEECD8' };
const RANK_COLOR = { 1: '#B7791F', 2: '#64748B', 3: '#B45309' };

export default function Leaderboard() {
  const [period, setPeriod] = useState('monthly');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/reviews/leaderboard?period=${period}`).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [period]);

  const { data: bonus } = useApi('/reviews/bonus');

  return (
    <div>
      <div className="page-head">
        <div><h1>Performance Leaderboard</h1><p>Best-performing employees by customer ratings & recommendations</p></div>
        <div className="btn-row">
          {PERIODS.map(([k, label]) => (
            <button key={k} className={`btn sm ${period === k ? '' : 'gray'}`} onClick={() => setPeriod(k)}>{label}</button>
          ))}
        </div>
      </div>

      {loading || !data ? <Spinner /> : (
        <>
          {data.rows.length === 0 ? (
            <div className="panel"><div className="empty">No reviews in this period yet.</div></div>
          ) : (
            <>
              <Podium rows={data.rows.slice(0, 3)} eotm={data.employeeOfMonth} />

              <div className="panel" style={{ marginTop: 18 }}>
                <div className="table-wrap">
                  <table className="data" style={{ fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 44 }}>Rank</th>
                        <th>Employee</th>
                        <th>Branch</th>
                        <th>Avg Rating</th>
                        <th>Reviews</th>
                        <th>Recommend</th>
                        <th>Score</th>
                        <th>Bonus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((r) => (
                        <tr key={r.id}>
                          <td><span className="rank-badge" style={{ background: RANK_COLOR[r.rank] ? RANK_COLOR[r.rank] + '22' : '#F1F5F9', color: RANK_COLOR[r.rank] || '#64748B' }}>{r.rank}</span></td>
                          <td>
                            <div className="emp-cell">
                              <img className="avatar" src={r.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.name)}`} alt="" />
                              <div><b>{r.name}</b><small>{r.emp_code} · {r.department}</small></div>
                            </div>
                          </td>
                          <td style={{ color: 'var(--subtle)' }}>{r.branch}</td>
                          <td><Stars value={r.avg} size={12} showValue /></td>
                          <td>{r.reviews}</td>
                          <td>{r.recommendRate}%</td>
                          <td><b>{r.performanceScore}</b></td>
                          <td>
                            {r.bonus
                              ? <span className="bonus-badge" style={{ background: BONUS_BG[r.bonus.tier], color: r.bonus.color }}><Award size={11} /> {r.bonus.tier}</span>
                              : <span style={{ color: 'var(--subtle)' }}>—</span>}
                            {r.starPerformer && <span className="bonus-badge" style={{ background: '#EDE9FE', color: '#6D28D9', marginLeft: 4 }}><Star size={11} /> Star</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {bonus && <BonusRules bonus={bonus} />}
        </>
      )}
    </div>
  );
}

function Podium({ rows, eotm }) {
  const order = [1, 0, 2]; // silver, gold, bronze visual order
  const icons = { 0: <Crown size={18} />, 1: <Medal size={16} />, 2: <Medal size={16} /> };
  return (
    <div>
      {eotm && (
        <div className="eotm">
          <Trophy size={22} color="#B7791F" />
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#B7791F', letterSpacing: '.4px' }}>EMPLOYEE OF THE MONTH</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{eotm.name} <span style={{ fontWeight: 400, color: 'var(--subtle)', fontSize: 12.5 }}>· {eotm.avg}★ · {eotm.reviews} reviews · Score {eotm.performanceScore}</span></div>
          </div>
        </div>
      )}
      <div className="podium">
        {order.filter((i) => rows[i]).map((i) => {
          const r = rows[i];
          return (
            <div key={r.id} className={`podium-card p${r.rank}`}>
              <div className="podium-rank" style={{ color: RANK_COLOR[r.rank] }}>{icons[i]} #{r.rank}</div>
              <img className="avatar-lg" src={r.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.name)}`} alt="" />
              <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 6 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: 'var(--subtle)' }}>{r.department}</div>
              <div style={{ marginTop: 5 }}><Stars value={r.avg} size={13} showValue /></div>
              <div style={{ fontSize: 11.5, color: 'var(--subtle)', marginTop: 2 }}>{r.reviews} reviews · Score {r.performanceScore}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BonusRules({ bonus }) {
  const eligible = bonus.rows.filter((r) => r.bonus);
  return (
    <div className="panel" style={{ marginTop: 18 }}>
      <h3 style={{ marginTop: 0 }}>Bonus & Incentive Rules</h3>
      <div className="bonus-rules">
        {bonus.rules.map((r) => (
          <div key={r.tier} className="bonus-rule" style={{ borderColor: r.color + '55' }}>
            <div className="bonus-badge" style={{ background: BONUS_BG[r.tier], color: r.color }}><Award size={12} /> {r.tier}</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>Avg ≥ {r.minAvg}★ &amp; ≥ {r.minReviews} reviews</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>{r.reward}</div>
          </div>
        ))}
        <div className="bonus-rule" style={{ borderColor: '#6D28D955' }}>
          <div className="bonus-badge" style={{ background: '#EDE9FE', color: '#6D28D9' }}><Star size={12} /> Star Performer</div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>≥ {bonus.starPerformerMin} five-star reviews</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>Performance Reward</div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--subtle)', marginTop: 14 }}>
        <b>{eligible.length}</b> employee{eligible.length !== 1 ? 's' : ''} currently eligible for a bonus.
      </div>
    </div>
  );
}
