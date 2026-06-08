import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { rupee, fmtDate } from '../api.js';
import { useApi, Spinner } from '../components/ui.jsx';

const DOT = {
  joining: '#2e7d32', leave: '#2c6e9b', advance: '#bc6c25', penalty: '#c0392b',
  warning: '#c0392b', note: '#c8860d', salary: '#3a5a40', exit: '#6b7a72',
  promotion: '#b08d57',
};

export default function Timeline() {
  const { id } = useParams();
  const nav = useNavigate();
  const employees = useApi('/employees');
  const [selected, setSelected] = useState(id || '');
  const [data, setData] = useState(null);

  useEffect(() => { if (id) setSelected(id); }, [id]);
  useEffect(() => {
    if (!selected) { setData(null); return; }
    setData(null);
    api.get(`/timeline/${selected}`).then((r) => setData(r.data));
  }, [selected]);

  return (
    <div>
      <div className="page-head">
        <div><h1>Employee Timeline</h1><p>Complete journey from joining to exit on one screen</p></div>
      </div>

      <div className="toolbar">
        <label style={{ fontSize: 13, color: '#6b7a72' }}>Employee</label>
        <select value={selected} onChange={(e) => { setSelected(e.target.value); nav(`/timeline/${e.target.value}`); }}>
          <option value="">— Select employee —</option>
          {(employees.data || []).map((e) => <option key={e.id} value={e.id}>{e.emp_code} · {e.name}</option>)}
        </select>
      </div>

      {!selected ? <div className="panel"><div className="empty">Select an employee to view their timeline.</div></div>
        : !data ? <Spinner /> : (
          <div className="two-col">
            <div className="panel panel-pad">
              <h3 style={{ marginTop: 0 }}>Activity History</h3>
              {data.events.length === 0 ? <div className="empty">No events.</div> : (
                <div className="timeline">
                  {data.events.map((ev, i) => (
                    <div className="tl-item" key={i}>
                      <span className="dot" style={{ background: DOT[ev.type] || '#888' }} />
                      <div className="d">{fmtDate(ev.date)}</div>
                      <div className="t">{ev.title}</div>
                      <div className="det">{ev.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="panel panel-pad" style={{ marginBottom: 16, textAlign: 'center' }}>
                <img className="avatar" style={{ width: 72, height: 72 }} src={data.employee.photo_url} alt="" />
                <h3 style={{ margin: '10px 0 2px' }}>{data.employee.name}</h3>
                <div style={{ color: '#6b7a72', fontSize: 13 }}>{data.employee.emp_code} · {data.employee.designation}</div>
                <div style={{ color: '#6b7a72', fontSize: 13 }}>{data.employee.department}</div>
                <div style={{ marginTop: 10, fontWeight: 700, color: '#3a5a40' }}>{rupee(data.employee.salary)}/mo</div>
              </div>
              <div className="panel panel-pad">
                <h3 style={{ marginTop: 0 }}>Attendance Summary</h3>
                <Row label="Present" value={data.attendanceSummary.present} color="#2e7d32" />
                <Row label="Absent" value={data.attendanceSummary.absent} color="#c0392b" />
                <Row label="Half-day" value={data.attendanceSummary.half_day} />
                <Row label="Leave" value={data.attendanceSummary.leave} color="#2c6e9b" />
                <Row label="Late arrivals" value={data.attendanceSummary.late} color="#c8860d" />
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eef0ee' }}>
      <span style={{ color: '#6b7a72' }}>{label}</span>
      <b style={color ? { color } : null}>{value || 0}</b>
    </div>
  );
}
