import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Table, message } from "antd";
import api from "../../api";
import StatusPill from "../../components/StatusPill";
import {
  formatDate,
  formatPeso,
  formatTime,
  getErrorMessage,
} from "../../tools/helpers";

const periods = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 days" },
  { value: "month", label: "This month" },
];


const StaffDashboard = () => {
  const [period, setPeriod] = useState("today");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .get("/stats/staff", { params: { period } })
      .then((response) => setStats(response.data))
      .catch((error) => message.error(getErrorMessage(error)));
  }, [period]);

  const label = periods.find((p) => p.value === period).label;

  const cards = stats
    ? [
        {
          title: "Total bookings",
          value: stats.totalBookings,
          note: label,
        },
        {
          title: "Pending verification",
          value: stats.pendingVerification,
          note: "Payments to verify",
          color: "#C2410C",
        },
        ...(period !== "upcoming"
          ? [
              {
                title: "Collected",
                value: formatPeso(stats.collected),
                note: `Money collected (${label.toLowerCase()})`,
              },
            ]
          : []),
        {
          title: "Completed",
          value: stats.completed,
          note: label,
          color: "#1E7B55",
        },
      ]
    : [];

  const columns = [
    { title: "Date", render: (_, r) => formatDate(r.date) },
    { title: "Time", render: (_, r) => formatTime(r.startTime) },
    { title: "Court", render: (_, r) => r.court?.name },
    { title: "Customer", render: (_, r) => r.user?.name },
    { title: "Status", render: (_, r) => <StatusPill reservation={r} /> },
  ];

  return (
    <div className="page-pad">
      <div className="page-head">
        <div>
          <h1 className="page-title">Staff Dashboard</h1>
          <p className="muted">Reservations and money collected.</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          aria-label="Period"
          className="select-small"
        >
          {periods.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <div className="stat" key={c.title}>
            <span>{c.title}</span>
            <b style={{ color: c.color }}>{c.value}</b>
            <small>{c.note}</small>
          </div>
        ))}
      </div>

      <div className="two-col wide-left">
        <div className="panel flush">
          <h3 className="panel-title">{label}'s reservations</h3>
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={stats ? stats.reservations : []}
            pagination={{ pageSize: 5, showSizeChanger: false }}
            scroll={{ x: true }}
          />
        </div>

        <div className="panel">
          <h3>Quick actions</h3>
          <Link className="quick" to="/staff/reservations?payment=verify">
            Verify downpayments
          </Link>
          <Link className="quick" to="/staff/reservations?status=confirmed">
            Collect balance
          </Link>
          <Link className="quick" to="/staff/catalog">
            Manage courts & equipment
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
