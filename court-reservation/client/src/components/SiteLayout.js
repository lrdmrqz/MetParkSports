import { Outlet } from "react-router-dom";
import SiteNav from "./SiteNav";

const SiteLayout = () => (
  <div className="site">
    <SiteNav />
    <Outlet />
  </div>
);

export default SiteLayout;
