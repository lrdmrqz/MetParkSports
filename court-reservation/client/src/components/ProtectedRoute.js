import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { homePath } from "../tools/helpers";

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;
  if (user.mustChangePin) return <Navigate to="/set-pin" />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePath(user.role)} />;

  return children;
};

export default ProtectedRoute;
