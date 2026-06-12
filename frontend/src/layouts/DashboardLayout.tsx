import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { useAuthStore } from '../store/authStore';

export const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { isSessionExpired, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // Watch session expiration periodically
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const checkInterval = setInterval(() => {
      if (isSessionExpired()) {
        console.warn('Session expired. Logging out automatically...');
        logout();
        navigate('/login?expired=true');
      }
    }, 10000); // Check every 10s

    return () => clearInterval(checkInterval);
  }, [isAuthenticated, isSessionExpired, logout, navigate]);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Dynamic Collapsible Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative">
        <Navbar />
        
        {/* Dynamic Inner Outlet with smooth slide animations */}
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
