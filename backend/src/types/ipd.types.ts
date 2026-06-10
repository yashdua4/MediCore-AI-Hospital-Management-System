export interface CreateWardInput {
  name: string;
  type: 'GENERAL' | 'SEMI_PRIVATE' | 'PRIVATE' | 'ICU' | 'NICU' | 'EMERGENCY' | 'RECOVERY';
  capacity: number;
}

export interface CreateRoomInput {
  roomNumber: string;
  wardId: string;
  roomType: 'GENERAL' | 'SEMI_PRIVATE' | 'PRIVATE' | 'ICU' | 'NICU' | 'EMERGENCY' | 'RECOVERY';
  chargesPerDay: number;
}

export interface CreateBedInput {
  bedNumber: string;
  roomId: string;
}

export interface AdmitPatientInput {
  patientId: string;
  doctorId: string;
  reason: string;
  bedId: string;
}

export interface TransferPatientInput {
  targetBedId: string;
  reason: string;
}

export interface AssignNurseInput {
  nurseId: string;
  wardId: string;
  shiftStart: string; // ISO date string
  shiftEnd: string; // ISO date string
  notes?: string;
}

export interface CreateNoteInput {
  noteType: 'CLINICAL' | 'NURSING' | 'GENERAL';
  content: string;
}

export interface DischargePatientInput {
  treatmentSummary: string;
  medicationInstructions: string;
  followUpInstructions: string;
  dischargeCondition: string;
}

export interface AddChargeInput {
  chargeType: 'ROOM' | 'BED' | 'NURSING' | 'SPECIAL_CARE';
  amount: number;
  quantity?: number;
  description: string;
}

export interface BedOccupancyTelemetry {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  maintenanceBeds: number;
  occupancyRate: number; // percentage
}

export interface WardUtilizationTelemetry {
  wardId: string;
  wardName: string;
  wardType: string;
  capacity: number;
  occupancy: number;
  utilizationRate: number; // percentage
}

export interface ActiveAdmissionsTelemetry {
  id: string;
  admissionNumber: string;
  patientName: string;
  doctorName: string;
  admissionDate: string;
  wardName: string;
  roomNumber: string;
  bedNumber: string;
}

export interface IPDTelemetryDashboard {
  occupancy: BedOccupancyTelemetry;
  wardUtilization: WardUtilizationTelemetry[];
  activeAdmissionsCount: number;
  dailyAdmissionsCount: number;
  dailyDischargesCount: number;
  averageLengthOfStayDays: number;
  readmissionRate30Days: number; // percentage
}
