import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { useApi, StatCard, Spinner, EmployeeCell } from '../components/ui.jsx';
import { rupee } from '../api.js';

const COLORS = ['#3a5a40', '#588157', '#b08d57', '#2c6e9b', '#a3b18a', '#bc6c25'];

export default function Dashboard() {
  const { data, loading } = useApi('/analytics/dashboard');
  if (loading || !data) return <Spinner />;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Workforce Analytics</h1>
          <p>Real-time overview for {new Date(data.date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
        </div>
      </div>

      <div className="grid stats" style={{ marginBottom: 16 }}>
        <StatCard icon="👥" value={data.totalEmployees} label="Total Employees" color="#3a5a40" />
        <StatCard icon="✅" value={data.present} label="Present Today" color="#2e7d32" />
        <StatCard icon="❌" value={data.absent} label="Absent Today" color="#c0392b" />
        <StatCard icon="🌴" value={data.onLeaveToday} label="On Leave" color="#2c6e9b" />
        <StatCard icon="🆕" value={data.newJoiners} label="New Joiners (month)" color="#b08d57" />
        <StatCard icon="💰" value={rupee(data.salaryExpense)} label="Monthly Salary Cost" color="#344e41" />
        <StatCard icon="🏦" value={rupee(data.outstandingAdvances)} label="Outstanding Advances" color="#bc6c25" />
        <StatCard icon="🧾" value={rupee(data.monthExpenses)} label="Expenses (month)" color="#2c6e9b" />
      </div>

      <div className="two-col" style={{ marginBottom: 16 }}>
        <div className="panel">
          <div className="panel-head"><h3>Daily Expense Trend (last 7 days)</h3></div>
          <div className="panel-pad" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.expenseTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => rupee(v)} />
                <Line type="monotone" dataKey="total" stroke="#3a5a40" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Department Distribution</h3></div>
          <div className="panel-pad" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.deptDistribution} dataKey="count" nameKey="department" outerRadius={90} label={(e) => e.department}>
                  {data.deptDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><h3>Top Attendance</h3></div>
          <div className="panel-pad" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topAttendance} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" domain={[0, 100]} fontSize={11} unit="%" />
                <YAxis type="category" dataKey="name" width={90} fontSize={11} />
                <Tooltip formatter={(v) => v + '%'} />
                <Bar dataKey="pct" fill="#588157" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Needs Attention — Low Attendance</h3></div>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Employee</th><th>Attendance</th></tr></thead>
              <tbody>
                {data.lowAttendance.map((e) => (
                  <tr key={e.id}>
                    <td><EmployeeCell row={e} /></td>
                    <td><b style={{ color: e.pct < 70 ? '#c0392b' : '#c8860d' }}>{e.pct}%</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
