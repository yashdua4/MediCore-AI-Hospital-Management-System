import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore';
import { Bell, ShieldAlert, CheckCircle2, AlertTriangle, Info, Trash2, CheckSquare } from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return new Date(isoString).toLocaleDateString();
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-xl z-50 animate-scale-in"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-slate-500" />
          <h3 className="font-display font-semibold text-slate-800 dark:text-white">Alert Center</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => markAllAsRead()}
            title="Mark all as read"
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md text-slate-500 transition-colors"
          >
            <CheckSquare className="h-4 w-4" />
          </button>
          <button
            onClick={() => clearAll()}
            title="Clear all alerts"
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md text-rose-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-600 text-sm">
            No active alerts at this time.
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                markAsRead(notif.id);
                if (notif.actionUrl) {
                  navigate(notif.actionUrl);
                  onClose();
                }
              }}
              className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                notif.read
                  ? 'bg-transparent border-transparent opacity-60 hover:opacity-100'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:bg-slate-100/70 dark:hover:bg-slate-900/70'
              }`}
            >
              <div className="mt-0.5">{getIcon(notif.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-semibold truncate ${
                    notif.type === 'critical' ? 'text-rose-500 font-bold' : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {notif.title}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {formatTime(notif.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {notif.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 mt-2.5 text-center">
        <button
          onClick={() => {
            navigate('/dashboard/notifications');
            onClose();
          }}
          className="text-xs text-indigo-500 hover:text-indigo-650 font-semibold"
        >
          View All History
        </button>
      </div>
    </div>
  );
};

