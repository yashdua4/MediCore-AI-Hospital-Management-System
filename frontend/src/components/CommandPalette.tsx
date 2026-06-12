import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Compass, SunMoon, ShieldAlert, LogOut, BellOff } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const logout = useAuthStore((s) => s.logout);
  const clearNotifications = useNotificationStore((s) => s.clearAll);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: 'dash-exec',
      title: 'Go to Executive Dashboard',
      subtitle: 'View hospital analytics, active census, and revenue maps',
      icon: <Compass className="h-4 w-4 text-violet-500" />,
      action: () => { navigate('/dashboard/executive'); onClose(); }
    },
    {
      id: 'dash-doctor',
      title: 'Go to Doctor Portal',
      subtitle: 'Review patient appointments and EMR charts',
      icon: <Compass className="h-4 w-4 text-emerald-500" />,
      action: () => { navigate('/dashboard/doctor'); onClose(); }
    },
    {
      id: 'dash-nurse',
      title: 'Go to Nurse Station',
      subtitle: 'Manage beds map, admissions, and medication schedules',
      icon: <Compass className="h-4 w-4 text-cyan-500" />,
      action: () => { navigate('/dashboard/nurse'); onClose(); }
    },
    {
      id: 'dash-billing',
      title: 'Go to Billing Desk',
      subtitle: 'Track invoices, refund queries, and claims',
      icon: <Compass className="h-4 w-4 text-indigo-500" />,
      action: () => { navigate('/dashboard/billing'); onClose(); }
    },
    {
      id: 'dash-emergency',
      title: 'Go to Emergency Control',
      subtitle: 'Monitor trauma alerts, red-zone vitals, and ambulances',
      icon: <Compass className="h-4 w-4 text-rose-500" />,
      action: () => { navigate('/dashboard/emergency'); onClose(); }
    },
    {
      id: 'dash-security',
      title: 'Go to Security & Audit Center',
      subtitle: 'Review login logs, locked accounts, and security incidents',
      icon: <Compass className="h-4 w-4 text-orange-500" />,
      action: () => { navigate('/dashboard/security'); onClose(); }
    },
    {
      id: 'action-theme',
      title: 'Toggle Color Theme',
      subtitle: 'Switch application between Light Mode and Dark Mode',
      icon: <SunMoon className="h-4 w-4 text-yellow-500" />,
      action: () => { toggleTheme(); onClose(); }
    },
    {
      id: 'action-trigger-emergency',
      title: 'Trigger Demo Emergency Trauma Alert',
      subtitle: 'Simulate a high-priority red alert notification',
      icon: <ShieldAlert className="h-4 w-4 text-red-500" />,
      action: () => {
        addNotification({
          title: 'SIMULATED TRAUMA ALERT',
          message: 'Code Red triggered in Emergency Bay 2. Immediate clinical response needed.',
          type: 'critical',
          actionUrl: '/dashboard/emergency'
        });
        onClose();
      }
    },
    {
      id: 'action-clear-alerts',
      title: 'Clear Notifications Board',
      subtitle: 'Remove all active records from Alert Center',
      icon: <BellOff className="h-4 w-4 text-slate-500" />,
      action: () => { clearNotifications(); onClose(); }
    },
    {
      id: 'action-logout',
      title: 'Revoke Authorization / Log Out',
      subtitle: 'Terminate active session immediately',
      icon: <LogOut className="h-4 w-4 text-slate-500" />,
      action: () => { logout(); onClose(); }
    }
  ];

  // Filter commands by query
  const filtered = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh] p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        
        {/* Search Input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search portal..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-slate-800 dark:text-white placeholder-slate-400 text-sm outline-none border-none focus:ring-0"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-sans tracking-widest shrink-0 shadow-sm">
            ESC
          </kbd>
        </div>

        {/* Search Results list */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-600">
              No command paths match your query.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                      : 'bg-transparent text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-white dark:bg-slate-900 shadow-sm' : 'bg-slate-50 dark:bg-slate-900/40'}`}>
                    {cmd.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold">{cmd.title}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{cmd.subtitle}</div>
                  </div>
                  {isSelected && (
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[9px] text-slate-500 font-sans shadow-sm shrink-0">
                      ENTER
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
