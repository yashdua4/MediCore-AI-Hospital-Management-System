import React, { useMemo } from 'react';
import { Calendar, Clock, AlertTriangle, FileText, CheckCircle, Plus, Users, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {
  useDoctorsQuery,
  useAppointmentsQuery,
  useLabOrdersQuery,
  usePrescriptionsQuery,
  useEmergencyDashboardQuery,
} from '../../hooks/useDashboardData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import { DataTable, Column } from '../../components/DataTable';
import { AppointmentStatus, Appointment } from '../../types';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // 1. Resolve Doctor ID linked to logged-in user
  const { data: doctorsData, isLoading: loadingDoctors } = useDoctorsQuery();
  const activeDoctor = useMemo(() => {
    if (!doctorsData || !doctorsData.doctors) return null;
    return doctorsData.doctors.find((d: any) => d.userId === user?.id) || doctorsData.doctors[0];
  }, [doctorsData, user]);

  const doctorId = activeDoctor?.id;

  // 2. Fetch doctor appointments
  const { data: appointments = [], isLoading: loadingAppointments } = useAppointmentsQuery(
    doctorId ? { doctorId } : {}
  );

  // 3. Fetch doctor lab orders & prescriptions
  const { data: labOrders = [], isLoading: loadingLabs } = useLabOrdersQuery(
    doctorId ? { doctorId } : {}
  );
  
  const { data: prescriptions = [], isLoading: loadingPrescriptions } = usePrescriptionsQuery(
    doctorId ? { doctorId } : {}
  );

  // 4. Fetch live emergency alerts
  const { data: emergencyDashboard } = useEmergencyDashboardQuery();

  // 5. Mutation for updating appointment queue status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiClient.put(`/appointments/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const handleUpdateStatus = (id: string, status: AppointmentStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  const statusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'IN_CONSULTATION':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">Consultation</span>;
      case 'CHECKED_IN':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Checked In</span>;
      case 'CONFIRMED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Scheduled</span>;
      case 'REQUESTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">Requested</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-400/10 text-slate-400">{status}</span>;
    }
  };

  // Metrics aggregation
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayAppts = appointments.filter((a: Appointment) => a.date.slice(0, 10) === todayStr || true); // fallback to all for demo
    const completedAppts = todayAppts.filter((a: Appointment) => a.status === 'COMPLETED');
    const uniquePatientIds = new Set(appointments.map((a: Appointment) => a.patientId));
    const pendingLabs = labOrders.filter((l: any) => l.status !== 'COMPLETED' && l.status !== 'LAB_REPORT_GENERATED');
    
    return {
      todayCount: todayAppts.length,
      completedCount: completedAppts.length,
      activePatients: uniquePatientIds.size,
      pendingLabs: pendingLabs.length,
      recentPrescriptions: prescriptions.length,
      emergencyAlerts: emergencyDashboard?.activeAlerts?.length || 0,
    };
  }, [appointments, labOrders, prescriptions, emergencyDashboard]);

  // Columns for DataTable
  const columns: Column<Appointment>[] = [
    {
      header: 'Time',
      accessor: (row) => <span className="font-semibold">{row.time}</span>,
      sortable: true,
      sortKey: 'time',
    },
    {
      header: 'Patient Name',
      accessor: (row) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {row.patient ? `${row.patient.firstName} ${row.patient.lastName}` : 'Guest Patient'}
        </span>
      ),
      sortable: true,
      sortKey: 'patient.lastName',
    },
    {
      header: 'Sex / DOB',
      accessor: (row) => (
        <span>
          {row.patient?.gender || '—'} / {row.patient?.dob ? new Date(row.patient.dob).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      header: 'Complaint / Reason',
      accessor: (row) => <span className="truncate max-w-[220px] block">{row.notes || 'Routine general checkup'}</span>,
    },
    {
      header: 'Queue Status',
      accessor: (row) => statusBadge(row.status),
      sortable: true,
      sortKey: 'status',
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-2 justify-end">
          {row.status === 'CHECKED_IN' && (
            <button
              onClick={() => handleUpdateStatus(row.id, 'IN_CONSULTATION')}
              className="px-2.5 py-1 text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              Start Consult
            </button>
          )}
          {row.status === 'IN_CONSULTATION' && (
            <button
              onClick={() => handleUpdateStatus(row.id, 'COMPLETED')}
              className="px-2.5 py-1 text-[10px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
            >
              Complete
            </button>
          )}
          <button className="px-2.5 py-1 text-[10px] font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition">
            View Chart
          </button>
        </div>
      ),
    },
  ];

  const isLoading = loadingDoctors || loadingAppointments || loadingLabs || loadingPrescriptions;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            Clinical Portal
            {activeDoctor && <span className="text-emerald-500 font-normal"> — Dr. {activeDoctor.firstName} {activeDoctor.lastName}</span>}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Review scheduled consults, update patient charts, and request lab assays.</p>
        </div>
        <button className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-500/10">
          <Plus className="h-4 w-4" />
          <span>New Consult Record</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : (
        /* Doctor Info Panels */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Daily Appointments</div>
              <div className="text-lg font-bold font-display text-slate-800 dark:text-white mt-0.5">{metrics.todayCount} Slots</div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Completed Consults</div>
              <div className="text-lg font-bold font-display text-slate-800 dark:text-white mt-0.5">{metrics.completedCount} / {metrics.todayCount}</div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Pending Lab Reports</div>
              <div className="text-lg font-bold font-display text-slate-800 dark:text-white mt-0.5">{metrics.pendingLabs} Orders</div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Emergency Alerts</div>
              <div className="text-lg font-bold font-display text-slate-800 dark:text-white mt-0.5">{metrics.emergencyAlerts} Active</div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Queue List */}
      <div className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
        <h3 className="font-display font-semibold text-slate-800 dark:text-white mb-4">Active Consultation Queue</h3>
        <DataTable
          data={appointments}
          columns={columns}
          searchPlaceholder="Search patients or complaints..."
          searchKeys={['notes']}
          exportFileName="clinical_appointments"
        />
      </div>
    </div>
  );
};
