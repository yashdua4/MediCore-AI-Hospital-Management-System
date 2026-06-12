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

// Portal Views
import { PatientEMR } from '../pages/patient/PatientEMR';
import { PatientAppointments } from '../pages/patient/PatientAppointments';
import { PatientLabReports } from '../pages/patient/PatientLabReports';
import { PatientBilling } from '../pages/patient/PatientBilling';
import { PatientProfile } from '../pages/patient/PatientProfile';
import { DoctorEMR } from '../pages/doctor/DoctorEMR';
import { DoctorAppointments } from '../pages/doctor/DoctorAppointments';
import { DoctorLabReview } from '../pages/doctor/DoctorLabReview';
import { DoctorPatients } from '../pages/doctor/DoctorPatients';
import { DoctorPharmacy } from '../pages/doctor/DoctorPharmacy';
import { NotificationsHistory } from '../pages/notifications/NotificationsHistory';
import { usePrescriptionsQuery, usePatientsQuery } from '../hooks/useDashboardData';

// Shared UI sub-views placeholders / empty states
import { EmptyState } from '../components/EmptyStates';
import { ShieldAlert, Users, Calendar, FlaskConical, Pill, HeartHandshake, Pill as PillIcon } from 'lucide-react';

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

// ==========================================
// DYNAMIC ROLE-BASED ROUTE WRAPPERS
// ==========================================

const DynamicEMR: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'PATIENT') return <PatientEMR />;
  if (['DOCTOR', 'EMERGENCY_DOCTOR', 'TRAUMA_SURGEON', 'NURSE'].includes(role || '')) return <DoctorEMR />;
  return <EmptyState icon={HeartHandshake} title="EMR Chart Room" description="Restricted to clinical staff and patient owners." />;
};

const DynamicAppointments: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'PATIENT') return <PatientAppointments />;
  if (['DOCTOR', 'EMERGENCY_DOCTOR', 'TRAUMA_SURGEON'].includes(role || '')) return <DoctorAppointments />;
  return <EmptyState icon={Calendar} title="Appointments" description="Access restricted." />;
};

const DynamicLab: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'PATIENT') return <PatientLabReports />;
  if (['DOCTOR', 'EMERGENCY_DOCTOR', 'TRAUMA_SURGEON', 'LAB_TECH'].includes(role || '')) return <DoctorLabReview />;
  return <EmptyState icon={FlaskConical} title="Laboratory Log" description="Access restricted." />;
};

const PatientPrescriptionsList: React.FC = () => {
  const { user } = useAuthStore();
  const { data: patientsData } = usePatientsQuery();
  const activePatient = React.useMemo(() => {
    if (!patientsData?.patients) return null;
    return patientsData.patients.find((p: any) => p.userId === user?.id) || patientsData.patients[0];
  }, [patientsData, user]);

  const patientId = activePatient?.id;
  const { data: prescriptions = [], isLoading } = usePrescriptionsQuery(patientId ? { patientId } : {});

  if (isLoading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mt-12" />;

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <PillIcon className="h-6 w-6 text-emerald-500" />
          Active Refill & Prescriptions
        </h1>
        <p className="text-xs text-slate-555 dark:text-slate-400 mt-1">Review active pharmacy scripts and dosage details.</p>
      </div>

      <div className="p-6 border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
        {prescriptions.length === 0 ? (
          <div className="text-center py-12 text-slate-450 text-xs">No active prescriptions.</div>
        ) : (
          <div className="space-y-4">
            {prescriptions.map((p: any) => (
              <div key={p.id} className="p-4 border border-slate-100 dark:border-slate-850 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10 space-y-3">
                <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-850 pb-2">
                  <span>Issued: {new Date(p.createdAt).toLocaleDateString()}</span>
                  <span>Prescribed By: {p.doctor?.email || 'Clinical Staff'}</span>
                </div>
                <div className="space-y-2">
                  {p.medicines?.map((m: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{m.medicineName} ({m.strength})</span>
                        {m.instructions && <p className="text-[10px] text-slate-405 mt-0.5">{m.instructions}</p>}
                      </div>
                      <div className="text-right">
                        <span>{m.frequency}</span>
                        <p className="text-[10px] text-slate-405 mt-0.5">Duration: {m.duration}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DynamicPharmacy: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'PATIENT') return <PatientPrescriptionsList />;
  if (['DOCTOR', 'EMERGENCY_DOCTOR', 'TRAUMA_SURGEON', 'PHARMACIST', 'NURSE'].includes(role || '')) return <DoctorPharmacy />;
  return <EmptyState icon={Pill} title="Pharmacy" description="Access restricted." />;
};

const DynamicBilling: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  if (role === 'PATIENT') return <PatientBilling />;
  return <BillingDashboard />;
};

const DynamicPatients: React.FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  if (['DOCTOR', 'EMERGENCY_DOCTOR', 'TRAUMA_SURGEON', 'SUPER_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_EXEC'].includes(role || '')) return <DoctorPatients />;
  return <EmptyState icon={Users} title="Patients Registry" description="Access restricted." />;
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
          <div className="min-h-screen flex items-center justify-center p-6 bg-slate-55 dark:bg-slate-950 font-sans">
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
        <Route path="/dashboard/copilot" element={<AICopilot />} />
        <Route path="/dashboard/emergency" element={<EmergencyDashboard />} />
        
        {/* Dynamic Role-Based Views */}
        <Route path="/dashboard/emr" element={<DynamicEMR />} />
        <Route path="/dashboard/appointments" element={<DynamicAppointments />} />
        <Route path="/dashboard/lab" element={<DynamicLab />} />
        <Route path="/dashboard/pharmacy" element={<DynamicPharmacy />} />
        <Route path="/dashboard/patients" element={<DynamicPatients />} />
        <Route path="/dashboard/billing" element={<DynamicBilling />} />
        <Route path="/dashboard/profile" element={<PatientProfile />} />
        <Route path="/dashboard/notifications" element={<NotificationsHistory />} />
      </Route>

      {/* Default fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

