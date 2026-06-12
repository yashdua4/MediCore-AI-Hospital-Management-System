import React, { useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePatientsQuery, useLabOrdersQuery } from '../../hooks/useDashboardData';
import { FlaskConical, Calendar, ShieldCheck, ShieldAlert, ArrowUpRight, Search, RefreshCw } from 'lucide-react';

export const PatientLabReports: React.FC = () => {
  const { user } = useAuthStore();
  const { data: patientsData } = usePatientsQuery();

  const activePatient = useMemo(() => {
    if (!patientsData?.patients) return null;
    return patientsData.patients.find((p: any) => p.userId === user?.id) || patientsData.patients[0];
  }, [patientsData, user]);

  const patientId = activePatient?.id;

  const { data: labOrders = [], isLoading, refetch } = useLabOrdersQuery(patientId ? { patientId } : {});

  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = useMemo(() => {
    return labOrders.filter((o: any) =>
      o.test?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [labOrders, searchTerm]);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-emerald-500" />
            Laboratory Assays & Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access active pathology, chemistry, and hematology panel results.
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

      <div className="flex items-center gap-3 max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter by lab test or order number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-350 focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-slate-450 text-xs">
          No laboratory reports found in your record.
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order: any) => (
            <div
              key={order.id}
              className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-850">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-display font-semibold text-slate-850 dark:text-slate-100">
                      {order.test?.name}
                    </h3>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-405 font-semibold px-2 py-0.5 rounded-md">
                      {order.test?.code}
                    </span>
                  </div>
                  <div className="flex gap-4 text-[10px] text-slate-400 mt-1.5 font-medium">
                    <span>Order: #{order.orderNumber}</span>
                    <span>Category: {order.test?.category?.name || 'General'}</span>
                    <span>Ordered: {new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      order.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : order.status === 'CANCELLED'
                        ? 'bg-rose-500/10 text-rose-500'
                        : 'bg-amber-500/10 text-amber-500 animate-pulse'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Lab Results Values */}
              {order.status === 'COMPLETED' && order.results?.length > 0 ? (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 font-semibold text-left">
                        <th className="py-2.5 px-3">Parameter Assay</th>
                        <th className="py-2.5 px-3 text-center">Observed Value</th>
                        <th className="py-2.5 px-3 text-center">Reference Range</th>
                        <th className="py-2.5 px-3 text-right font-bold">Status Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-850/50">
                      {order.results.map((res: any) => (
                        <tr key={res.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-350">{res.parameter}</td>
                          <td className="py-3 px-3 text-center text-slate-800 dark:text-slate-100 font-bold">{res.value} {res.unit}</td>
                          <td className="py-3 px-3 text-center text-slate-450 dark:text-slate-400 italic">{res.referenceRange || 'N/A'}</td>
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold text-[10px] tracking-wider ${
                                res.flag === 'CRITICAL'
                                  ? 'bg-rose-500/10 text-rose-500 animate-pulse'
                                  : res.flag === 'HIGH' || res.flag === 'LOW'
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : 'bg-emerald-500/10 text-emerald-500'
                              }`}
                            >
                              {res.flag === 'CRITICAL' && <ShieldAlert className="h-3 w-3" />}
                              {res.flag === 'NORMAL' && <ShieldCheck className="h-3 w-3" />}
                              {res.flag}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {order.approvedByUser && (
                    <div className="text-[10px] text-slate-400 text-right mt-3 font-medium">
                      Report verified by: <span className="font-semibold text-slate-500 dark:text-slate-350">{order.approvedByUser.email}</span> on {new Date(order.updatedAt).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              ) : order.status === 'COMPLETED' ? (
                <div className="text-center py-4 text-slate-400 dark:text-slate-650 text-xs">
                  Awaiting parameter transcription.
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                    <FlaskConical className="h-4.5 w-4.5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Processing Diagnostic Assays</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-405 mt-0.5">
                      Your sample is in queue at pathology processing station. Results appear immediately upon pathologist verification.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
