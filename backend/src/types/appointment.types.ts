import { AppointmentStatus } from '@prisma/client';

export interface AppointmentCreateInput {
  patientId: string;
  doctorId: string;
  date: string | Date; // ISO Date string (YYYY-MM-DD)
  time: string;        // "HH:MM"
  duration?: number;   // 15, 30, 45, 60 minutes. Default 30.
  notes?: string;
}

export interface AppointmentUpdateInput {
  doctorId?: string;
  date?: string | Date;
  time?: string;
  duration?: number;
  notes?: string;
}

export interface AppointmentRescheduleInput {
  date: string | Date;
  time: string;
  duration?: number;
  reason?: string;
}

export interface AppointmentStatusUpdateInput {
  status: AppointmentStatus;
  reason?: string;
}

export interface AppointmentNoteCreateInput {
  content: string;
}

export interface AppointmentAttachmentCreateInput {
  fileName: string;
  fileUrl: string;
  fileType: string;
}

export interface AppointmentStatusHistoryResponse {
  id: string;
  appointmentId: string;
  status: AppointmentStatus;
  changedBy: string;
  reason: string | null;
  createdAt: Date;
}

export interface AppointmentReminderResponse {
  id: string;
  appointmentId: string;
  type: string;
  triggerTime: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentNoteResponse {
  id: string;
  appointmentId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentAttachmentResponse {
  id: string;
  appointmentId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedById: string;
  createdAt: Date;
}

export interface AppointmentResponse {
  id: string;
  patientId: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  };
  doctorId: string;
  doctor?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    licenseNumber: string;
  };
  date: Date;
  time: string;
  duration: number;
  status: AppointmentStatus;
  notes: string | null;
  statusHistory?: AppointmentStatusHistoryResponse[];
  reminders?: AppointmentReminderResponse[];
  appointmentNotes?: AppointmentNoteResponse[];
  attachments?: AppointmentAttachmentResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentStatisticsResponse {
  totalAppointments: number;
  byStatus: {
    status: AppointmentStatus;
    count: number;
  }[];
  cancelledRate: number; // percentage
  noShowRate: number;    // percentage
  reassignmentCount: number; // total times doctor changed via history
}
