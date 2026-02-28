export function Table({ head = [], rows = [] }) {
  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-cards">
        {rows.map((r, idx) => (
          <div key={idx} className="table-card">
            {r.map((c, i) => (
              <div key={i} className="table-card-row">
                <b>{head[i] || "-"}</b>
                <span>{c}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
