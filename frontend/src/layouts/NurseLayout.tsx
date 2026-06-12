import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { DashboardLayout } from './DashboardLayout';

export const NurseLayout: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const isNurse = user.role === 'NURSE';
  if (!isNurse) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <DashboardLayout />;
};
