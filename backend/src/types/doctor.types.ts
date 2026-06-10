export interface DoctorQualificationInput {
  degree: string;
  institution: string;
  year: number;
}

export interface DoctorScheduleInput {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

export interface DoctorAvailabilityInput {
  date: string | Date; // ISO date string or Date object
  startTime?: string | null;   // "HH:MM" (optional, null = full day leave)
  endTime?: string | null;     // "HH:MM" (optional, null = full day leave)
  reason?: string | null;
}

export interface DoctorCreateInput {
  userId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  licenseNumber: string;
  consultationFee: number;
  departmentId?: string;
  departmentName?: string; // Create on the fly if departmentId is not provided
  specializationIds?: string[];
  specializationNames?: string[]; // Create on the fly if IDs are not provided
  qualifications?: DoctorQualificationInput[];
  schedules?: DoctorScheduleInput[];
}

export interface DoctorUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  consultationFee?: number;
  departmentId?: string;
  departmentName?: string;
  specializationIds?: string[];
  specializationNames?: string[];
  qualifications?: DoctorQualificationInput[];
}

export interface DoctorDepartmentResponse {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DoctorSpecializationResponse {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DoctorQualificationResponse {
  id: string;
  doctorId: string;
  degree: string;
  institution: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DoctorScheduleResponse {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DoctorAvailabilityResponse {
  id: string;
  doctorId: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DoctorResponse {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  licenseNumber: string;
  consultationFee: any; // Decimal type from Prisma
  isDeleted: boolean;
  departmentId: string;
  department?: DoctorDepartmentResponse;
  qualifications?: DoctorQualificationResponse[];
  specializations?: {
    specialization: DoctorSpecializationResponse;
  }[];
  schedules?: DoctorScheduleResponse[];
  availabilities?: DoctorAvailabilityResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DoctorStatisticsResponse {
  doctorId: string;
  totalAppointments: number;
  appointmentsByStatus: {
    status: string;
    count: number;
  }[];
  upcomingAppointments: number;
  weeklyScheduleHours: number;
}
