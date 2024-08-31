import { Navigate } from 'react-router-dom';
import React, { ComponentType } from 'react';

interface ProtectedRouteProps {
  element: ComponentType<any>;
  isAuthenticated: boolean;
  [key: string]: any; // Allows passing additional props
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element: Component, isAuthenticated, ...rest }) => {
  return isAuthenticated ? <Component {...rest} /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
