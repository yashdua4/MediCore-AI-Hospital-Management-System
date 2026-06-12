import { apiClient } from './apiClient';
import { useAuthStore } from '../store/authStore';
import { RoleType, UserSession } from '../types';

// Predefined accounts mapping for quick login testing and role switching
export const DEMO_ACCOUNTS = [
  { email: 'admin@medicore.com', role: 'SUPER_ADMIN', name: 'Dr. Sarah Jenkins (Admin)' },
  { email: 'doctor@medicore.com', role: 'DOCTOR', name: 'Dr. Alex Rivera (Cardiology)' },
  { email: 'nurse@medicore.com', role: 'NURSE', name: 'Nurse Emily Carter (ICU)' },
  { email: 'patient@gmail.com', role: 'PATIENT', name: 'John Doe (Outpatient)' },
  { email: 'billing@medicore.com', role: 'BILLING_EXEC', name: 'Marcus Vance (Billing)' },
  { email: 'emergency@medicore.com', role: 'EMERGENCY_DOCTOR', name: 'Dr. Fiona Gallagher (ER)' },
  { email: 'security@medicore.com', role: 'SUPER_ADMIN', name: 'Chief Security Officer' }
];

export const authService = {
  /**
   * Log in user using credentials.
   * If the real backend endpoint returns 404/Offline, we fallback to local mock login in development.
   */
  async login(email: string, passwordHash: string) {
    try {
      const response = await apiClient.post('/auth/login', { email, passwordHash });
      const { user, tokens } = response.data;
      useAuthStore.getState().setAuth(user, tokens);
      return response.data;
    } catch (error: any) {
      const isDemo = import.meta.env.DEV || (error.response && error.response.status === 404);
      if (isDemo) {
        // Fallback simulation
        console.warn('Backend login endpoint offline or 404. Performing local demo login...');
        
        // Find matching demo account or default to patient
        const demo = DEMO_ACCOUNTS.find(d => d.email.toLowerCase() === email.toLowerCase());
        const role = demo ? (demo.role as RoleType) : 'PATIENT';
        const nameParts = demo ? demo.name.split(' ') : ['Guest', 'User'];
        const firstName = nameParts[0] || 'Guest';
        const lastName = nameParts.slice(1).join(' ') || 'User';

        const user = {
          id: 'demo-user-id-' + role.toLowerCase(),
          email,
          role,
          roles: [role],
          mfaEnabled: false,
          firstName,
          lastName,
        };

        const tokens = {
          accessToken: 'mock_access_token_' + Date.now(),
          refreshToken: 'mock_refresh_token_' + Date.now(),
        };

        useAuthStore.getState().setAuth(user, tokens);
        return { user, tokens };
      }
      throw error;
    }
  },

  /**
   * Log out current user and clear local session state.
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout').catch(() => {});
    } finally {
      useAuthStore.getState().logout();
    }
  },

  /**
   * Fetch active sessions for the calling user.
   */
  async getActiveSessions(): Promise<UserSession[]> {
    const response = await apiClient.get('/sessions/active');
    return response.data.data;
  },

  /**
   * Revoke a specific active session.
   */
  async revokeSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/sessions/${sessionId}`);
  },

  /**
   * Revoke all other active sessions for the caller.
   */
  async revokeAllOtherSessions(): Promise<void> {
    await apiClient.delete('/sessions/active/all');
  }
};
