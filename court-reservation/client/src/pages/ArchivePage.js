import { useState } from "react";
import { Popconfirm, Tabs, message } from "antd";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import usePaged from "../tools/usePaged";
import PagedTable from "../components/PagedTable";
import { formatDate, formatPeso, getErrorMessage, statusInfo } from "../tools/helpers";

const when = (d) => (d ? new Date(d).toLocaleDateString() : "");

const ArchivePage = () => {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [type, setType] = useState("reservations");
  const paged = usePaged(`/archive/${type}`, {});


  const canManage = type === "users" ? isAdmin : !isAdmin;

  const call = async (request, success) => {
    try {
      await request();
      message.success(success);
      paged.refresh();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const details = {
    reservations: [
      { title: "Ref.", dataIndex: "refNo" },
      { title: "Customer", render: (_, r) => r.user?.name || "(deleted user)" },
      { title: "Court", render: (_, r) => r.court?.name || "(deleted court)" },
      { title: "Date", render: (_, r) => formatDate(r.date) },
      { title: "Total", render: (_, r) => formatPeso(r.totalPrice) },
      { title: "Status", render: (_, r) => statusInfo(r).label },
    ],
    courts: [
      { title: "Name", dataIndex: "name" },
      { title: "Sport", dataIndex: "sport" },
      { title: "Rate", render: (_, c) => formatPeso(c.hourlyRate) },
    ],
    equipment: [
      { title: "Name", dataIndex: "name" },
      { title: "Sport", dataIndex: "sport" },
      { title: "Price per hour", render: (_, e) => formatPeso(e.pricePerHour) },
    ],
    users: [
      { title: "Name", dataIndex: "name" },
      { title: "Email", dataIndex: "email" },
      { title: "Role", dataIndex: "role" },
    ],
  };

  const columns = [
    ...details[type],
    { title: "Archived on", render: (_, r) => when(r.archivedAt) },
    {
      title: "Actions",
      render: (_, r) =>
        canManage ? (
          <div className="row-actions">
            <button className="btn-blue small" onClick={() => call(() => api.put(`/archive/${type}/${r._id}/restore`), "Record restored")}>
              Restore
            </button>
            <Popconfirm title="Delete permanently? This cannot be undone." onConfirm={() => call(() => api.delete(`/archive/${type}/${r._id}`), "Record deleted permanently")}>
              <button className="btn-line small danger">Delete</button>
            </Popconfirm>
          </div>
        ) : (
          <span className="muted small">View only</span>
        ),
    },
  ];

  const tabs = [
    { key: "reservations", label: "Reservations" },
    { key: "courts", label: "Courts" },
    { key: "equipment", label: "Equipment" },
    ...(isAdmin ? [{ key: "users", label: "Users" }] : []),
  ];

  return (
    <div className="page-pad">
      <h1 className="page-title">Archive</h1>
      <p className="muted">
        Archived records are no longer active but are kept.{" "}
        {isAdmin ? "Admin can restore users. The other tabs are view only." : "You can restore them at any time."}
      </p>
      <Tabs activeKey={type} onChange={setType} items={tabs} />
      <div className="panel flush">
        <PagedTable columns={columns} paged={paged} />
      </div>
    </div>
  );
};

export default ArchivePage;
