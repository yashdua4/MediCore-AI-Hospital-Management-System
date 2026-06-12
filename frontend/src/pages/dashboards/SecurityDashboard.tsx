import React, { useMemo } from 'react';
import { ShieldCheck, AlertTriangle, UserCheck, Key, RefreshCw, CheckCircle2 } from 'lucide-react';
import {
  useSecurityTelemetryQuery,
} from '../../hooks/useDashboardData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import { SecurityEvent, AuditLog } from '../../types';

export const SecurityDashboard: React.FC = () => {
  const queryClient = useQueryClient();

  // 1. Fetch consolidated security metrics
  const { data: telemetry, isLoading, refetch } = useSecurityTelemetryQuery();

  // 2. Resolve incident mutation
  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.put(`/security/events/${id}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-telemetry'] });
    },
  });

  const handleResolveIncident = (id: string) => {
    resolveMutation.mutate(id);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">Critical</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20">High</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">Low</span>;
    }
  };

  // Safely extract data from payload
  const metrics = telemetry?.metrics;
  const recentEvents = telemetry?.recentEvents || [];
  const recentAudits = telemetry?.recentAudits || [];

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Security & Audit Center</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Real-time session authorization checks, lockouts tracking, and audit trails.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-xl transition-all shadow-md"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit Logs</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : (
        /* Security Telemetry Panels */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Active Incidents</div>
              <div className="text-lg font-bold font-display text-slate-800 dark:text-white mt-0.5">
                {metrics?.securityEventsCount?.unresolved || 0} Warning
              </div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Locked Accounts</div>
              <div className="text-lg font-bold font-display text-slate-800 dark:text-white mt-0.5">
                {metrics?.lockedAccountsCount || 0} Locked
              </div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Active Logins</div>
              <div className="text-lg font-bold font-display text-slate-800 dark:text-white mt-0.5">
                {metrics?.activeSessionsCount || 0} Sessions
              </div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Audit Compliance</div>
              <div className="text-lg font-bold font-display text-slate-800 dark:text-white mt-0.5">100% HIPAA</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Resolution panel */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-5 flex flex-col shadow-sm">
          <h3 className="font-display font-semibold text-slate-800 dark:text-white mb-4">Security Incidents Feed</h3>
          <div className="space-y-4 overflow-y-auto flex-1 max-h-[350px] pr-1">
            {isLoading ? (
              <div className="text-xs text-slate-400">Loading incident queue...</div>
            ) : recentEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No unresolved security events.</div>
            ) : (
              recentEvents.map((inc: any) => (
                <div key={inc.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(inc.severity || 'LOW')}
                      <span className="text-[10px] text-slate-400">{new Date(inc.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{inc.eventType}</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{inc.description}</p>
                    <div className="text-[9px] text-slate-400 font-mono">Source IP: {inc.ipAddress}</div>
                  </div>
                  <div>
                    {inc.resolved ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Resolved</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleResolveIncident(inc.id)}
                        disabled={resolveMutation.isPending}
                        className="px-2.5 py-1 text-[9px] font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-lg transition-colors shadow-sm"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Log Stream */}
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-5 flex flex-col shadow-sm">
          <h3 className="font-display font-semibold text-slate-800 dark:text-white mb-4">Real-Time Audit Trail</h3>
          <div className="space-y-3 overflow-y-auto flex-1 max-h-[350px] pr-1 font-mono text-[10px]">
            {isLoading ? (
              <div className="text-xs text-slate-450">Loading audit trail...</div>
            ) : recentAudits.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No audit logs recorded.</div>
            ) : (
              recentAudits.map((audit: any) => (
                <div key={audit.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 flex items-start gap-3">
                  <div className="p-1 rounded bg-slate-200 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold uppercase text-[9px]">
                    {audit.action.split('_')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-[9px] text-slate-400">
                      <span className="truncate font-semibold text-slate-600 dark:text-slate-300">
                        {audit.userEmail || (audit.user ? audit.user.email : 'System')}
                      </span>
                      <span>{new Date(audit.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-slate-800 dark:text-slate-250 truncate mt-1">
                      Resource: <span className="text-indigo-400 font-semibold">{audit.resource}</span> | {audit.details}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">IP: {audit.ipAddress}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
