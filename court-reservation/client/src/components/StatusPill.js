import { statusInfo } from "../tools/helpers";

const StatusPill = ({ reservation }) => {
  const info = statusInfo(reservation);
  return (
    <span className="pill" style={{ background: info.bg, color: info.color }}>
      {info.label}
    </span>
  );
};

export default StatusPill;
