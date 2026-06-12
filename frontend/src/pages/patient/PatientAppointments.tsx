import React, { useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  usePatientsQuery,
  useAppointmentsQuery,
  useDoctorsQuery,
  useBookAppointmentMutation,
  useRescheduleAppointmentMutation,
  useCancelAppointmentMutation,
} from '../../hooks/useDashboardData';
import { Calendar, Clock, Plus, RefreshCw, X, AlertTriangle, CheckCircle, Search } from 'lucide-react';

export const PatientAppointments: React.FC = () => {
  const { user } = useAuthStore();
  const { data: patientsData } = usePatientsQuery();

  const activePatient = useMemo(() => {
    if (!patientsData?.patients) return null;
    return patientsData.patients.find((p: any) => p.userId === user?.id) || patientsData.patients[0];
  }, [patientsData, user]);

  const patientId = activePatient?.id;

  const { data: appointments = [], isLoading, refetch } = useAppointmentsQuery(patientId ? { patientId } : {});
  const { data: doctorsData } = useDoctorsQuery({ limit: 50 });

  const bookMutation = useBookAppointmentMutation();
  const cancelMutation = useCancelAppointmentMutation();
  const rescheduleMutation = useRescheduleAppointmentMutation();

  // State
  const [showBookModal, setShowBookModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState<any>(null);

  // Form states
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [apptDuration, setApptDuration] = useState(30);
  const [apptNotes, setApptNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!selectedDoctorId || !apptDate || !apptTime) {
      setErrorMsg('Please complete all mandatory appointment parameters.');
      return;
    }

    try {
      await bookMutation.mutateAsync({
        patientId: patientId!,
        doctorId: selectedDoctorId,
        date: apptDate,
        time: apptTime,
        duration: apptDuration,
        notes: apptNotes,
      });
      setSuccessMsg('Appointment requested successfully!');
      setShowBookModal(false);
      setSelectedDoctorId('');
      setApptDate('');
      setApptTime('');
      setApptNotes('');
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to book appointment.');
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
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
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to cancel appointment.');
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!rescheduleDate || !rescheduleTime) {
      setErrorMsg('Please select a valid date and time.');
      return;
    }
    try {
      await rescheduleMutation.mutateAsync({
        id: showRescheduleModal.id,
        date: rescheduleDate,
        time: rescheduleTime,
        reason: rescheduleReason,
      });
      setShowRescheduleModal(null);
      setRescheduleDate('');
      setRescheduleTime('');
      setRescheduleReason('');
      refetch();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to reschedule.');
    }
  };

  const activeAppointments = useMemo(() => {
    return appointments.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appointments]);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-indigo-500" />
            Appointments Manager
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Book slots, request reschedules, and check clinical consult schedules.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowBookModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Book Consult Slot
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center gap-2 text-xs">
          <AlertTriangle className="h-4.5 w-4.5" />
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
      ) : activeAppointments.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-slate-450 text-xs">
          No appointments recorded in system registry. Click Book Consult Slot above to schedule one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeAppointments.map((appt: any) => (
            <div
              key={appt.id}
              className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100">
                    Dr. {appt.doctor?.firstName} {appt.doctor?.lastName}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                    {appt.doctor?.specialization?.name || appt.doctor?.department?.name || 'General Practitioner'}
                  </span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    appt.status === 'CONFIRMED'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : appt.status === 'REQUESTED'
                      ? 'bg-amber-500/10 text-amber-500'
                      : appt.status === 'CANCELLED'
                      ? 'bg-rose-500/10 text-rose-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {appt.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>{new Date(appt.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>{appt.time} ({appt.duration} min)</span>
                </div>
              </div>

              {appt.notes && (
                <p className="text-[11px] text-slate-450 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850 truncate italic">
                  "{appt.notes}"
                </p>
              )}

              {/* Action Buttons */}
              {['REQUESTED', 'CONFIRMED', 'RESCHEDULED'].includes(appt.status) && (
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                  <button
                    onClick={() => setShowRescheduleModal(appt)}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-400 transition-colors"
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={() => setShowCancelModal(appt)}
                    className="px-3 py-1.5 border border-rose-500/20 hover:bg-rose-500/10 text-rose-500 rounded-lg text-[11px] font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Booking Dialog Modal */}
      {showBookModal && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => setShowBookModal(false)}
              className="absolute right-4 top-4 p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-white mb-4">Book New Appointment</h3>
            <form onSubmit={handleBook} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Select Consultant Doctor *</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  required
                >
                  <option value="" className="dark:bg-slate-900">-- Choose Consultant --</option>
                  {doctorsData?.doctors?.map((doc: any) => (
                    <option key={doc.id} value={doc.id} className="dark:bg-slate-900">
                      Dr. {doc.firstName} {doc.lastName} ({doc.department?.name || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Date *</label>
                  <input
                    type="date"
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Time *</label>
                  <input
                    type="time"
                    value={apptTime}
                    onChange={(e) => setApptTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Duration (Minutes)</label>
                <select
                  value={apptDuration}
                  onChange={(e) => setApptDuration(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value={15} className="dark:bg-slate-900">15 min</option>
                  <option value={30} className="dark:bg-slate-900">30 min</option>
                  <option value={45} className="dark:bg-slate-900">45 min</option>
                  <option value={60} className="dark:bg-slate-900">60 min</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Patient Symptoms/Notes</label>
                <textarea
                  value={apptNotes}
                  onChange={(e) => setApptNotes(e.target.value)}
                  placeholder="Reason for consultation..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-slate-600 dark:text-slate-450 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {bookMutation.isPending ? 'Submitting...' : 'Request Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Dialog Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => setShowRescheduleModal(null)}
              className="absolute right-4 top-4 p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-white mb-4">Reschedule Appointment</h3>
            <form onSubmit={handleReschedule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">New Date *</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">New Time *</label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Reason for Rescheduling</label>
                <textarea
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Reason..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-slate-600 dark:text-slate-450 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {rescheduleMutation.isPending ? 'Rescheduling...' : 'Submit Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => setShowCancelModal(null)}
              className="absolute right-4 top-4 p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-display font-semibold text-rose-500 mb-2">Cancel Appointment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to cancel your consultation slot with Dr. {showCancelModal.doctor?.firstName} {showCancelModal.doctor?.lastName}?
            </p>
            <form onSubmit={handleCancel} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold font-medium">Reason for Cancellation</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Brief reason for cancellation..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3.5 py-2 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none h-16 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-slate-600 dark:text-slate-450 font-semibold"
                >
                  Keep Slot
                </button>
                <button
                  type="submit"
                  disabled={cancelMutation.isPending}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
