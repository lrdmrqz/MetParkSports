import { useState, useEffect } from "react";
import { Table, Tabs, message } from "antd";
import api from "../../api";
import usePaged from "../../tools/usePaged";
import PagedTable from "../../components/PagedTable";
import {
  addDaysString,
  formatDate,
  formatPeso,
  getErrorMessage,
} from "../../tools/helpers";

const kindLabel = {
  downpayment: "Downpayment",
  full: "Full payment",
  balance: "Balance",
  refund: "Refund",
};

const AdminReports = () => {
  const [from, setFrom] = useState(addDaysString(-29));
  const [to, setTo] = useState(addDaysString(0));
  const [range, setRange] = useState({ from, to }); 
  const [stats, setStats] = useState(null);
  const transactions = usePaged("/stats/transactions", range);

  useEffect(() => {
    api
      .get("/stats/admin", { params: range })
      .then((response) => setStats(response.data))
      .catch((error) => message.error(getErrorMessage(error)));
  }, [range]);

  const rangeError =
    from > to ? "The start date must be before the end date" : "";

  const money = (v) => formatPeso(v);
  const nameAmount = [
    { title: "Name", dataIndex: "name" },
    { title: "Sales", dataIndex: "amount", render: money },
  ];

  const columns = [
    { title: "Date", render: (_, t) => new Date(t.at).toLocaleDateString() },
    { title: "Ref.", dataIndex: "refNo" },
    { title: "Customer", dataIndex: "customer" },
    { title: "Court", dataIndex: "court" },
    { title: "Type", render: (_, t) => kindLabel[t.kind] },
    {
      title: "Amount",
      render: (_, t) => (
        <b style={{ color: t.amount < 0 ? "#B42318" : undefined }}>
          {money(t.amount)}
        </b>
      ),
    },
    { title: "Reservation", dataIndex: "status" },
  ];

  return (
    <div className="page-pad">
      <h1 className="page-title">Reports</h1>
      <p className="muted">Sales by date range, sport, court, and equipment.</p>

      <div className="filters">
        <label className="inline-label">
          From{" "}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="inline-label">
          To{" "}
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          className="btn-blue"
          disabled={!!rangeError}
          onClick={() => setRange({ from, to })}
        >
          Generate
        </button>
        {rangeError && <span className="field-msg bad">{rangeError}</span>}
      </div>

      {stats && (
        <>
          <div className="stat-grid three">
            <div className="stat">
              <span>Total sales</span>
              <b>{money(stats.totalSales)}</b>
              <small>
                {formatDate(stats.from)} - {formatDate(stats.to)}
              </small>
            </div>
            <div className="stat">
              <span>Total bookings</span>
              <b>{stats.totalBookings}</b>
              <small>Games in this period</small>
            </div>
            <div className="stat">
              <span>Average order value</span>
              <b>{money(stats.averageOrder)}</b>
              <small>Per reservation</small>
            </div>
            <div className="stat">
              <span>Total refunds</span>
              <b style={{ color: "#B42318" }}>{money(stats.totalRefunds)}</b>
              <small>Refunds issued during this period</small>
            </div>

            <div className="stat">
              <span>Refund transactions</span>
              <b>{stats.refundTransactions}</b>
              <small>Number of refunds issued</small>
            </div>
          </div>

          <div className="panel">
            <Tabs
              items={[
                {
                  key: "date",
                  label: "Sales by Date",
                  children: (
                    <Table
                      rowKey="date"
                      size="small"
                      dataSource={[...stats.salesByDay].reverse()}
                      pagination={{ pageSize: 7, showSizeChanger: false }}
                      columns={[
                        { title: "Date", render: (_, r) => formatDate(r.date) },
                        { title: "Sales", dataIndex: "amount", render: money },
                      ]}
                    />
                  ),
                },
                {
                  key: "sport",
                  label: "By Sport",
                  children: (
                    <Table
                      rowKey="name"
                      size="small"
                      dataSource={stats.salesBySport}
                      columns={nameAmount}
                      pagination={false}
                    />
                  ),
                },
                {
                  key: "court",
                  label: "By Court",
                  children: (
                    <Table
                      rowKey="name"
                      size="small"
                      dataSource={stats.salesByCourt}
                      columns={nameAmount}
                      pagination={{ pageSize: 7, showSizeChanger: false }}
                    />
                  ),
                },
                {
                  key: "equipment",
                  label: "Top Equipment",
                  children: (
                    <Table
                      rowKey="name"
                      size="small"
                      dataSource={stats.topEquipment}
                      pagination={false}
                      columns={[
                        { title: "Equipment", dataIndex: "name" },
                        { title: "Rented", dataIndex: "quantity" },
                        {
                          title: "Revenue",
                          dataIndex: "revenue",
                          render: money,
                        },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </div>
        </>
      )}

      <h3 className="section-title">Recent transactions</h3>
      <div className="panel flush">
        <PagedTable columns={columns} paged={transactions} />
      </div>
    </div>
  );
};

export default AdminReports;
