import { useAuth } from "../auth/AuthContext";
import SidebarLayout from "./SidebarLayout";
import SiteLayout from "./SiteLayout";

const RoleLayout = () => {
  const { user } = useAuth();
  return user.role === "user" ? <SiteLayout /> : <SidebarLayout />;
};

export default RoleLayout;
