import React, { useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePatientsQuery, usePatientMedicalHistoryQuery, usePatientTimelineQuery } from '../../hooks/useDashboardData';
import { ShieldCheck, HeartPulse, FileText, Activity, AlertCircle, RefreshCw } from 'lucide-react';

export const PatientEMR: React.FC = () => {
  const { user } = useAuthStore();
  const { data: patientsData, isLoading: loadingPatients } = usePatientsQuery();

  const activePatient = useMemo(() => {
    if (!patientsData?.patients) return null;
    return patientsData.patients.find((p: any) => p.userId === user?.id) || patientsData.patients[0];
  }, [patientsData, user]);

  const patientId = activePatient?.id;

  const { data: history = [], isLoading: loadingHistory, refetch: refetchHistory } = usePatientMedicalHistoryQuery(patientId);
  const { data: timeline = [], isLoading: loadingTimeline, refetch: refetchTimeline } = usePatientTimelineQuery(patientId);

  const handleRefresh = () => {
    refetchHistory();
    refetchTimeline();
  };

  const isLoading = loadingPatients || loadingHistory || loadingTimeline;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!activePatient) {
    return (
      <div className="text-center py-12 text-slate-500">
        No active patient profile was found. Please register in the system.
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HeartPulse className="h-6 w-6 text-emerald-500" />
            Electronic Health Record (EHR)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Secure HIPAA-encrypted portal of your clinical timeline, conditions, and vitals.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Timeline Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <h2 className="text-lg font-display font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              Clinical Timeline & History
            </h2>

            {timeline.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-650 text-xs">
                No medical events logged in your timeline.
              </div>
            ) : (
              <div className="relative border-l border-slate-200 dark:border-slate-800 pl-6 space-y-8 ml-2">
                {timeline.map((event: any, idx: number) => (
                  <div key={idx} className="relative group">
                    {/* Circle bullet */}
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-emerald-500 bg-white dark:bg-slate-900 group-hover:scale-125 transition-transform" />

                    <div>
                      <div className="flex items-center justify-between gap-4">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                          {event.title}
                        </h4>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {new Date(event.timestamp || event.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-405 mt-1 leading-relaxed">
                        {event.description}
                      </p>
                      {event.notes && (
                        <div className="mt-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-850 italic">
                          "{event.notes}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side Panel: Vitals, Conditions & Allergies */}
        <div className="space-y-6">
          {/* Latest Vitals */}
          <div className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <h3 className="text-sm font-display font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-rose-500" />
              Latest Vital Readings
            </h3>

            {activePatient.vitals && activePatient.vitals.length > 0 ? (
              <div className="space-y-3">
                {activePatient.vitals.slice(0, 3).map((v: any, idx: number) => (
                  <div key={idx} className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/10">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mb-2">
                      <span className="font-semibold">Reading #{idx + 1}</span>
                      <span>{new Date(v.recordedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400">BP: </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{v.bloodPressure}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">HR: </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{v.heartRate} bpm</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Temp: </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{v.temperature} °C</span>
                      </div>
                      <div>
                        <span className="text-slate-400">SpO2: </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{v.oxygenSaturation}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 dark:text-slate-650 text-xs">
                No vitals registered.
              </div>
            )}
          </div>

          {/* Clinical Conditions */}
          <div className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <h3 className="text-sm font-display font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
              Active Diagnostics
            </h3>

            {activePatient.conditions && activePatient.conditions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activePatient.conditions.map((c: any, idx: number) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      c.severity === 'SEVERE'
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-550/20'
                        : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    }`}
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 dark:text-slate-650 text-xs">
                No active clinical diagnoses recorded.
              </div>
            )}
          </div>

          {/* Allergies */}
          <div className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <h3 className="text-sm font-display font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 text-amber-500" />
              Drug & Allergen Indices
            </h3>

            {activePatient.allergies && activePatient.allergies.length > 0 ? (
              <div className="space-y-2.5">
                {activePatient.allergies.map((a: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-xl bg-amber-500/5 border border-amber-550/10 text-amber-600 dark:text-amber-400">
                    <span className="font-semibold">{a.allergen}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20">{a.severity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 dark:text-slate-650 text-xs">
                No allergies on record (NKA).
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
