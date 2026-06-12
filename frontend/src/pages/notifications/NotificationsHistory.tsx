import React, { useMemo, useState } from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import { Bell, ShieldAlert, CheckCircle2, AlertTriangle, Info, Trash2, CheckSquare, Search, RefreshCw } from 'lucide-react';

export const NotificationsHistory: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'SUCCESS' | 'INFO'>('ALL');

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const matchSearch =
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'UNREAD'
          ? !n.read
          : n.read;

      const matchType =
        typeFilter === 'ALL'
          ? true
          : n.type.toLowerCase() === typeFilter.toLowerCase();

      return matchSearch && matchStatus && matchType;
    });
  }, [notifications, searchTerm, statusFilter, typeFilter]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <ShieldAlert className="h-5 w-5 text-rose-500 animate-pulse" />;
      case 'error':
        return <ShieldAlert className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-500" />
            Alerts & Notification Log
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-405 mt-1">
            Browse through your complete security logs, clinical parameters alarms, and transactional updates.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => markAllAsRead()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-605 transition-colors"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Mark All Read
          </button>
          <button
            onClick={() => clearAll()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-500/20 hover:bg-rose-500/10 text-rose-505 rounded-xl text-xs font-semibold transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear All Logs
          </button>
        </div>
      </div>

      {/* Filters Area */}
      <div className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 max-w-xs w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl px-3 py-1.5 text-xs">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search alerts content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-slate-700 dark:text-slate-100 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-1.5 focus:outline-none dark:bg-slate-900"
          >
            <option value="ALL">All Statuses</option>
            <option value="UNREAD">Unread</option>
            <option value="READ">Read</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Severity:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-1.5 focus:outline-none dark:bg-slate-900"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="SUCCESS">Success</option>
            <option value="INFO">Info</option>
          </select>
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-slate-400 text-xs">
          No notifications match the filter query.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              className={`p-4 border rounded-2xl transition-all cursor-pointer flex gap-4 items-start ${
                notif.read
                  ? 'bg-transparent border-transparent opacity-60 hover:opacity-100'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-sm'
              }`}
            >
              <div className="mt-0.5">{getIcon(notif.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-4">
                  <h4 className={`text-xs font-bold ${
                    notif.type === 'critical' ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {notif.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formatTime(notif.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {notif.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
