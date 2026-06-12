import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { DashboardLayout } from './DashboardLayout';

export const DoctorLayout: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const isDoctor =
    user.role === 'DOCTOR' ||
    user.role === 'EMERGENCY_DOCTOR' ||
    user.role === 'TRAUMA_SURGEON';

  if (!isDoctor) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <DashboardLayout />;
};
