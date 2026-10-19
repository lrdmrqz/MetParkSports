import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { homePath } from "../tools/helpers";
import Logo from "./Logo";

const SiteNav = ({ overlay = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className={`site-nav ${overlay ? "overlay" : ""}`}>
      <Link to="/"><Logo /></Link>

      <div className="site-links">
        {/* NavLink adds the class "active" to the page you are on */}
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/courts">Courts</NavLink>
        <NavLink to="/equipment">Equipment</NavLink>
        <Link to="/#about">About</Link>
        {user && user.role === "user" && <NavLink to="/my-reservations">My Reservations</NavLink>}
      </div>

      <div className="site-actions">
        {!user && (
          <>
            <button className="btn-outline-light" onClick={() => navigate("/login")}>Login</button>
            <button className="btn-blue" onClick={() => navigate("/register")}>Sign Up</button>
          </>
        )}
        {user && user.role === "user" && (
          <>
            <NavLink to="/profile" className="site-user">{user.name}</NavLink>
            <button className="btn-outline-light" onClick={handleLogout}>Logout</button>
          </>
        )}
        {user && user.role !== "user" && (
          <>
            <button className="btn-blue" onClick={() => navigate(homePath(user.role))}>Dashboard</button>
            <button className="btn-outline-light" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default SiteNav;
