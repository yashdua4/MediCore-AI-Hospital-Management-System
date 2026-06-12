import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldCheck, TrendingUp, Users, Clock, DollarSign, Activity } from 'lucide-react';
import {
  useIpdTelemetryQuery,
  useBillingRevenueQuery,
  usePatientsQuery,
  useDoctorsQuery,
  useEmergencyDashboardQuery,
} from '../../hooks/useDashboardData';

export const ExecutiveDashboard: React.FC = () => {
  // Query live metrics
  const { data: ipdTelemetry, isLoading: loadingIpd } = useIpdTelemetryQuery();
  const { data: billingRevenue, isLoading: loadingBilling } = useBillingRevenueQuery();
  const { data: patientsData, isLoading: loadingPatients } = usePatientsQuery({ limit: 1 });
  const { data: doctorsData, isLoading: loadingDoctors } = useDoctorsQuery({ limit: 1 });
  const { data: emergencyDashboard, isLoading: loadingEmergency } = useEmergencyDashboardQuery();

  const isLoading = loadingIpd || loadingBilling || loadingPatients || loadingDoctors || loadingEmergency;

  // Chart data formatting
  const trendData = useMemo(() => {
    if (!billingRevenue?.revenueTrends) {
      return [
        { day: 'Mon', revenue: 0 },
        { day: 'Tue', revenue: 0 },
        { day: 'Wed', revenue: 0 },
        { day: 'Thu', revenue: 0 },
        { day: 'Fri', revenue: 0 },
      ];
    }
    return billingRevenue.revenueTrends.map((t: any) => {
      const dateParts = t.date.split('-');
      const day = `${dateParts[1] || ''}/${dateParts[2] || ''}`;
      return {
        day,
        revenue: t.revenue,
      };
    });
  }, [billingRevenue]);

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Executive Operations</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Real-time clinical census, financial trends, and capacity indicators.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : (
        /* Analytics Overview Metrics */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Census</span>
              <Users className="h-5 w-5 text-violet-500" />
            </div>
            <div className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-2">
              {ipdTelemetry?.occupiedBeds || 0} / {ipdTelemetry?.totalBeds || 0}
            </div>
            <div className="text-[10px] text-emerald-500 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>{ipdTelemetry?.occupancyRate || 0}% Bed Occupancy Rate</span>
            </div>
          </div>

          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Monthly Revenue</span>
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-2">
              ₹{(billingRevenue?.monthlyRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-500 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>Outstanding: ₹{(billingRevenue?.outstandingPayments || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">ER Emergencies</span>
              <Activity className="h-5 w-5 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-2">
              {emergencyDashboard?.activeCasesCount || 0} Cases
            </div>
            <div className="text-[10px] text-emerald-500 flex items-center gap-1 mt-1">
              <span>{emergencyDashboard?.activeAlerts?.length || 0} Critical Code warnings</span>
            </div>
          </div>

          <div className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Hospital Roster</span>
              <ShieldCheck className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-2">
              {doctorsData?.total || 0} Doctors
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              <span>{patientsData?.total || 0} Total patients registered</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Charts & Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recharts Area Chart Container */}
        <div className="lg:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-5">
          <h3 className="font-display font-semibold text-slate-800 dark:text-white mb-4">Hospital Revenue Trend (Past 7 Days)</h3>
          <div className="h-72">
            {isLoading ? (
              <div className="w-full h-full bg-slate-50 dark:bg-slate-950 animate-pulse rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--role-patient))" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(var(--role-patient))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--role-patient))" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue (₹)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Department Census Panel */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-5 flex flex-col">
          <h3 className="font-display font-semibold text-slate-800 dark:text-white mb-3">IPD Wards Occupancy</h3>
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 w-1/3 rounded" />
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full" />
                </div>
              ))
            ) : ipdTelemetry?.wardUtilization?.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-8">No active ward admissions.</div>
            ) : (
              ipdTelemetry?.wardUtilization?.map((ward: any) => {
                const ratio = ward.utilizationRate;
                return (
                  <div key={ward.wardId} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{ward.wardName} ({ward.wardType})</span>
                      <span className="text-slate-400">{ward.occupancy} / {ward.capacity} Beds</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ratio > 85 ? 'bg-rose-500' : ratio > 65 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
