import { TriageLevel, EmergencyProcedureType, EmergencyTransferType, CriticalAlertType, EmergencyDispositionOutcome } from '@prisma/client';

export interface CreateEmergencyCaseInput {
  patientId: string;
  arrivalMode: string; // "AMBULANCE", "WALK_IN", "TRANSFER", etc.
  chiefComplaint: string;
}

export interface TriageAssessmentInput {
  triageLevel: TriageLevel;
  chiefComplaint: string;
  symptoms: string;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  triageNotes?: string;
}

export interface AssignDoctorInput {
  doctorId: string;
  role: string; // "PRIMARY_ED_PHYSICIAN", "TRAUMA_SURGEON", "SPECIALIST"
}

export interface RespondAssignmentInput {
  status: 'ACCEPTED' | 'REJECTED';
}

export interface CreateTreatmentInput {
  treatmentDescription: string;
  notes?: string;
}

export interface CreateProcedureInput {
  procedureType: EmergencyProcedureType;
  notes?: string;
  startTime: string; // ISO String
  endTime?: string;  // ISO String
  outcome: string;   // "SUCCESSFUL", "FAILED", "ONGOING"
}

export interface CreateTraumaCaseInput {
  injuryMechanism: string; // "MOTOR_VEHICLE_ACCIDENT", "FALL", "PENETRATING_WOUND", "BLUNT_FORCE", "GSW", "OTHER"
  severityScore?: number;
  gcsScore?: number;
  isMultiTrauma?: boolean;
  surgicalConsultationRequired?: boolean;
  traumaSurgeonId?: string;
}

export interface InitiateTransferInput {
  transferType: EmergencyTransferType;
  reason: string;
  destination: string;
}

export interface TriggerAlertInput {
  alertType: CriticalAlertType;
  notes?: string;
}

export interface CreateDispositionInput {
  outcome: EmergencyDispositionOutcome;
  notes?: string;
}

export interface MassCasualtyInput {
  incidentType: string;
  patientCount: number;
  chiefComplaint: string;
}

export interface LiveEmergencyDashboard {
  activeCasesCount: number;
  casesByTriage: {
    LEVEL_1_CRITICAL: number;
    LEVEL_2_EMERGENCY: number;
    LEVEL_3_URGENT: number;
    LEVEL_4_SEMI_URGENT: number;
    LEVEL_5_NON_URGENT: number;
  };
  triageQueue: Array<{
    id: string;
    caseNumber: string;
    patientId: string;
    patientName: string;
    arrivalTime: Date;
    chiefComplaint: string;
    triageLevel: TriageLevel | null;
    status: string;
  }>;
  activeAlerts: Array<{
    id: string;
    caseNumber: string;
    patientName: string;
    alertType: CriticalAlertType;
    triggeredAt: Date;
    notes: string | null;
  }>;
}

export interface EmergencyAnalytics {
  averageResponseTimeMinutes: number;
  averageThroughputTimeMinutes: number;
  outcomeMetrics: {
    DISCHARGED: number;
    ADMITTED: number;
    TRANSFERRED: number;
    DECEASED: number;
    LEFT_AGAINST_MEDICAL_ADVICE: number;
  };
  traumaVolume: number;
}
