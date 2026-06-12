import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// Layouts
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { DoctorLayout } from '../layouts/DoctorLayout';
import { NurseLayout } from '../layouts/NurseLayout';
import { PatientLayout } from '../layouts/PatientLayout';

// Pages
import { Login } from '../pages/auth/Login';
import { ExecutiveDashboard } from '../pages/dashboards/ExecutiveDashboard';
import { DoctorDashboard } from '../pages/dashboards/DoctorDashboard';
import { NurseDashboard } from '../pages/dashboards/NurseDashboard';
import { PatientDashboard } from '../pages/dashboards/PatientDashboard';
import { BillingDashboard } from '../pages/dashboards/BillingDashboard';
import { EmergencyDashboard } from '../pages/dashboards/EmergencyDashboard';
import { SecurityDashboard } from '../pages/dashboards/SecurityDashboard';
import { AICopilot } from '../pages/ai/AICopilot';
import { AIDashboard } from '../pages/ai/AIDashboard';

// Shared UI sub-views placeholders / empty states
import { EmptyState } from '../components/EmptyStates';
import { ShieldAlert, Users, Calendar, FlaskConical, Pill, HeartHandshake } from 'lucide-react';

// Route gate to restrict to authenticated sessions
const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Default Landing Redirection node
const DashboardHome: React.FC = () => {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/login" replace />;

  const role = user.role;
  if (role === 'SUPER_ADMIN' || role === 'HOSPITAL_ADMIN') {
    return <Navigate to="/dashboard/executive" replace />;
  }
  if (role === 'DOCTOR' || role === 'EMERGENCY_DOCTOR' || role === 'TRAUMA_SURGEON') {
    return <Navigate to="/dashboard/doctor" replace />;
  }
  if (role === 'NURSE') {
    return <Navigate to="/dashboard/nurse" replace />;
  }
  if (role === 'BILLING_EXEC' || role === 'ACCOUNTANT') {
    return <Navigate to="/dashboard/billing" replace />;
  }
  return <Navigate to="/dashboard/patient" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Unauthorized Access Display */}
      <Route
        path="/unauthorized"
        element={
          <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xl">
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h2 className="font-display font-semibold text-lg text-slate-850 dark:text-white">Permission Level Insufficient</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Your credentials lack structural mapping for this endpoint. Please log out and sign in using a authorized account.
              </p>
              <button
                onClick={() => {
                  useAuthStore.getState().logout();
                  window.location.href = '/login';
                }}
                className="mt-6 inline-flex items-center justify-center px-4 py-2 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-xs font-semibold rounded-xl text-white transition-all shadow-sm"
              >
                Return to Sign In
              </button>
            </div>
          </div>
        }
      />

      {/* Protected Routes Dashboard Scope */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardHome />
          </RequireAuth>
        }
      />

      {/* Admin specific layouts */}
      <Route element={<RequireAuth><AdminLayout /></RequireAuth>}>
        <Route path="/dashboard/executive" element={<ExecutiveDashboard />} />
        <Route path="/dashboard/security" element={<SecurityDashboard />} />
        <Route path="/dashboard/ai-analytics" element={<AIDashboard />} />
      </Route>

      {/* Doctor specific layouts */}
      <Route element={<RequireAuth><DoctorLayout /></RequireAuth>}>
        <Route path="/dashboard/doctor" element={<DoctorDashboard />} />
        <Route
          path="/dashboard/emr"
          element={
            <EmptyState
              icon={HeartHandshake}
              title="EMR Records Room"
              description="HIPAA audit logs track all modifications. Search a patient name via Ctrl+K to pull charts."
            />
          }
        />
      </Route>

      {/* Nurse specific layouts */}
      <Route element={<RequireAuth><NurseLayout /></RequireAuth>}>
        <Route path="/dashboard/nurse" element={<NurseDashboard />} />
      </Route>

      {/* Patient specific layouts */}
      <Route element={<RequireAuth><PatientLayout /></RequireAuth>}>
        <Route path="/dashboard/patient" element={<PatientDashboard />} />
      </Route>

      {/* General shared views (authorized check, layout routing handled internally) */}
      <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route path="/dashboard/billing" element={<BillingDashboard />} />
        <Route path="/dashboard/emergency" element={<EmergencyDashboard />} />
        <Route path="/dashboard/copilot" element={<AICopilot />} />
        
        {/* Placeholder folders fallback */}
        <Route
          path="/dashboard/patients"
          element={
            <EmptyState
              icon={Users}
              title="Patients Registry"
              description="Comprehensive registry containing demographic, contact, and emergency clinical files."
            />
          }
        />
        <Route
          path="/dashboard/appointments"
          element={
            <EmptyState
              icon={Calendar}
              title="Consultation Slots Scheduler"
              description="Active scheduling desk. Click New Appointment or search with Command Center."
            />
          }
        />
        <Route
          path="/dashboard/lab"
          element={
            <EmptyState
              icon={FlaskConical}
              title="Laboratory Assays & Reports"
              description="Check statuses of active blood, chemical, and pathology requests."
            />
          }
        />
        <Route
          path="/dashboard/pharmacy"
          element={
            <EmptyState
              icon={Pill}
              title="Pharmacy Dispense Registry"
              description="Prescription refills, drug inventories logs, and supplier invoices tracker."
            />
          }
        />
      </Route>

      {/* Default fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
