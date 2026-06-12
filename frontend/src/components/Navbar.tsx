import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useNotificationStore } from '../store/notificationStore';
import { Bell, Sun, Moon, Search, User as UserIcon, LogOut, RefreshCw, KeyRound } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { NotificationCenter } from './NotificationCenter';
import { CommandPalette } from './CommandPalette';
import { RoleType } from '../types';

export const Navbar: React.FC = () => {
  const { user, switchRole, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount());

  const [notifOpen, setNotifOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Role display names and class mapping
  const roleDisplay: Record<RoleType, { name: string; class: string }> = {
    SUPER_ADMIN: { name: 'Super Admin', class: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
    HOSPITAL_ADMIN: { name: 'Hospital Admin', class: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
    DOCTOR: { name: 'Doctor', class: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    NURSE: { name: 'Nurse', class: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' },
    RECEPTIONIST: { name: 'Receptionist', class: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
    LAB_TECH: { name: 'Lab Tech', class: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' },
    PHARMACIST: { name: 'Pharmacist', class: 'bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/20' },
    BILLING_EXEC: { name: 'Billing Exec', class: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
    ACCOUNTANT: { name: 'Accountant', class: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
    PATIENT: { name: 'Patient', class: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    EMERGENCY_DOCTOR: { name: 'ER Doctor', class: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
    TRAUMA_SURGEON: { name: 'Trauma Surgeon', class: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextRole = e.target.value as RoleType;
    switchRole(nextRole);
    // Refresh page / let router redirect dynamically
    window.location.reload();
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between font-sans">
      <div className="flex items-center gap-6">
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-4">
        {/* Search Command Palette Shortcut Bar */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-400 text-xs transition-all w-48 text-left"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1">Search commands...</span>
          <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] text-slate-500 tracking-wide shadow-sm font-sans shrink-0">
            Ctrl K
          </kbd>
        </button>

        {/* Search button for small devices */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* Dynamic Role Swapper Badge (Demo aid) */}
        {user && (
          <div className="flex items-center gap-1.5">
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${roleDisplay[user.role]?.class || 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
              {roleDisplay[user.role]?.name || user.role}
            </span>
            {user.roles.length > 1 && (
              <select
                value={user.role}
                onChange={handleRoleChange}
                className="bg-transparent text-slate-500 dark:text-slate-400 text-[10px] py-1 border-none focus:ring-0 outline-none cursor-pointer"
                title="Switch active role"
              >
                {user.roles.map((r) => (
                  <option key={r} value={r} className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                    Switch to {roleDisplay[r]?.name || r}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={() => toggleTheme()}
          className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-slate-600" />}
        </button>

        {/* Notification Bell with Badge */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Open notifications panel"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
          <NotificationCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* User profile popup menu */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-700 flex items-center justify-center overflow-hidden transition-all"
            title="User Profile Actions"
          >
            {user?.firstName ? (
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-display">
                {user.firstName[0]}{user.lastName ? user.lastName[0] : ''}
              </span>
            ) : (
              <UserIcon className="h-4.5 w-4.5 text-slate-500" />
            )}
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 mt-3 w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-xl z-50 animate-scale-in">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <div className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{user?.email}</div>
                </div>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    setPaletteOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>Command Center</span>
                </button>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors mt-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Global Command Palette Dialog */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
};
