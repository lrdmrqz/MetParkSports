const BarList = ({ rows, color = "#1769F5" }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (rows.length === 0) return <p className="muted">No data for this period.</p>;
  return (
    <div>
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <div className="bar-head"><span>{row.label}</span><b>{row.text}</b></div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(row.value / max) * 100}%`, background: color }} /></div>
        </div>
      ))}
    </div>
  );
};

export default BarList;
