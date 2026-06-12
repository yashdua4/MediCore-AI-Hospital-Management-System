import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { DashboardLayout } from './DashboardLayout';

export const PatientLayout: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const isPatient = user.role === 'PATIENT';
  if (!isPatient) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <DashboardLayout />;
};
