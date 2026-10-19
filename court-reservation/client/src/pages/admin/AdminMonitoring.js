import { useState, useEffect } from "react";
import { message } from "antd";
import api from "../../api";
import BarList from "../../components/BarList";
import { getErrorMessage, hourLabel, presetRange } from "../../tools/helpers";

const AdminMonitoring = () => {
  const [preset, setPreset] = useState("last7");
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get("/stats/monitoring", { params: presetRange(preset) })
      .then((response) => setData(response.data))
      .catch((error) => message.error(getErrorMessage(error)));
  }, [preset]);

  if (!data)
    return (
      <div className="page-pad">
        <p>Loading...</p>
      </div>
    );

  const peak = Math.max(...data.byHour.map((h) => h.count), 1);

  return (
    <div className="page-pad">
      <div className="page-head">
        <div>
          <h1 className="page-title">Court Monitoring</h1>
          <p className="muted">How the courts are used. Monitoring only.</p>
        </div>
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
          aria-label="Period"
          className="select-small"
        >
          <option value="last7">Last 7 days</option>
          <option value="last30">Last 30 days</option>
          <option value="month">This month</option>
        </select>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <span>Active courts</span>
          <b>{data.activeCourts}</b>
          <small>Open for booking</small>
        </div>
        <div className="stat">
          <span>Under maintenance</span>
          <b style={{ color: "#B45309" }}>{data.maintenanceCourts}</b>
          <small>Closed for now</small>
        </div>
        <div className="stat">
          <span>Average usage</span>
          <b style={{ color: "#1769F5" }}>{data.averageUsage}%</b>
          <small>Booked hours / open hours</small>
        </div>
        <div className="stat">
          <span>Peak hours</span>
          <b className="small-value">{data.peakHours}</b>
          <small>The busiest 3 hours</small>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h3>Usage by court</h3>
          <BarList
            rows={data.usage.map((u) => ({
              label:
                u.name + (u.status === "maintenance" ? " (maintenance)" : ""),
              value: u.usage,
              text: `${u.usage}%`,
            }))}
          />
        </div>

        <div className="panel">
          <h3>Bookings by hour</h3>
          <div className="hour-chart">
            {data.byHour.map((h) => (
              <div
                key={h.hour}
                className="hour-col"
                title={`${hourLabel(h.hour)}: ${h.count} bookings`}
              >
                <div
                  className={`hour-bar ${h.count === peak && h.count > 0 ? "peak" : ""}`}
                  style={{ height: `${(h.count / peak) * 100}%` }}
                />
                <span>
                  {h.hour % 12 === 0 ? 12 : h.hour % 12}
                  {h.hour >= 12 ? "p" : "a"}
                </span>
              </div>
            ))}
          </div>
          <p className="muted small">The darkest bar is the busiest hour.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminMonitoring;
