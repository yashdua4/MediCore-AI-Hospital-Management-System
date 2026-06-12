export type RoleType =
  | 'SUPER_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'LAB_TECH'
  | 'PHARMACIST'
  | 'BILLING_EXEC'
  | 'ACCOUNTANT'
  | 'PATIENT'
  | 'EMERGENCY_DOCTOR'
  | 'TRAUMA_SURGEON';

export type AppointmentStatus =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export interface User {
  id: string;
  email: string;
  role: RoleType;
  roles: RoleType[];
  mfaEnabled: boolean;
  firstName?: string;
  lastName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserSession {
  id: string;
  userId: string;
  userAgent: string;
  ipAddress: string;
  expiresAt: string;
  createdAt: string;
  isCurrent?: boolean;
}

export interface SecurityEvent {
  id: string;
  userId?: string;
  user?: { email: string };
  eventType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  ipAddress: string;
  userAgent?: string;
  resolved: boolean;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  user?: { email: string };
  action: string;
  resource: string;
  details?: string;
  ipAddress: string;
  userAgent?: string;
  timestamp: string;
}

export interface Patient {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  bloodGroup?: string;
  email?: string;
  phone: string;
  aadhaar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  licenseNumber: string;
  consultationFee: string;
  departmentId: string;
  department?: { name: string };
}

export interface Appointment {
  id: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: Doctor;
  date: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
}

export interface LabOrder {
  id: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: Doctor;
  labTestId: string;
  labTest?: { name: string; price: string };
  priority: 'NORMAL' | 'HIGH' | 'URGENT' | 'EMERGENCY';
  status: string; // e.g. ORDERED, RESULT_ENTERED, COMPLETED
  clinicalNotes?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  patientId: string;
  patient?: Patient;
  appointmentId?: string;
  totalAmount: string;
  taxAmount: string;
  discountAmount: string;
  paidAmount: string;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'VOID' | 'REFUNDED';
  dueDate: string;
  createdAt: string;
}

export interface EMRRecord {
  id: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: Doctor;
  symptoms?: string;
  observations?: string;
  followUpInstructions?: string;
  createdAt: string;
  updatedAt: string;
  diagnoses?: Array<{ code: string; name: string; severity: string }>;
  prescriptions?: Array<{
    id: string;
    medicines: Array<{ medicineName: string; strength: string; frequency: string; duration: string }>;
  }>;
  vitals?: Array<{ bloodPressure: string; heartRate: number; temperature: string; oxygenSaturation: number }>;
}

export interface WardAdmission {
  id: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: Doctor;
  wardName: string;
  bedNumber: string;
  admissionDate: string;
  dischargeDate?: string;
  status: 'ADMITTED' | 'DISCHARGED' | 'TRANSFERRED';
}
