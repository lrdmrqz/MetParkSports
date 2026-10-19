import { useState, useEffect } from "react";
import { Tabs, message } from "antd";
import api from "../../api";
import LineChart from "../../components/LineChart";
import BarList from "../../components/BarList";
import { formatPeso, getErrorMessage, presetRange } from "../../tools/helpers";

const AdminDashboard = () => {
  const [preset, setPreset] = useState("last7");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .get("/stats/admin", { params: presetRange(preset) })
      .then((response) => setStats(response.data))
      .catch((error) => message.error(getErrorMessage(error)));
  }, [preset]);

  const cards = stats
    ? [
        { title: "Total sales", value: formatPeso(stats.totalSales), note: "Money collected, refunds removed" },
        { title: "Total bookings", value: stats.totalBookings, note: "Games in this period" },
        { title: "Active users", value: stats.activeUsers, note: "Customers who booked" },
        { title: "Peak hours", value: stats.peakHours, note: "The busiest 3 hours", small: true },
      ]
    : [];

  const toRows = (list) => list.map((x) => ({ label: x.name, value: x.amount, text: formatPeso(x.amount) }));

  return (
    <div className="page-pad">
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="muted">Sales and analytics of MetParkSports.</p>
        </div>
        <select value={preset} onChange={(e) => setPreset(e.target.value)} aria-label="Period" className="select-small">
          <option value="last7">Last 7 days</option>
          <option value="last30">Last 30 days</option>
          <option value="month">This month</option>
        </select>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <div className="stat" key={c.title}>
            <span>{c.title}</span>
            <b className={c.small ? "small-value" : ""}>{c.value}</b>
            <small>{c.note}</small>
          </div>
        ))}
      </div>

      {stats && (
        <div className="panel">
          <Tabs
            items={[
              { key: "overview", label: "Sales Overview", children: <LineChart data={stats.salesByDay} /> },
              { key: "sport", label: "Sales by Sport", children: <BarList rows={toRows(stats.salesBySport)} /> },
              { key: "court", label: "Sales by Court", children: <BarList rows={toRows(stats.salesByCourt)} /> },
              {
                key: "equipment",
                label: "Top Equipment",
                children: (
                  <BarList
                    rows={stats.topEquipment.map((e) => ({ label: e.name, value: e.quantity, text: `${e.quantity} rented · ${formatPeso(e.revenue)}` }))}
                  />
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
