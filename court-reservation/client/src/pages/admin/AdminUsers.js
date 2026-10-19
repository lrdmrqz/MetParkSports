import { useState } from "react";
import { Modal, Popconfirm, Tabs, message } from "antd";
import api from "../../api";
import { useAuth } from "../../auth/AuthContext";
import usePaged from "../../tools/usePaged";
import PagedTable from "../../components/PagedTable";
import FormField from "../../components/FormField";
import PasswordChecklist from "../../components/PasswordChecklist";
import { getErrorMessage } from "../../tools/helpers";
import {
  isPasswordValid,
  isPhone,
  useEmailCheck,
} from "../../tools/validators";

const emptyStaff = {
  name: "",
  email: "",
  username: "",
  phone: "",
  role: "staff",
  password: "",
};

const AdminUsers = () => {
  const { user: me } = useAuth();
  const [group, setGroup] = useState("customers");
  const [search, setSearch] = useState("");
  const paged = usePaged("/users", { group, search });

  const [adding, setAdding] = useState(null);
  const [editing, setEditing] = useState(null);
  const emailState = useEmailCheck(adding ? adding.email : "");

  const call = async (request, success) => {
    try {
      const response = await request();
      if (success) message.success(success);
      paged.refresh();
      return response;
    } catch (error) {
      message.error(getErrorMessage(error));
      return null;
    }
  };

  const showTempPin = (title, name, tempPin) =>
    Modal.info({
      title,
      content: (
        <div>
          <p>
            Give this temporary PIN to <b>{name}</b>. It is shown only once.
          </p>
          <p className="temp-pin">{tempPin}</p>
          <p>They must choose their own PIN at the next login.</p>
        </div>
      ),
    });

  const createStaff = async () => {
    const response = await call(
      () => api.post("/users", adding),
      "Account created",
    );

    if (response) {
      setAdding(null);
      showTempPin(
        "Account created",
        response.data.user.name,
        response.data.tempPin,
      );
    }
  };

  const saveEdit = async () => {
    const { _id, name, phone, role, password } = editing;

    const response = await call(
      () => api.put(`/users/${_id}`, { name, phone, role, password }),
      "Saved",
    );

    if (response) setEditing(null);
  };

  const resetPin = async (u) => {
    const response = await call(() => api.put(`/users/${u._id}/reset-pin`));

    if (response) showTempPin("PIN reset", u.name, response.data.tempPin);
  };

  const isStaffGroup = group === "staff";

  const columns = [
    { title: "Name", dataIndex: "name" },
    {
      title: "Email / Username",
      render: (_, u) => (
        <span>
          {u.email}
          {u.username && <small className="muted"> · {u.username}</small>}
        </span>
      ),
    },
    {
      title: "Role",
      render: (_, u) =>
        u.role === "user" ? "Customer" : u.role === "staff" ? "Staff" : "Admin",
    },
    {
      title: "Status",
      render: () => (
        <span
          className="pill"
          style={{ background: "#DDF5E8", color: "#157347" }}
        >
          Active
        </span>
      ),
    },
    {
      title: "Actions",
      render: (_, u) => (
        <div className="row-actions">
          <button
            className="btn-line small"
            onClick={() => setEditing({ ...u, password: "" })}
          >
            Edit
          </button>

          {isStaffGroup && u._id !== me._id && (
            <Popconfirm
              title={`Reset the PIN of ${u.name}?`}
              onConfirm={() => resetPin(u)}
            >
              <button className="btn-line small">Reset PIN</button>
            </Popconfirm>
          )}

          {u._id !== me._id && (
            <Popconfirm
              title="Archive this account? They will no longer be able to log in."
              onConfirm={() =>
                call(
                  () => api.put(`/archive/users/${u._id}/archive`),
                  "Moved to the archive",
                )
              }
            >
              <button className="btn-line small danger">Archive</button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  // Validate the Add Staff form.
  const addProblems = adding
    ? {
        name: adding.name.trim().length < 2 ? "Enter the full name" : "",
        email: !adding.email
          ? "Email is required"
          : emailState === "invalid"
            ? "Enter a valid email address"
            : emailState === "taken"
              ? "This email is already registered"
              : "",
        phone: !isPhone(adding.phone)
          ? "Use a mobile number like 09171234567"
          : "",
        password: isPasswordValid(adding.password)
          ? ""
          : "The password must follow all the rules",
      }
    : {};

  const addValid =
    adding &&
    Object.values(addProblems).every((p) => !p) &&
    emailState === "available";

  return (
    <div className="page-pad">
      <div className="page-head">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="muted">Manage customers, staff and admin accounts.</p>
        </div>

        {isStaffGroup && (
          <button className="btn-blue" onClick={() => setAdding(emptyStaff)}>
            + Add Staff
          </button>
        )}
      </div>

      <Tabs
        activeKey={group}
        onChange={(key) => {
          setGroup(key);
          setSearch("");
        }}
        items={[
          { key: "customers", label: "Customers" },
          { key: "staff", label: "Staff & Admin" },
        ]}
      />

      <div className="filters">
        <input
          placeholder="Search by name or email"
          aria-label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="panel flush">
        <PagedTable columns={columns} paged={paged} />
      </div>

      <Modal
        open={!!adding}
        title="Add staff or admin account"
        onCancel={() => setAdding(null)}
        onOk={createStaff}
        okText="Create account"
        okButtonProps={{ disabled: !addValid }}
      >
        {adding && (
          <form
            autoComplete="off"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="text"
              name="staff-form-username"
              autoComplete="username"
              tabIndex={-1}
              aria-hidden="true"
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: "hidden",
                clip: "rect(0, 0, 0, 0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
            />

            <FormField
              label="Full name"
              error={adding.name ? addProblems.name : ""}
            >
              <input
                type="text"
                name="new-staff-full-name"
                autoComplete="off"
                value={adding.name}
                onChange={(e) =>
                  setAdding({ ...adding, name: e.target.value })
                }
              />
            </FormField>

            <FormField
              label="Email"
              error={adding.email ? addProblems.email : ""}
              ok={emailState === "available" ? "Email is available" : ""}
              hint={emailState === "checking" ? "Checking..." : ""}
            >
              <input
                type="email"
                name="new-staff-email"
                autoComplete="off"
                value={adding.email}
                onChange={(e) =>
                  setAdding({ ...adding, email: e.target.value })
                }
              />
            </FormField>

            <div className="row2">
              <FormField label="Username (optional)">
                <input
                  type="text"
                  name="new-staff-username"
                  autoComplete="off"
                  value={adding.username}
                  onChange={(e) =>
                    setAdding({ ...adding, username: e.target.value })
                  }
                />
              </FormField>

              <FormField label="Role">
                <select
                  value={adding.role}
                  onChange={(e) =>
                    setAdding({ ...adding, role: e.target.value })
                  }
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </FormField>
            </div>

            <FormField label="Phone (optional)" error={addProblems.phone}>
              <input
                type="tel"
                name="new-staff-phone"
                autoComplete="off"
                value={adding.phone}
                onChange={(e) =>
                  setAdding({ ...adding, phone: e.target.value })
                }
              />
            </FormField>

            <FormField label="Password">
              <input
                type="password"
                name="new-staff-password"
                autoComplete="new-password"
                value={adding.password}
                onChange={(e) =>
                  setAdding({ ...adding, password: e.target.value })
                }
              />
            </FormField>

            <PasswordChecklist password={adding.password} />

            <p className="muted small">
              A temporary 6-digit PIN is created for the new account. You will
              see it once.
            </p>
          </form>
        )}
      </Modal>

      <Modal
        open={!!editing}
        title={editing ? `Edit ${editing.email}` : ""}
        onCancel={() => setEditing(null)}
        onOk={saveEdit}
        okText="Save"
        okButtonProps={{
          disabled:
            !editing ||
            editing.name.trim().length < 2 ||
            !isPhone(editing.phone || "") ||
            (!!editing.password && !isPasswordValid(editing.password)),
        }}
      >
        {editing && (
          <div>
            <FormField label="Full name">
              <input
                type="text"
                autoComplete="off"
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </FormField>

            <FormField
              label="Phone"
              error={
                !isPhone(editing.phone || "")
                  ? "Use a mobile number like 09171234567"
                  : ""
              }
            >
              <input
                type="tel"
                autoComplete="off"
                value={editing.phone || ""}
                onChange={(e) =>
                  setEditing({ ...editing, phone: e.target.value })
                }
              />
            </FormField>

            {editing.role !== "user" && (
              <FormField label="Role">
                <select
                  value={editing.role}
                  disabled={editing._id === me._id}
                  onChange={(e) =>
                    setEditing({ ...editing, role: e.target.value })
                  }
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </FormField>
            )}

            <FormField label="New password (leave blank to keep the current one)">
              <input
                type="password"
                autoComplete="new-password"
                value={editing.password}
                onChange={(e) =>
                  setEditing({ ...editing, password: e.target.value })
                }
              />
            </FormField>

            {editing.password && (
              <PasswordChecklist password={editing.password} />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminUsers;
