// File: src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles = [], requireAuth = true }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // If authentication is required but no token exists
  if (requireAuth && !token) {
    return <Navigate to="/login" replace />;
  }

  // If user data is required but doesn't exist
  if (requireAuth && !user.id) {
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, check if user has the required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect based on user role
    if (user.role === 'Administrator') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'Employee') {
      // Check employee status
      if (user.status === 'pending') {
        return <Navigate to="/employee-pending" replace />;
      } else if (user.status === 'approved') {
        return <Navigate to="/employee" replace />;
      } else {
        return <Navigate to="/employee-pending" replace />;
      }
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;