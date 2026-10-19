import { useState } from "react";
import { Modal, Popconfirm, Tabs, message } from "antd";
import api from "../../api";
import usePaged from "../../tools/usePaged";
import PagedTable from "../../components/PagedTable";
import FormField from "../../components/FormField";
import { formatPeso, getErrorMessage, sports } from "../../tools/helpers";

const timeOptions = Array.from({ length: 25 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

const emptyCourt = {
  name: "",
  sport: "Basketball",
  location: "MET Park Sports Center, Metrobank Ave., Met Park, Pasay City",
  hourlyRate: "",
  openTime: "07:00",
  closeTime: "24:00",
  description: "",
  status: "available",
};
const emptyEquipment = { name: "", sport: "All", pricePerHour: "", stock: "", description: "", status: "available" };


const StaffCatalog = () => {
  const [tab, setTab] = useState("courts");
  const [search, setSearch] = useState("");
  const courts = usePaged("/courts", { search });
  const equipment = usePaged("/equipment", { search });
  const paged = tab === "courts" ? courts : equipment;

  const [form, setForm] = useState(null);
  const isNew = form && !form._id;

  const change = (field, value) => setForm({ ...form, [field]: value });

  const call = async (request, success) => {
    try {
      await request();
      message.success(success);
      paged.refresh();
      return true;
    } catch (error) {
      message.error(getErrorMessage(error));
      return false;
    }
  };

  const save = async () => {
    const url = tab === "courts" ? "/courts" : "/equipment";
    const ok = await call(() => (isNew ? api.post(url, form) : api.put(`${url}/${form._id}`, form)), isNew ? "Added" : "Saved");
    if (ok) setForm(null);
  };

  const toggleStatus = (r) => {
    const url = tab === "courts" ? "/courts" : "/equipment";
    const next = r.status === "available" ? (tab === "courts" ? "maintenance" : "unavailable") : "available";
    call(() => api.put(`${url}/${r._id}`, { ...r, status: next }), "Status updated");
  };

  const archive = (r) => call(() => api.put(`/archive/${tab}/${r._id}/archive`), "Moved to the archive");

  const pill = (status) => (
    <span className="pill" style={status === "available" ? { background: "#DDF5E8", color: "#157347" } : { background: "#FFF1D6", color: "#8A4B00" }}>
      {status === "available" ? "Active" : status === "maintenance" ? "Maintenance" : "Unavailable"}
    </span>
  );

  const actions = (r) => (
    <div className="row-actions">
      <button className="btn-line small" onClick={() => setForm(r)}>Edit</button>
      <button className="btn-line small" onClick={() => toggleStatus(r)}>
        {r.status === "available" ? (tab === "courts" ? "Maintenance" : "Disable") : "Activate"}
      </button>
      <Popconfirm title="Move to the archive?" onConfirm={() => archive(r)}>
        <button className="btn-line small danger">Archive</button>
      </Popconfirm>
    </div>
  );

  const courtColumns = [
    { title: "Court name", dataIndex: "name" },
    { title: "Sport", dataIndex: "sport" },
    { title: "Rate", render: (_, r) => `${formatPeso(r.hourlyRate)}/hr` },
    { title: "Hours", render: (_, r) => `${r.openTime} - ${r.closeTime}` },
    { title: "Status", render: (_, r) => pill(r.status) },
    { title: "Actions", render: (_, r) => actions(r) },
  ];
  const equipmentColumns = [
    { title: "Equipment", dataIndex: "name" },
    { title: "Sport", dataIndex: "sport" },
    { title: "Price", render: (_, r) => `${formatPeso(r.pricePerHour)}/hr` },
    { title: "Stock", dataIndex: "stock" },
    { title: "Status", render: (_, r) => pill(r.status) },
    { title: "Actions", render: (_, r) => actions(r) },
  ];

  const problem = !form
    ? ""
    : !form.name?.trim() ? "Enter a name"
    : tab === "courts" && (form.hourlyRate === "" || Number(form.hourlyRate) < 0) ? "Enter the rate per hour"
    : tab === "equipment" && (form.pricePerHour === "" || Number(form.pricePerHour) < 0) ? "Enter the price per hour"
    : tab === "equipment" && (form.stock === "" || Number(form.stock) < 0) ? "Enter the stock"
    : "";

  return (
    <div className="page-pad">
      <div className="page-head">
        <div>
          <h1 className="page-title">Courts & Equipment</h1>
          <p className="muted">Add, edit, and set courts and equipment to maintenance.</p>
        </div>
        <button className="btn-blue" onClick={() => setForm(tab === "courts" ? emptyCourt : emptyEquipment)}>
          + Add {tab === "courts" ? "Court" : "Equipment"}
        </button>
      </div>

      <Tabs activeKey={tab} onChange={(key) => { setTab(key); setSearch(""); }} items={[{ key: "courts", label: "Courts" }, { key: "equipment", label: "Equipment" }]} />
      <div className="filters">
        <input placeholder="Search by name" aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="panel flush">
        <PagedTable columns={tab === "courts" ? courtColumns : equipmentColumns} paged={paged} />
      </div>

      <Modal
        open={!!form}
        title={`${isNew ? "Add" : "Edit"} ${tab === "courts" ? "court" : "equipment"}`}
        onCancel={() => setForm(null)}
        onOk={save}
        okText="Save"
        okButtonProps={{ disabled: !!problem }}
      >
        {form && (
          <div>
            <FormField label="Name" error={form.name ? "" : "Enter a name"}>
              <input value={form.name} onChange={(e) => change("name", e.target.value)} />
            </FormField>
            <FormField label="Sport">
              <select value={form.sport} onChange={(e) => change("sport", e.target.value)}>
                {tab === "equipment" && <option value="All">All sports</option>}
                {sports.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>

            {tab === "courts" ? (
              <>
                <FormField label="Location">
                  <input value={form.location} onChange={(e) => change("location", e.target.value)} />
                </FormField>
                <div className="row2">
                  <FormField label="Rate per hour (PHP)">
                    <input type="number" min="0" value={form.hourlyRate} onChange={(e) => change("hourlyRate", e.target.value)} />
                  </FormField>
                  <FormField label="Status">
                    <select value={form.status} onChange={(e) => change("status", e.target.value)}>
                      <option value="available">Active</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </FormField>
                </div>
                <div className="row2">
                  <FormField label="Opens">
                    <select value={form.openTime} onChange={(e) => change("openTime", e.target.value)}>
                      {timeOptions.slice(0, -1).map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Closes">
                    <select value={form.closeTime} onChange={(e) => change("closeTime", e.target.value)}>
                      {timeOptions.slice(1).map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormField>
                </div>
              </>
            ) : (
              <>
                <div className="row2">
                  <FormField label="Price per hour (PHP)">
                    <input type="number" min="0" value={form.pricePerHour} onChange={(e) => change("pricePerHour", e.target.value)} />
                  </FormField>
                  <FormField label="Stock (pieces)">
                    <input type="number" min="0" value={form.stock} onChange={(e) => change("stock", e.target.value)} />
                  </FormField>
                </div>
                <FormField label="Status">
                  <select value={form.status} onChange={(e) => change("status", e.target.value)}>
                    <option value="available">Active</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </FormField>
              </>
            )}

            <FormField label="Description">
              <input value={form.description} onChange={(e) => change("description", e.target.value)} />
            </FormField>
            {problem && <div className="field-msg bad">{problem}</div>}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StaffCatalog;
