import React, { useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  useDoctorsQuery,
  useAppointmentsQuery,
  useUpdateAppointmentStatusMutation,
  useCancelAppointmentMutation,
  useRescheduleAppointmentMutation,
} from '../../hooks/useDashboardData';
import { Calendar, Clock, Check, X, RefreshCw, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

export const DoctorAppointments: React.FC = () => {
  const { user } = useAuthStore();
  const { data: doctorsData } = useDoctorsQuery({ limit: 50 });

  const activeDoctor = useMemo(() => {
    if (!doctorsData?.doctors) return null;
    return doctorsData.doctors.find((d: any) => d.userId === user?.id) || doctorsData.doctors[0];
  }, [doctorsData, user]);

  const doctorId = activeDoctor?.id;

  const { data: appointments = [], isLoading, refetch } = useAppointmentsQuery(doctorId ? { doctorId } : {});

  const statusMutation = useUpdateAppointmentStatusMutation();
  const cancelMutation = useCancelAppointmentMutation();
  const rescheduleMutation = useRescheduleAppointmentMutation();

  // State
  const [showCancelModal, setShowCancelModal] = useState<any>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [resDate, setResDate] = useState('');
  const [resTime, setResTime] = useState('');
  const [resReason, setResReason] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleApprove = async (apptId: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await statusMutation.mutateAsync({
        id: apptId,
        status: 'CONFIRMED',
      });
      setSuccessMsg('Appointment approved successfully.');
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Approval failed.');
    }
  };

  const handleStatusChange = async (apptId: string, status: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await statusMutation.mutateAsync({
        id: apptId,
        status,
      });
      setSuccessMsg(`Appointment status transitioned to ${status}.`);
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Status transition failed.');
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await cancelMutation.mutateAsync({
        id: showCancelModal.id,
        reason: cancelReason,
      });
      setShowCancelModal(null);
      setCancelReason('');
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Cancellation failed.');
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!resDate || !resTime) {
      setErrorMsg('Please select date and time.');
      return;
    }
    try {
      await rescheduleMutation.mutateAsync({
        id: showRescheduleModal.id,
        date: resDate,
        time: resTime,
        reason: resReason,
      });
      setShowRescheduleModal(null);
      setResDate('');
      setResTime('');
      setResReason('');
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Reschedule failed.');
    }
  };

  const pendingRequests = useMemo(() => {
    return appointments.filter((a: any) => a.status === 'REQUESTED');
  }, [appointments]);

  const activeQueue = useMemo(() => {
    return appointments.filter((a: any) => a.status !== 'REQUESTED' && a.status !== 'CANCELLED' && a.status !== 'COMPLETED');
  }, [appointments]);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-indigo-500" />
            Consultation Scheduling Desk
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your clinical queue, approve consultations, and update status.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center gap-2 text-xs">
          <AlertCircle className="h-4.5 w-4.5" />
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center gap-2 text-xs">
          <CheckCircle className="h-4.5 w-4.5" />
          {successMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Consultation Queue */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Active Consult Queue</h3>
            {activeQueue.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-slate-400 text-xs">
                No active consults scheduled.
              </div>
            ) : (
              <div className="space-y-3">
                {activeQueue.map((appt: any) => (
                  <div key={appt.id} className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                          {appt.patient?.firstName} {appt.patient?.lastName}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Registry ID: {appt.patientId?.slice(0, 8)} | Sex: {appt.patient?.gender}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-bold uppercase">
                        {appt.status}
                      </span>
                    </div>

                    <div className="flex gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1"><Calendar className="h-4 w-4 text-slate-400" /> {new Date(appt.date).toLocaleDateString()}</div>
                      <div className="flex items-center gap-1"><Clock className="h-4 w-4 text-slate-400" /> {appt.time} ({appt.duration} min)</div>
                    </div>

                    {appt.notes && (
                      <p className="text-[10px] text-slate-450 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl italic">
                        "{appt.notes}"
                      </p>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850 text-[11px]">
                      {appt.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'CHECKED_IN')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                        >
                          Check In
                        </button>
                      )}
                      {appt.status === 'CHECKED_IN' && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'IN_CONSULTATION')}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold"
                        >
                          Start Consult
                        </button>
                      )}
                      {appt.status === 'IN_CONSULTATION' && (
                        <button
                          onClick={() => handleStatusChange(appt.id, 'COMPLETED')}
                          className="px-2.5 py-1 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg font-semibold"
                        >
                          Complete Consult
                        </button>
                      )}
                      <button
                        onClick={() => setShowRescheduleModal(appt)}
                        className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-slate-500 font-semibold"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => setShowCancelModal(appt)}
                        className="px-2.5 py-1 border border-rose-500/10 hover:bg-rose-500/5 text-rose-500 rounded-lg font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Approval Requests */}
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-slate-800 dark:text-white text-sm">Pending Requests</h3>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-slate-400 text-xs">
                No pending requests.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((appt: any) => (
                  <div key={appt.id} className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-xs">
                          {appt.patient?.firstName} {appt.patient?.lastName}
                        </h4>
                        <span className="text-[9px] text-slate-450 mt-0.5 block">
                          Date: {new Date(appt.date).toLocaleDateString()} at {appt.time}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleApprove(appt.id)}
                          className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-600 rounded-lg"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setShowCancelModal(appt)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/25 text-rose-500 rounded-lg"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancellation Dialog Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative animate-scale-in">
            <button onClick={() => setShowCancelModal(null)} className="absolute right-4 top-4 p-1 rounded-md text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-display font-semibold text-rose-500 mb-2">Cancel Appointment</h3>
            <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Cancellation Reason</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-rose-500 focus:outline-none h-16 resize-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCancelModal(null)} className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold">Submit Cancellation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rescheduling Dialog Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative animate-scale-in">
            <button onClick={() => setShowRescheduleModal(null)} className="absolute right-4 top-4 p-1 rounded-md text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-white mb-4">Reschedule Appointment</h3>
            <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold font-medium">New Date *</label>
                  <input
                    type="date"
                    value={resDate}
                    onChange={(e) => setResDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-850 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold font-medium">New Time *</label>
                  <input
                    type="time"
                    value={resTime}
                    onChange={(e) => setResTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-850 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Reason for Rescheduling</label>
                <textarea
                  value={resReason}
                  onChange={(e) => setResReason(e.target.value)}
                  placeholder="Reason..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-850 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none h-16 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowRescheduleModal(null)} className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold">Reschedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
