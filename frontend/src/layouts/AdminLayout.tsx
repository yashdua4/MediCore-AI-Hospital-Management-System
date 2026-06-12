import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { DashboardLayout } from './DashboardLayout';

export const AdminLayout: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'HOSPITAL_ADMIN';
  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <DashboardLayout />;
};
