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
  | 'APPOINTMENT_CREATE'
  | 'APPOINTMENT_CANCEL'
  | 'APPOINTMENT_RESCHEDULE'
  | 'APPOINTMENT_STATUS_CHANGE'
  | 'APPOINTMENT_REASSIGN'
  | 'DOCTOR_CREATE'
  | 'DOCTOR_UPDATE'
  | 'DOCTOR_DELETE'
  | 'DOCTOR_VIEW'
  | 'DOCTOR_SCHEDULE_UPDATE'
  | 'DOCTOR_LEAVE_CREATE'
  | 'DOCTOR_LEAVE_DELETE'
  | 'MEDICAL_RECORD_CREATED'
  | 'MEDICAL_RECORD_UPDATED'
  | 'MEDICAL_RECORD_VIEWED'
  | 'PRESCRIPTION_CREATED'
  | 'DIAGNOSIS_UPDATED'
  | 'DOCUMENT_UPLOADED'
  | 'LAB_ORDER_CREATED'
  | 'LAB_SAMPLE_COLLECTED'
  | 'LAB_RESULT_ENTERED'
  | 'LAB_RESULT_APPROVED'
  | 'LAB_REPORT_GENERATED'
  | 'LAB_REPORT_VIEWED'
  | 'MEDICINE_CREATED'
  | 'MEDICINE_UPDATED'
  | 'MEDICINE_DISPENSED'
  | 'LOW_STOCK_ALERT'
  | 'EXPIRY_ALERT'
  | 'PURCHASE_ORDER_CREATED'
  | 'INVENTORY_UPDATED'
  | 'INVOICE_CREATED'
  | 'INVOICE_UPDATED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'REFUND_ISSUED'
  | 'CLAIM_SUBMITTED'
  | 'CLAIM_APPROVED'
  | 'CLAIM_REJECTED'
  | 'PATIENT_ADMITTED'
  | 'ROOM_ASSIGNED'
  | 'BED_ASSIGNED'
  | 'PATIENT_TRANSFERRED'
  | 'NURSE_ASSIGNED'
  | 'DISCHARGE_INITIATED'
  | 'PATIENT_DISCHARGED'
  | 'EMERGENCY_CASE_CREATED'
  | 'TRIAGE_COMPLETED'
  | 'DOCTOR_ASSIGNED'
  | 'CRITICAL_ALERT_TRIGGERED'
  | 'EMERGENCY_PROCEDURE_PERFORMED'
  | 'EMERGENCY_TRANSFER_INITIATED'
  | 'CASE_CLOSED';

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
