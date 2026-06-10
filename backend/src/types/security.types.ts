// --- SECURITY & AUDIT ENUMS ---
export type AuditLogAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'ROLE_CHANGE'
  | 'PERMISSION_CHANGE'
  | 'PATIENT_VIEW'
  | 'PATIENT_UPDATE'
  | 'MEDICAL_RECORD_ACCESS'
  | 'APPOINTMENT_UPDATE'
  | 'DOCTOR_CREATE'
  | 'DOCTOR_UPDATE'
  | 'DOCTOR_DELETE'
  | 'DOCTOR_VIEW'
  | 'DOCTOR_SCHEDULE_UPDATE'
  | 'DOCTOR_LEAVE_CREATE'
  | 'DOCTOR_LEAVE_DELETE';

export type SecurityEventType =
  | 'BRUTE_FORCE_ATTEMPT'
  | 'ACCOUNT_LOCKED'
  | 'UNAUTHORIZED_ACCESS'
  | 'MULTIPLE_SESSION_LOGIN'
  | 'SUSPICIOUS_ACTIVITY'
  | 'PRIVILEGE_ESCALATION_ATTEMPT';

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// --- INTERFACES ---
export interface AuditLogResponse {
  id: string;
  userId: string | null;
  userEmail?: string | null;
  action: string;
  resource: string;
  details: string | null;
  ipAddress: string;
  userAgent: string | null;
  timestamp: Date;
}

export interface SecurityEventResponse {
  id: string;
  userId: string | null;
  userEmail?: string | null;
  eventType: string;
  severity: string;
  description: string;
  ipAddress: string;
  userAgent: string | null;
  resolved: boolean;
  timestamp: Date;
}

export interface SecurityMetrics {
  activeSessionsCount: number;
  securityEventsCount: {
    total: number;
    unresolved: number;
    critical: number;
  };
  failedLoginsCount: number;
  lockedAccountsCount: number;
}

export interface DashboardData {
  metrics: SecurityMetrics;
  recentEvents: SecurityEventResponse[];
  recentAudits: AuditLogResponse[];
}
