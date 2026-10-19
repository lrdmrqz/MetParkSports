import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Modal, message } from "antd";
import api from "../api";
import useRules from "../tools/useRules";
import usePaged from "../tools/usePaged";
import PagedTable from "../components/PagedTable";
import StatusPill from "../components/StatusPill";
import FormField from "../components/FormField";
import { addDaysString, formatDate, formatPeso, formatTime, getErrorMessage, paymentLabel } from "../tools/helpers";
import { isReference } from "../tools/validators";

const timeLeft = (r) => {
  const ms = new Date(r.expiresAt) - Date.now();
  if (ms <= 0) return "Expiring now";
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
};

const MyReservations = () => {
  const rules = useRules();
  const [status, setStatus] = useState("");
  const paged = usePaged("/reservations/my", { status });

  const [payFor, setPayFor] = useState(null); // the reservation being paid
  const [pay, setPay] = useState({ paymentOption: "downpayment", paymentMethod: "GCash", paymentReference: "" });

  // Refresh the countdown every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // ---------- Cancel ----------
  const refundText = (r) => {
    if (r.amountPaid <= 0) return "No payment was made, so there is nothing to refund.";
    const daysBefore = Math.round((new Date(`${r.date}T00:00:00`) - new Date(`${addDaysString(0)}T00:00:00`)) / 86400000);
    return daysBefore >= rules.refundDaysBefore
      ? `You will get your payment of ${formatPeso(r.amountPaid)} back.`
      : `There is no refund, because it is less than ${rules.refundDaysBefore} days before your game.`;
  };

  const confirmCancel = (r) => {
    Modal.confirm({
      title: `Cancel ${r.refNo}?`,
      content: refundText(r),
      okText: "Yes, cancel it",
      cancelText: "Keep it",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const response = await api.put(`/reservations/${r._id}/cancel`);
          message.success(response.data.message);
          paged.refresh();
        } catch (error) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  const referenceError = isReference(pay.paymentReference) ? "" : "Use 6-30 letters, numbers or dashes";

  const submitPay = async () => {
    try {
      await api.put(`/reservations/${payFor._id}/pay`, pay);
      message.success("Payment submitted. Staff will verify it.");
      setPayFor(null);
      setPay({ ...pay, paymentReference: "" });
      paged.refresh();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const columns = [
    { title: "Ref.", dataIndex: "refNo", render: (v) => <b>{v}</b> },
    { title: "Court", render: (_, r) => r.court?.name || "(deleted court)" },
    { title: "Date & time", render: (_, r) => `${formatDate(r.date)} · ${formatTime(r.startTime)}` },
    { title: "Total", dataIndex: "totalPrice", render: (v) => formatPeso(v) },
    { title: "Paid", dataIndex: "amountPaid", render: (v) => formatPeso(v) },
    {
      title: "Status",
      render: (_, r) => (
        <div>
          <StatusPill reservation={r} />
          <div className="muted small">{paymentLabel[r.paymentStatus]}</div>
          {r.paymentNote && r.status === "pending" && <div className="field-msg bad">{r.paymentNote}</div>}
        </div>
      ),
    },
    {
      title: "Pay within",
      render: (_, r) => (r.status === "pending" && !r.paymentSubmitted ? <b>{timeLeft(r)}</b> : "-"),
    },
    {
      title: "Actions",
      render: (_, r) => (
        <div className="row-actions">
          {r.status === "pending" && !r.paymentSubmitted && (
            <button className="btn-blue small" onClick={() => setPayFor(r)}>Pay now</button>
          )}
          {["pending", "confirmed"].includes(r.status) && (
            <button className="btn-line small danger" onClick={() => confirmCancel(r)}>Cancel</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-pad">
      <div className="page-head">
        <div>
          <h1 className="page-title">My Reservations</h1>
          <p className="muted">Follow your bookings, pay, or cancel them here.</p>
        </div>
        <Link to="/book" className="btn-blue">Book a Court</Link>
      </div>

      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="panel flush">
        <PagedTable columns={columns} paged={paged} />
      </div>

      <Modal
        open={!!payFor}
        title={payFor ? `Pay for ${payFor.refNo}` : ""}
        onCancel={() => setPayFor(null)}
        onOk={submitPay}
        okText="Submit payment"
        okButtonProps={{ disabled: !!referenceError }}
      >
        {payFor && (
          <div>
            <p>Total: <b>{formatPeso(payFor.totalPrice)}</b></p>
            <FormField label="How much do you want to pay now?">
              <select value={pay.paymentOption} onChange={(e) => setPay({ ...pay, paymentOption: e.target.value })}>
                <option value="downpayment">{rules.downpaymentPercent}% downpayment - {formatPeso(Math.ceil((payFor.totalPrice * rules.downpaymentPercent) / 100))}</option>
                <option value="full">Pay in full - {formatPeso(payFor.totalPrice)}</option>
              </select>
            </FormField>
            <FormField label="Payment method">
              <select value={pay.paymentMethod} onChange={(e) => setPay({ ...pay, paymentMethod: e.target.value })}>
                {rules.paymentMethods.filter((m) => m !== "Pay at the counter").map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>
            <FormField
              label="Reference number"
              error={pay.paymentReference ? referenceError : ""}
              ok={pay.paymentReference && !referenceError ? "Valid reference number" : ""}
            >
              <input value={pay.paymentReference} onChange={(e) => setPay({ ...pay, paymentReference: e.target.value })} />
            </FormField>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyReservations;
