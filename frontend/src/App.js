import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./Components/Loginpage";
import Registration from "./Components/Registration";
import ProtectedRoute from "./Components/ProtectedRoute";
import AdminDashboard from "./Pages/Admin/AdminDashboard";
import Counselor from "./Pages/Admin/Counselor";
import UserDash from "./Pages/User/UserDash";
import { getStoredUser, isAuthenticated } from "./utils/auth";

const roleHome = () => {
  const user = getStoredUser();
  if (!user) return "/login";
  if (user.role === "ambulance") return "/ambulance";
  if (user.role === "admin") return "/admin";
  if (user.role === "super_admin") return "/super-admin";
  return "/citizen";
};

const HomeRedirect = () => <Navigate to={isAuthenticated() ? roleHome() : "/login"} replace />;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Registration />} />

        <Route
          path="/citizen"
          element={
            <ProtectedRoute roles={["citizen"]}>
              <UserDash />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ambulance"
          element={
            <ProtectedRoute roles={["ambulance"]}>
              <Counselor />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin", "super_admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={["admin", "super_admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/super-admin"
          element={
            <ProtectedRoute roles={["super_admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </Router>
  );
}

export default App;
