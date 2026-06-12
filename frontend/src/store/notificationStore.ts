import { create } from 'zustand';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'critical';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [
    {
      id: '1',
      title: 'Critical Vital Warning',
      message: 'Patient John Doe in Ward A Bed 4 heart rate spiked to 142 bpm.',
      type: 'critical',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(), // 5m ago
      read: false,
      actionUrl: '/dashboard/emergency',
    },
    {
      id: '2',
      title: 'Lab Report Approved',
      message: 'Blood Culture for Patient Alice Vance has been verified by Chief Pathologist.',
      type: 'success',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(), // 45m ago
      read: false,
      actionUrl: '/dashboard/doctor',
    },
    {
      id: '3',
      title: 'Session Flagged',
      message: 'Multiple active concurrent logins detected for doctor account Rivera.',
      type: 'warning',
      timestamp: new Date(Date.now() - 120 * 60000).toISOString(), // 2h ago
      read: true,
      actionUrl: '/dashboard/security',
    },
    {
      id: '4',
      title: 'Invoice Settled',
      message: 'Claim request MediCare-99182 approved by MaxLife Insurance Corp.',
      type: 'info',
      timestamp: new Date(Date.now() - 360 * 60000).toISOString(), // 6h ago
      read: true,
      actionUrl: '/dashboard/billing',
    }
  ],

  addNotification: (item) => {
    const newItem: NotificationItem = {
      ...item,
      id: 'notif-' + Date.now(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    set((state) => ({
      notifications: [newItem, ...state.notifications],
    }));
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },

  unreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },
}));
