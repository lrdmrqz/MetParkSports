import { formatPeso } from "../tools/helpers";

const LineChart = ({ data }) => {
  const width = 1000;
  const height = 180;
  const pad = { left: 56, right: 16, top: 16, bottom: 32 };
  const max = Math.max(...data.map((d) => d.amount), 1000);
  const top = Math.ceil(max / 1000) * 1000; 

  const x = (i) => pad.left + (data.length === 1 ? 0 : (i * (width - pad.left - pad.right)) / (data.length - 1));
  const y = (value) => pad.top + (1 - value / top) * (height - pad.top - pad.bottom);

  const points = data.map((d, i) => `${x(i)},${y(d.amount)}`).join(" ");
  const area = `${x(0)},${y(0)} ${points} ${x(data.length - 1)},${y(0)}`;
  const every = Math.ceil(data.length / 8); 

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="line-chart" role="img" aria-label="Sales over time">
      {[0, 0.5, 1].map((fraction) => (
        <g key={fraction}>
          <line x1={pad.left} x2={width - pad.right} y1={y(top * fraction)} y2={y(top * fraction)} stroke="#E2E8F0" />
          <text x={pad.left - 8} y={y(top * fraction) + 4} textAnchor="end" fontSize="11" fill="#64748B">
            {formatPeso(top * fraction)}
          </text>
        </g>
      ))}
      <polygon points={area} fill="#1769F5" opacity="0.12" />
      <polyline points={points} fill="none" stroke="#1769F5" strokeWidth="2.5" />
      {data.map((d, i) => (
        <g key={d.date}>
          <circle cx={x(i)} cy={y(d.amount)} r="3.5" fill="#1769F5">
            <title>{`${d.date}: ${formatPeso(d.amount)}`}</title>
          </circle>
          {i % every === 0 && (
            <text x={x(i)} y={height - 10} textAnchor="middle" fontSize="11" fill="#64748B">
              {d.date.slice(5)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};

export default LineChart;
