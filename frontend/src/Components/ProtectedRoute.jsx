import React from "react";
import { Navigate } from "react-router-dom";
import { getStoredUser, isAuthenticated } from "../utils/auth";

const ProtectedRoute = ({ children, roles }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const user = getStoredUser();
  if (roles && roles.length && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
