import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Drawer, Modal, Popconfirm, message } from "antd";
import api from "../../api";
import usePaged from "../../tools/usePaged";
import PagedTable from "../../components/PagedTable";
import StatusPill from "../../components/StatusPill";
import { formatDate, formatPeso, formatTime, getErrorMessage, paymentLabel, sports } from "../../tools/helpers";


const StaffReservations = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    search: "",
    status: searchParams.get("status") || "",
    sport: "",
    date: "",
    paymentToVerify: searchParams.get("payment") === "verify" ? "true" : "",
  });
  const paged = usePaged("/reservations", filters);
  const [verifying, setVerifying] = useState(null);

  const setFilter = (name, value) => setFilters({ ...filters, [name]: value });

  const call = async (request, success) => {
    try {
      const response = await request();
      message.success(success || response.data.message || "Done");
      setVerifying(null);
      paged.refresh();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const put = (r, action, body) => () => api.put(`/reservations/${r._id}/${action}`, body);

  const confirmCancel = (r) =>
    Modal.confirm({
      title: `Cancel ${r.refNo}?`,
      content: r.amountPaid > 0 ? `The customer will be refunded ${formatPeso(r.amountPaid)}.` : "No payment was made.",
      okText: "Cancel reservation",
      okButtonProps: { danger: true },
      onOk: () => call(put(r, "cancel")),
    });

  
  const actions = (r) => {
    const buttons = [];
    if (r.status === "pending" && r.paymentSubmitted) {
      buttons.push(<button key="v" className="btn-blue small" onClick={() => setVerifying(r)}>Verify</button>);
      buttons.push(
        <Popconfirm key="r" title="Reject this payment? The customer can send it again." onConfirm={() => call(put(r, "reject-payment"), "Payment rejected")}>
          <button className="btn-line small danger">Reject</button>
        </Popconfirm>
      );
    }
    if (r.status === "pending" && !r.paymentSubmitted) {
      buttons.push(<span key="w" className="muted small">Waiting for payment</span>);
    }
    if (r.status === "confirmed" && r.paymentStatus === "downpayment_paid") {
      buttons.push(
        <Popconfirm key="b" title={`Collect the balance of ${formatPeso(r.totalPrice - r.amountPaid)}?`} onConfirm={() => call(put(r, "collect-balance"), "Balance collected")}>
          <button className="btn-blue small">Collect balance</button>
        </Popconfirm>
      );
    }
    if (r.status === "confirmed" && r.paymentStatus === "fully_paid") {
      buttons.push(<button key="c" className="btn-blue small" onClick={() => call(put(r, "complete"), "Reservation completed")}>Complete</button>);
    }
    if (["pending", "confirmed"].includes(r.status)) {
      buttons.push(<button key="x" className="btn-line small danger" onClick={() => confirmCancel(r)}>Cancel</button>);
    }
    if (["completed", "cancelled", "expired"].includes(r.status)) {
      buttons.push(
        <Popconfirm key="a" title="Move to the archive?" onConfirm={() => call(() => api.put(`/archive/reservations/${r._id}/archive`), "Moved to the archive")}>
          <button className="btn-line small">Archive</button>
        </Popconfirm>
      );
    }
    return <div className="row-actions">{buttons}</div>;
  };

  const columns = [
    { title: "Ref.", dataIndex: "refNo", render: (v) => <b>{v}</b> },
    { title: "Customer", render: (_, r) => r.user?.name || "(deleted user)" },
    { title: "Court", render: (_, r) => r.court?.name },
    { title: "Date & time", render: (_, r) => `${formatDate(r.date)} · ${formatTime(r.startTime)}` },
    { title: "Paid", render: (_, r) => formatPeso(r.amountPaid) },
    { title: "Balance", render: (_, r) => formatPeso(["cancelled", "expired"].includes(r.status) ? 0 : r.totalPrice - r.amountPaid) },
    { title: "Status", render: (_, r) => <StatusPill reservation={r} /> },
    { title: "Actions", render: (_, r) => actions(r) },
  ];

  return (
    <div className="page-pad">
      <h1 className="page-title">Reservations</h1>
      <p className="muted">Verify downpayments, confirm reservations and collect balances.</p>

      <div className="filters">
        <input placeholder="Search customer or reference" aria-label="Search" value={filters.search} onChange={(e) => setFilter("search", e.target.value)} />
        <select aria-label="Status" value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
        <select aria-label="Sport" value={filters.sport} onChange={(e) => setFilter("sport", e.target.value)}>
          <option value="">All sports</option>
          {sports.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" aria-label="Game date" value={filters.date} onChange={(e) => setFilter("date", e.target.value)} />
        <label className="check">
          <input type="checkbox" checked={!!filters.paymentToVerify} onChange={(e) => setFilter("paymentToVerify", e.target.checked ? "true" : "")} />
          Payments to verify
        </label>
      </div>

      <div className="panel flush">
        <PagedTable columns={columns} paged={paged} />
      </div>

      {/* Verify downpayment */}
      <Drawer open={!!verifying} onClose={() => setVerifying(null)} title="Verify downpayment" width={380}>
        {verifying && (
          <div>
            <p className="muted">{verifying.refNo}</p>
            <div className="kv"><span>Customer</span><b>{verifying.user?.name}</b></div>
            <div className="kv"><span>Court</span><b>{verifying.court?.name}</b></div>
            <div className="kv"><span>Game</span><b>{formatDate(verifying.date)} · {formatTime(verifying.startTime)}</b></div>
            <hr />
            <div className="kv"><span>Method</span><b>{verifying.paymentMethod}</b></div>
            <div className="kv"><span>Reference</span><b>{verifying.paymentReference}</b></div>
            <div className="kv"><span>Total</span><b>{formatPeso(verifying.totalPrice)}</b></div>
            <div className="kv"><span>Amount paid</span><b>{formatPeso(verifying.paymentDeclared)} ({verifying.paymentOption === "full" ? "full" : "downpayment"})</b></div>
            <p className="muted small">Check the reference number in your payment account before you verify.</p>
            <button className="btn-blue block-btn" onClick={() => call(put(verifying, "verify-payment"), "Payment verified. Reservation confirmed.")}>
              Verify payment
            </button>
            <Popconfirm title="Reject this payment? The customer can send it again." onConfirm={() => call(put(verifying, "reject-payment"), "Payment rejected")}>
              <button className="btn-line block-btn danger">Reject</button>
            </Popconfirm>
            <p className="muted small">Payment status: {paymentLabel[verifying.paymentStatus]}. A verified payment moves the reservation to Confirmed.</p>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default StaffReservations;
