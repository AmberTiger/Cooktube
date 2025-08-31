import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = () => {
  const { user, initialized } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="container">
        <header className="header">
          <h1>🍳 Cooktube</h1>
          <p>Loading...</p>
        </header>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
