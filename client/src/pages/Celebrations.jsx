import { useApi, Spinner } from '../components/ui.jsx';

export default function Celebrations() {
  const { data, loading } = useApi('/analytics/celebrations');
  if (loading || !data) return <Spinner />;

  const when = (d) => d === 0 ? 'Today 🎊' : d === 1 ? 'Tomorrow' : `in ${d} days`;

  return (
    <div>
      <div className="page-head">
        <div><h1>Celebrations</h1><p>Upcoming birthdays & work anniversaries (next 30 days)</p></div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head"><h3>🎂 Birthdays</h3></div>
          <div className="panel-pad">
            {data.birthdays.length === 0 ? <div className="empty">No upcoming birthdays.</div> :
              data.birthdays.map((e) => (
                <div className="celebrate-card" key={e.id}>
                  <img className="avatar" src={e.photo_url} alt="" />
                  <div><b>{e.name}</b><div style={{ color: '#6b7a72', fontSize: 12 }}>{e.department}</div></div>
                  <span className="when">{when(e.in_days)}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>🏆 Work Anniversaries</h3></div>
          <div className="panel-pad">
            {data.anniversaries.length === 0 ? <div className="empty">No upcoming anniversaries.</div> :
              data.anniversaries.map((e) => (
                <div className="celebrate-card" key={e.id}>
                  <img className="avatar" src={e.photo_url} alt="" />
                  <div><b>{e.name}</b><div style={{ color: '#6b7a72', fontSize: 12 }}>{e.years} year(s) · {e.department}</div></div>
                  <span className="when">{when(e.in_days)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
