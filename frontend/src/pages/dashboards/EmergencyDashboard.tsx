import React, { useMemo } from 'react';
import { AlertTriangle, Clock, ShieldAlert, Zap, Activity, CheckCircle2 } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import {
  useEmergencyDashboardQuery,
  useEmergencyAnalyticsQuery,
} from '../../hooks/useDashboardData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import { DataTable, Column } from '../../components/DataTable';

interface TriageQueueItem {
  id: string;
  caseNumber: string;
  patientId: string;
  patientName: string;
  arrivalTime: string;
  chiefComplaint: string;
  triageLevel: string | null;
  status: string;
}

export const EmergencyDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  // 1. Fetch live ER telemetry and analytics
  const { data: dashboard, isLoading: loadingDashboard } = useEmergencyDashboardQuery();
  const { data: analytics, isLoading: loadingAnalytics } = useEmergencyAnalyticsQuery();

  const getTriageBadge = (triage: string | null) => {
    if (!triage) return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">Unassessed</span>;
    switch (triage) {
      case 'LEVEL_1_CRITICAL':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse">Code Red</span>;
      case 'LEVEL_2_EMERGENCY':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Level 2 Shock</span>;
      case 'LEVEL_3_URGENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">Urgent</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Stable</span>;
    }
  };

  // 2. Trigger Code Red mutation
  const triggerCodeRedMutation = useMutation({
    mutationFn: async (caseId: string) => {
      await apiClient.post(`/emergency/${caseId}/alerts`, {
        alertType: 'SEVERE_TRAUMA',
        notes: 'Code Red triggered manually from Emergency Dashboard',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-dashboard'] });
      addNotification({
        title: 'CRITICAL TRAUMA ALERT',
        message: 'Trauma Surgeon needed immediately in ER. Level 1 shock alert dispatched.',
        type: 'critical',
        actionUrl: '/dashboard/emergency',
      });
    },
  });

  const handleTriggerCodeRed = () => {
    const activeCase = dashboard?.triageQueue?.[0];
    if (activeCase) {
      triggerCodeRedMutation.mutate(activeCase.id);
    } else {
      addNotification({
        title: 'ER CONTROL STATUS',
        message: 'No en route cases found to assign code red. Status normal.',
        type: 'info',
        actionUrl: '/dashboard/emergency',
      });
    }
  };

  const criticalCasesCount = useMemo(() => {
    if (!dashboard?.triageQueue) return 0;
    return dashboard.triageQueue.filter(
      (c: any) => c.triageLevel === 'LEVEL_1_CRITICAL' || c.triageLevel === 'LEVEL_2_EMERGENCY'
    ).length;
  }, [dashboard]);

  // Columns for DataTable
  const columns: Column<TriageQueueItem>[] = [
    {
      header: 'Case ID',
      accessor: (row) => <span className="font-mono font-semibold">{row.caseNumber}</span>,
      sortable: true,
      sortKey: 'caseNumber',
    },
    {
      header: 'Patient Name',
      accessor: (row) => <span className="font-semibold text-slate-850 dark:text-slate-200">{row.patientName}</span>,
      sortable: true,
      sortKey: 'patientName',
    },
    {
      header: 'Triage Priority',
      accessor: (row) => getTriageBadge(row.triageLevel),
      sortable: true,
      sortKey: 'triageLevel',
    },
    {
      header: 'Arrival Time',
      accessor: (row) => <span>{new Date(row.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>,
      sortable: true,
      sortKey: 'arrivalTime',
    },
    {
      header: 'Chief Complaint',
      accessor: (row) => <span className="truncate max-w-[250px] block">{row.chiefComplaint}</span>,
    },
    {
      header: 'Status',
      accessor: (row) => <span className="capitalize">{row.status.toLowerCase().replace('_', ' ')}</span>,
    },
    {
      header: 'Actions',
      accessor: () => (
        <div className="text-right">
          <button className="px-2.5 py-1 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-550 dark:text-slate-300 rounded-lg transition-colors">
            Assign Clinician
          </button>
        </div>
      ),
    },
  ];

  const isLoading = loadingDashboard || loadingAnalytics;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Emergency Control</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Real-time triage telemetry, trauma notifications, and ambulance tracking.</p>
        </div>
        <button
          onClick={handleTriggerCodeRed}
          disabled={triggerCodeRedMutation.isPending}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-all shadow-md shadow-rose-500/15 disabled:opacity-50"
        >
          <Zap className="h-4 w-4" />
          <span>Trigger Code Red</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : (
        /* Emergency telemetry stats */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border border-rose-200 dark:border-rose-950/30 bg-rose-50/10 dark:bg-rose-950/10 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Critical Cases</div>
              <div className="text-lg font-bold font-display text-rose-500 mt-0.5">{criticalCasesCount} Active</div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Avg Triage Wait</div>
              <div className="text-lg font-bold font-display text-slate-800 dark:text-white mt-0.5">{analytics?.averageResponseTimeMinutes || 6.2} mins</div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Trauma Volume</div>
              <div className="text-lg font-bold font-display text-slate-800 dark:text-white mt-0.5">{analytics?.traumaVolume || 0} Total</div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Active ER Alert Queue</div>
              <div className="text-lg font-bold font-display text-slate-800 dark:text-white mt-0.5">{dashboard?.activeAlerts?.length || 0} Alerts</div>
            </div>
          </div>
        </div>
      )}

      {/* ER Triage queue Table */}
      <div className="p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
        <h3 className="font-display font-semibold text-slate-800 dark:text-white mb-4">Incoming & Active ER Queue</h3>
        <DataTable
          data={dashboard?.triageQueue || []}
          columns={columns}
          searchPlaceholder="Search triage queue..."
          searchKeys={['patientName', 'chiefComplaint']}
          exportFileName="er_triage_queue"
        />
      </div>
    </div>
  );
};
