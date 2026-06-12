import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';


export const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { isSessionExpired, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const addNotification = useNotificationStore((s) => s.addNotification);

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

    // Real-Time Alert simulation engine
    const alertsPool = [
      { title: 'Ambulance Approaching', message: 'Ambulance IN-004 with a trauma case is arriving in 5 minutes.', type: 'critical' },
      { title: 'Pathology Reports Release', message: 'Assays verified for John Doe. Values registered inside EMR charts.', type: 'success' },
      { title: 'New Consult Requested', message: 'Patient Alice Vance booked an appointment consult slot.', type: 'warning' },
      { title: 'Pharmacy Stock Refill', message: 'Lisinopril 10mg inventory quantities increased by 500 units.', type: 'info' }
    ];

    const alertsInterval = setInterval(() => {
      const idx = Math.floor(Math.random() * alertsPool.length);
      addNotification(alertsPool[idx] as any);
    }, 45000); // Simulate an alert every 45s

    return () => {
      clearInterval(checkInterval);
      clearInterval(alertsInterval);
    };
  }, [isAuthenticated, isSessionExpired, logout, navigate, addNotification]);


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
