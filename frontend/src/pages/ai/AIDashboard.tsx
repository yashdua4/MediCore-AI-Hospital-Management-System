import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Sparkles, MessageSquare, ThumbsUp, Activity, BarChart2, ShieldAlert } from 'lucide-react';
import { useAiTelemetryQuery } from '../../hooks/useAIData';

export const AIDashboard: React.FC = () => {
  const { data: telemetry, isLoading, error } = useAiTelemetryQuery();

  // Chart data formatting
  const dailyRequestsData = useMemo(() => {
    if (!telemetry?.dailyRequests) return [];
    return telemetry.dailyRequests.map((d: any) => {
      const parts = d.date.split('-');
      const formattedDate = `${parts[1] || ''}/${parts[2] || ''}`;
      return {
        date: formattedDate,
        Requests: d.requests
      };
    });
  }, [telemetry]);

  const departmentData = useMemo(() => {
    if (!telemetry?.departmentUsage) return [];
    return telemetry.departmentUsage.map((d: any) => ({
      name: d.name === 'SUPER_ADMIN' || d.name === 'HOSPITAL_ADMIN' ? 'Admin' : d.name,
      value: d.value
    }));
  }, [telemetry]);

  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6'];

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xl">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="font-display font-semibold text-lg text-slate-850 dark:text-white">Failed to Load Telemetry</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            An error occurred while compiling hospital AI assistant telemetry.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">AI Assistant Analytics</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hospital-wide copilot metrics, feature utilization distribution, and algorithm accuracy ratings.
          </p>
        </div>
        <div className="h-10 w-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
          <Sparkles className="h-5 w-5" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
            <div className="h-80 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl" />
            <div className="h-80 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Telemetry KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Conversations</span>
                <span className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-0.5">
                  {telemetry?.totalConversations || 0}
                </span>
              </div>
            </div>

            <div className="p-5 border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Copilot Queries</span>
                <span className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-0.5">
                  {telemetry?.totalMessages || 0}
                </span>
              </div>
            </div>

            <div className="p-5 border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-500">
                <ThumbsUp className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Avg Accuracy Rating</span>
                <span className="text-2xl font-bold font-display text-slate-800 dark:text-white mt-0.5">
                  {telemetry?.feedbackAccuracy?.positiveRatio || 0}% Positive
                </span>
              </div>
            </div>
          </div>

          {/* Visualizations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Daily Requests Area Chart */}
            <div className="p-6 border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold font-display text-slate-800 dark:text-white mb-4">Daily AI Usage Trends</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyRequestsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="requestsColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:hidden" />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" className="hidden dark:block" />
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: '#fff'
                      }}
                    />
                    <Area type="monotone" dataKey="Requests" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#requestsColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Usage Pie Chart */}
            <div className="p-6 border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold font-display text-slate-800 dark:text-white mb-4">Department Usage Distribution</h3>
              <div className="h-72 flex flex-col md:flex-row items-center justify-between">
                <div className="w-full md:w-[60%] h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departmentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {departmentData.map((_entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '11px',
                          color: '#fff'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 pr-6">
                  {departmentData.map((entry: any, index: number) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">{entry.name}</span>
                      <span className="text-xs text-slate-400 font-medium">({entry.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Used Features Bar Chart */}
            <div className="p-6 border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 rounded-2xl shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold font-display text-slate-800 dark:text-white mb-4">Most Utilized Copilot Features</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={telemetry?.mostUsedFeatures || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:hidden" />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" className="hidden dark:block" />
                    <XAxis dataKey="feature" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={50}>
                      {telemetry?.mostUsedFeatures?.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};
