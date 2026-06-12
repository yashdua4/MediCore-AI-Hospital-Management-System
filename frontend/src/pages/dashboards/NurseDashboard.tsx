import React from 'react';
import { Bed, Heart, Droplet, User, CheckCircle2, ShieldAlert, Calendar } from 'lucide-react';
import {
  useIpdActiveAdmissionsQuery,
  useIpdTelemetryQuery,
} from '../../hooks/useDashboardData';

export const NurseDashboard: React.FC = () => {
  const { data: admissions = [], isLoading: loadingAdmissions } = useIpdActiveAdmissionsQuery();
  const { data: ipdTelemetry, isLoading: loadingTelemetry } = useIpdTelemetryQuery();

  const isLoading = loadingAdmissions || loadingTelemetry;

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Nurse Ward Console</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Real-time bed tracking, active admissions checkboards, and medication task updates.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : (
        /* Ward Status Summaries */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-500">
              <Bed className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Beds Census</div>
              <div className="text-lg font-bold font-display text-slate-800 dark:text-white mt-0.5">
                {ipdTelemetry?.occupiedBeds || admissions.length} / {ipdTelemetry?.totalBeds || 20} Occupied
              </div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Telemetry Status</div>
              <div className="text-lg font-bold font-display text-slate-800 dark:text-white mt-0.5">
                {ipdTelemetry?.occupancyRate || 0}% Occupancy
              </div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
              <Droplet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Avg Length of Stay</div>
              <div className="text-lg font-bold font-display text-slate-800 dark:text-white mt-0.5">
                {ipdTelemetry?.averageLengthOfStayDays || 0} Days
              </div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Daily admissions</div>
              <div className="text-lg font-bold font-display text-slate-800 dark:text-white mt-0.5">
                +{ipdTelemetry?.dailyAdmissionsCount || 0} today
              </div>
            </div>
          </div>
        </div>
      )}

      {/* bed status visual grid */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm">
        <h3 className="font-display font-semibold text-slate-800 dark:text-white mb-4">Ward Bed Allocation Map</h3>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
            ))}
          </div>
        ) : admissions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No patients currently admitted to any wards.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            {admissions.map((admission: any) => {
              const bedAssignment = admission.bedAssignments?.[0];
              const bed = bedAssignment?.bed;
              const room = bed?.room;
              const ward = room?.ward;

              const wardLabel = ward?.name || 'General Ward';
              const roomLabel = room?.roomNumber || 'Room —';
              const bedLabel = bed?.bedNumber || 'Bed —';

              return (
                <div
                  key={admission.id}
                  className="p-4 border border-emerald-500/25 bg-emerald-500/[0.02] dark:bg-emerald-950/[0.05] rounded-2xl flex flex-col justify-between min-h-[140px] transition hover:scale-[1.01]"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                      {wardLabel} - {roomLabel} ({bedLabel})
                    </span>
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                  </div>

                  <div className="my-2.5">
                    <div className="text-xs font-semibold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>{admission.patient.firstName} {admission.patient.lastName}</span>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Admitted: {new Date(admission.admissionDate).toLocaleDateString()}</span>
                    </div>
                    {admission.doctor && (
                      <div className="mt-1 text-[10px] text-slate-500">
                        Physician: <span className="font-semibold text-slate-600 dark:text-slate-400">Dr. {admission.doctor.firstName} {admission.doctor.lastName}</span>
                      </div>
                    )}
                  </div>

                  <button className="w-full text-center py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[9px] font-bold text-slate-600 dark:text-slate-300 transition-colors mt-1">
                    Log Vitals
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
