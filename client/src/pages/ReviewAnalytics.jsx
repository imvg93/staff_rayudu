import api from '../api.js';
import { useApi, Spinner, StatCard } from '../components/ui.jsx';
import { Stars } from '../components/Stars.jsx';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell,
} from 'recharts';
import {
  MessageSquare, Star, ThumbsUp, Gauge, Building2, Layers,
  TrendingUp, TrendingDown, Bell, AlertTriangle, Trophy, CheckCircle2,
} from 'lucide-react';

const AVG_COLOR = (v) => (v >= 4.5 ? '#16A34A' : v >= 4 ? '#65A30D' : v >= 3 ? '#CA8A04' : '#EA580C');

export default function ReviewAnalytics() {
  const { data, loading } = useApi('/reviews/analytics');
  const { data: notif, reload: reloadNotif } = useApi('/notifications');

  const markAllRead = async () => { await api.post('/notifications/read-all'); reloadNotif(); };

  if (loading || !data) return <Spinner />;

  return (
    <div>
      <div className="page-head">
        <div><h1>Review Analytics</h1><p>Overall customer satisfaction across branches & departments</p></div>
      </div>

      <div className="grid stats" style={{ marginBottom: 16 }}>
        <StatCard icon={<MessageSquare size={16} />} value={data.totalReviews} label="Total Reviews" />
        <StatCard icon={<Star size={16} />} value={data.overallAvg.toFixed(2)} label="Overall Avg Rating" color="#F5B301" />
        <StatCard icon={<ThumbsUp size={16} />} value={`${data.satisfaction}%`} label="Customer Satisfaction" color="#16A34A" />
        <StatCard icon={<Gauge size={16} />} value={data.avgResponseScore.toFixed(2)} label="Avg Response Score" color="#2563EB" />
      </div>

      <div className="perf-grid">
        <div className="panel">
          <h3 style={{ marginTop: 0 }}><Building2 size={15} style={{ verticalAlign: -2 }} /> Branch-wise Ratings</h3>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={data.byBranch} margin={{ left: -12, right: 10, top: 6 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F6" />
              <XAxis dataKey="name" tick={{ fontSize: 10.5 }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, n) => n === 'avg' ? `${v}★` : v} />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]} barSize={40} name="Avg">
                {data.byBranch.map((d, i) => <Cell key={i} fill={AVG_COLOR(d.avg)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}><Layers size={15} style={{ verticalAlign: -2 }} /> Department-wise Ratings</h3>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={data.byDept} layout="vertical" margin={{ left: 30, right: 16 }}>
              <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10.5 }} />
              <Tooltip formatter={(v) => `${v}★`} />
              <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={14} name="Avg">
                {data.byDept.map((d, i) => <Cell key={i} fill={AVG_COLOR(d.avg)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Monthly Review Growth</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.monthlyGrowth} margin={{ left: -10, right: 12, top: 6 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F6" />
            <XAxis dataKey="ym" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="r" orientation="right" domain={[0, 5]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line yAxisId="l" type="monotone" dataKey="reviews" stroke="#2563EB" strokeWidth={2.2} dot={{ r: 3 }} name="Reviews" />
            <Line yAxisId="r" type="monotone" dataKey="avg" stroke="#F5B301" strokeWidth={2.2} dot={{ r: 3 }} name="Avg Rating" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="perf-grid" style={{ marginTop: 16 }}>
        <RankList title={<><Trophy size={15} style={{ verticalAlign: -2 }} color="#16A34A" /> Top Performing Employees</>} rows={data.topPerformers} good />
        <RankList title={<><AlertTriangle size={15} style={{ verticalAlign: -2 }} color="#EA580C" /> Employees Needing Improvement</>} rows={data.needImprovement} />
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}><Bell size={15} style={{ verticalAlign: -2 }} /> Notifications {notif?.unreadCount > 0 && <span className="notif-count">{notif.unreadCount}</span>}</h3>
          {notif?.unreadCount > 0 && <button className="btn xs gray" onClick={markAllRead}>Mark all read</button>}
        </div>
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          {!notif || notif.rows.length === 0 ? <div className="empty">No notifications.</div> :
            notif.rows.slice(0, 12).map((n) => <NotifRow key={n.id} n={n} />)}
        </div>
      </div>
    </div>
  );
}

function RankList({ title, rows, good }) {
  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {rows.length === 0 ? <div className="empty">Not enough data.</div> : (
        <div style={{ display: 'grid', gap: 8 }}>
          {rows.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 18, fontSize: 12, color: 'var(--subtle)', fontWeight: 700 }}>{i + 1}</span>
              <img className="avatar" src={r.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.name)}`} alt="" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: 'var(--subtle)' }}>{r.department} · {r.branch}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Stars value={r.avg} size={12} showValue />
                <div style={{ fontSize: 10.5, color: 'var(--subtle)' }}>{r.reviews} reviews</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotifRow({ n }) {
  const map = {
    alert: { icon: <AlertTriangle size={15} color="#DC2626" />, bg: '#FEF2F2' },
    success: { icon: <Trophy size={15} color="#B7791F" />, bg: '#FFFBEB' },
    info: { icon: <CheckCircle2 size={15} color="#2563EB" />, bg: '#F8FAFC' },
  };
  const s = map[n.severity] || map.info;
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 8, background: n.is_read ? 'transparent' : s.bg, border: '1px solid var(--line)' }}>
      <div style={{ marginTop: 1 }}>{s.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{n.title}{!n.is_read && <span style={{ marginLeft: 6, width: 6, height: 6, borderRadius: 6, background: '#2563EB', display: 'inline-block' }} />}</div>
        <div style={{ fontSize: 12, color: '#475569' }}>{n.message}</div>
      </div>
    </div>
  );
}
