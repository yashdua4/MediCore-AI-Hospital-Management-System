import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  Activity,
  Brain,
  Compass,
  Users,
  Calendar,
  FlaskConical,
  Pill,
  CreditCard,
  ShieldCheck,
  Bed,
  Settings,
  AlertTriangle,
  FolderHeart,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { user } = useAuthStore();
  const role = user?.role || 'PATIENT';

  // Build navigation items based on active role
  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'HOSPITAL_ADMIN':
        return [
          { name: 'Executive Dashboard', path: '/dashboard/executive', icon: <Compass className="h-5 w-5" /> },
          { name: 'AI Usage Analytics', path: '/dashboard/ai-analytics', icon: <Activity className="h-5 w-5 text-violet-400" /> },
          { name: 'AI Clinical Copilot', path: '/dashboard/copilot', icon: <Brain className="h-5 w-5 text-emerald-400 animate-pulse" /> },
          { name: 'Security & Audits', path: '/dashboard/security', icon: <ShieldCheck className="h-5 w-5 text-orange-500" /> },
          { name: 'Patients Directory', path: '/dashboard/patients', icon: <Users className="h-5 w-5" /> },
          { name: 'Appointments Manager', path: '/dashboard/appointments', icon: <Calendar className="h-5 w-5" /> },
          { name: 'Laboratory Logs', path: '/dashboard/lab', icon: <FlaskConical className="h-5 w-5" /> },
          { name: 'Pharmacy Registry', path: '/dashboard/pharmacy', icon: <Pill className="h-5 w-5" /> },
          { name: 'Billing Ledger', path: '/dashboard/billing', icon: <CreditCard className="h-5 w-5" /> },
          { name: 'IPD Ward Map', path: '/dashboard/ipd', icon: <Bed className="h-5 w-5" /> },
          { name: 'Emergency Control', path: '/dashboard/emergency', icon: <AlertTriangle className="h-5 w-5 text-rose-500" /> },
        ];
      case 'DOCTOR':
      case 'EMERGENCY_DOCTOR':
      case 'TRAUMA_SURGEON':
        return [
          { name: 'Doctor Dashboard', path: '/dashboard/doctor', icon: <Compass className="h-5 w-5" /> },
          { name: 'AI Clinical Copilot', path: '/dashboard/copilot', icon: <Brain className="h-5 w-5 text-emerald-400 animate-pulse" /> },
          { name: 'EMR Chart Room', path: '/dashboard/emr', icon: <FolderHeart className="h-5 w-5" /> },
          { name: 'Patients List', path: '/dashboard/patients', icon: <Users className="h-5 w-5" /> },
          { name: 'My Appointments', path: '/dashboard/appointments', icon: <Calendar className="h-5 w-5" /> },
          { name: 'Lab Orders', path: '/dashboard/lab', icon: <FlaskConical className="h-5 w-5" /> },
          { name: 'Pharmacy Dispenser', path: '/dashboard/pharmacy', icon: <Pill className="h-5 w-5" /> },
          { name: 'Emergency Board', path: '/dashboard/emergency', icon: <AlertTriangle className="h-5 w-5 text-rose-500" /> },
        ];
      case 'NURSE':
        return [
          { name: 'Nurse Station', path: '/dashboard/nurse', icon: <Compass className="h-5 w-5" /> },
          { name: 'AI Clinical Copilot', path: '/dashboard/copilot', icon: <Brain className="h-5 w-5 text-emerald-400 animate-pulse" /> },
          { name: 'Active Ward Census', path: '/dashboard/ipd', icon: <Bed className="h-5 w-5" /> },
          { name: 'Patient Vitals', path: '/dashboard/emr', icon: <FolderHeart className="h-5 w-5" /> },
          { name: 'Pharmacy Stock', path: '/dashboard/pharmacy', icon: <Pill className="h-5 w-5" /> },
          { name: 'Emergency Board', path: '/dashboard/emergency', icon: <AlertTriangle className="h-5 w-5 text-rose-500" /> },
        ];
      case 'BILLING_EXEC':
      case 'ACCOUNTANT':
        return [
          { name: 'Billing Dashboard', path: '/dashboard/billing', icon: <Compass className="h-5 w-5" /> },
          { name: 'AI Operations Copilot', path: '/dashboard/copilot', icon: <Brain className="h-5 w-5 text-emerald-400 animate-pulse" /> },
          { name: 'Claims Center', path: '/dashboard/claims', icon: <CreditCard className="h-5 w-5" /> },
          { name: 'Patients Index', path: '/dashboard/patients', icon: <Users className="h-5 w-5" /> },
        ];
      case 'PATIENT':
        return [
          { name: 'Patient Dashboard', path: '/dashboard/patient', icon: <Compass className="h-5 w-5" /> },
          { name: 'AI Health Copilot', path: '/dashboard/copilot', icon: <Brain className="h-5 w-5 text-emerald-450 animate-pulse" /> },
          { name: 'My Health Record', path: '/dashboard/emr', icon: <FolderHeart className="h-5 w-5" /> },
          { name: 'Book Appointment', path: '/dashboard/appointments', icon: <Calendar className="h-5 w-5" /> },
          { name: 'Prescriptions', path: '/dashboard/pharmacy', icon: <Pill className="h-5 w-5" /> },
          { name: 'My Billing Statements', path: '/dashboard/billing', icon: <CreditCard className="h-5 w-5" /> },
        ];
      default:
        return [
          { name: 'Portal Home', path: '/dashboard', icon: <Compass className="h-5 w-5" /> },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside
      className={`bg-slate-950 text-slate-300 flex flex-col border-r border-slate-900 transition-all duration-300 relative z-30 font-sans ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Sidebar Header Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-900 overflow-hidden">
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity className="h-5 w-5 text-slate-950 stroke-[2.5]" />
          </div>
          {!collapsed && (
            <span className="font-display font-bold text-lg bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              MediCore <span className="text-emerald-400">AI</span>
            </span>
          )}
        </div>
      </div>

      {/* Navigation List items */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all font-medium text-sm border ${
                isActive
                  ? 'bg-slate-900 border-slate-800 text-white shadow-sm'
                  : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
              }`
            }
          >
            <div className="shrink-0">{item.icon}</div>
            {!collapsed && <span className="truncate">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Trigger footer button */}
      <div className="p-4 border-t border-slate-900 flex justify-between items-center overflow-hidden">
        {!collapsed && <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">MediCore Sys</span>}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 transition-colors text-slate-400 hover:text-white shrink-0 mx-auto"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
};
