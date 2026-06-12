import React, { useMemo } from 'react';
import { Calendar, FileHeart, DollarSign, Pill, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {
  usePatientsQuery,
  useAppointmentsQuery,
  usePrescriptionsQuery,
  useBillingInvoicesQuery,
  usePatientMedicalHistoryQuery,
} from '../../hooks/useDashboardData';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuthStore();

  // 1. Resolve Patient ID linked to logged-in user
  const { data: patientsData, isLoading: loadingPatients } = usePatientsQuery();
  const activePatient = useMemo(() => {
    if (!patientsData || !patientsData.patients) return null;
    return patientsData.patients.find((p: any) => p.userId === user?.id) || patientsData.patients[0];
  }, [patientsData, user]);

  const patientId = activePatient?.id;

  // 2. Fetch patient data
  const { data: appointments = [], isLoading: loadingAppointments } = useAppointmentsQuery(
    patientId ? { patientId } : {}
  );
  
  const { data: prescriptions = [], isLoading: loadingPrescriptions } = usePrescriptionsQuery(
    patientId ? { patientId } : {}
  );

  const { data: invoices = [], isLoading: loadingInvoices } = useBillingInvoicesQuery(
    patientId ? { patientId } : {}
  );

  const { data: history = [], isLoading: loadingHistory } = usePatientMedicalHistoryQuery(patientId);

  // 3. Compute metrics
  const nextVisit = useMemo(() => {
    const active = appointments
      .filter((a: any) => a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && a.status !== 'NO_SHOW')
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return active[0];
  }, [appointments]);

  const outstandingBalance = useMemo(() => {
    return invoices
      .filter((inv: any) => inv.status === 'UNPAID' || inv.status === 'PARTIALLY_PAID')
      .reduce((sum: number, inv: any) => sum + parseFloat(inv.outstandingAmount || inv.totalAmount || 0), 0);
  }, [invoices]);

  const isLoading = loadingPatients || loadingAppointments || loadingPrescriptions || loadingInvoices || loadingHistory;

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
          Patient Health Portal
          {activePatient && <span className="text-emerald-500 font-normal"> — {activePatient.firstName} {activePatient.lastName}</span>}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Review prescriptions, invoice history, and upcoming clinical slots.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : (
        /* Patient Overview Metrics Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Upcoming Visit</span>
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-sm font-bold font-display text-slate-800 dark:text-white mt-2">
              {nextVisit ? new Date(nextVisit.date).toLocaleDateString() : 'No visit scheduled'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              <span>{nextVisit ? `${nextVisit.time} — ${nextVisit.doctor?.firstName ? `Dr. ${nextVisit.doctor.firstName} ${nextVisit.doctor.lastName}` : 'General'}` : 'Book a visit to get started'}</span>
            </div>
          </div>

          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Prescriptions</span>
              <Pill className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-2">
              {prescriptions.length} Scripts
            </div>
            <div className="text-[10px] text-emerald-500 mt-1">
              <span>All refills approved</span>
            </div>
          </div>

          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Outstanding Balance</span>
              <DollarSign className="h-5 w-5 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-2">
              ₹{outstandingBalance.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-rose-500 mt-1">
              <span>Pay online anytime</span>
            </div>
          </div>

          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Health Records</span>
              <FileHeart className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-2">
              {history.length} Entries
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              <span>HIPAA encrypted records</span>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Prescription list & general info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Prescription List */}
        <div className="lg:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm">
          <h3 className="font-display font-semibold text-slate-800 dark:text-white mb-4">Active Refill & Prescription Log</h3>
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              ))}
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-12 text-slate-450 text-xs">
              No prescriptions found.
            </div>
          ) : (
            <div className="space-y-4">
              {prescriptions.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10 transition-colors">
                  <div className="flex gap-3 items-center">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <Pill className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{p.medicineName || p.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Strength: {p.strength} | Status: {p.status}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{p.frequency || 'Once daily'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Duration: {p.duration || 'Daily'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Health Advisory Panel */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <h3 className="font-display font-semibold text-slate-800 dark:text-white">Advisory Alert</h3>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs leading-relaxed text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
            Keep your health parameters tracked regularly. Submit your vitals like Blood Pressure and Heart Rate to assist clinical diagnostic flows.
          </div>
          <button className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold py-2 px-4 rounded-xl text-slate-500 hover:text-slate-700 transition-all">
            <span>Submit Vitals Logs</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
