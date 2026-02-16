export function Table({ head = [], rows = [] }) {
  return (
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
  );
}
