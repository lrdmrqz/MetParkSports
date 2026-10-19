import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import SiteLayout from "./SiteLayout";
import SidebarLayout from "./SidebarLayout";
import RoleLayout from "./RoleLayout";
import Landing from "../pages/Landing";
import Courts from "../pages/Courts";
import Equipment from "../pages/Equipment";
import Book from "../pages/Book";
import MyReservations from "../pages/MyReservations";
import Profile from "../pages/Profile";
import ArchivePage from "../pages/ArchivePage";
import StaffDashboard from "../pages/staff/StaffDashboard";
import StaffReservations from "../pages/staff/StaffReservations";
import StaffCatalog from "../pages/staff/StaffCatalog";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminReports from "../pages/admin/AdminReports";
import AdminMonitoring from "../pages/admin/AdminMonitoring";
import AdminUsers from "../pages/admin/AdminUsers";

const AppController = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Landing modal="login" />} />
        <Route path="/register" element={<Landing modal="register" />} />
        <Route path="/forgot-password" element={<Landing modal="forgot" />} />
        <Route path="/staff-login" element={<Landing modal="staff" />} />
        <Route path="/set-pin" element={<Landing modal="setpin" />} />

        <Route element={<SiteLayout />}>
          <Route path="/courts" element={<Courts />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route element={<ProtectedRoute roles={["user"]}><Outlet /></ProtectedRoute>}>
            <Route path="/book" element={<Book />} />
            <Route path="/my-reservations" element={<MyReservations />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute><RoleLayout /></ProtectedRoute>}>
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route element={<ProtectedRoute roles={["staff"]}><SidebarLayout /></ProtectedRoute>}>
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/reservations" element={<StaffReservations />} />
          <Route path="/staff/catalog" element={<StaffCatalog />} />
          <Route path="/staff/archive" element={<ArchivePage />} />
        </Route>

        <Route element={<ProtectedRoute roles={["admin"]}><SidebarLayout /></ProtectedRoute>}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/monitoring" element={<AdminMonitoring />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/archive" element={<ArchivePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppController;
