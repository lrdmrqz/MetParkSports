import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Logo from "./Logo";

const menus = {
  staff: [
    { to: "/staff/dashboard", label: "Dashboard" },
    { to: "/staff/reservations", label: "Reservations" },
    { to: "/staff/catalog", label: "Courts & Equipment" },
    { to: "/staff/archive", label: "Archive" },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/reports", label: "Reports" },
    { to: "/admin/monitoring", label: "Court Monitoring" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/archive", label: "Archive" },
  ],
};

const SidebarLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo"><Logo /></div>

        {menus[user.role].map((item) => (
          <NavLink key={item.to} to={item.to} className="side-link">
            {item.label}
          </NavLink>
        ))}

        <div className="side-spacer" />

        <div className="side-user">
          <b>{user.name}</b>
          <div>{user.role === "admin" ? "Admin" : "Staff"}</div>
          <div className="side-user-links">
            <NavLink to="/profile">Profile</NavLink>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </aside>

      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  );
};

export default SidebarLayout;
