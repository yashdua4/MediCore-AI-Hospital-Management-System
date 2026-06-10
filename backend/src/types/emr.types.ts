import { MedicalRecord, Diagnosis, TreatmentPlan, Prescription, PrescriptionMedicine, PatientVital, ClinicalNote, MedicalDocument } from '@prisma/client';

export interface EMRDiagnosisInput {
  code: string;
  name: string;
  severity: string;
  notes?: string;
}

export interface EMRTreatmentPlanInput {
  description: string;
  goals?: string;
  duration?: string;
  status: string;
  notes?: string;
}

export interface EMRPrescriptionMedicineInput {
  medicineName: string;
  strength: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface EMRPrescriptionInput {
  notes?: string;
  medicines: EMRPrescriptionMedicineInput[];
}

export interface EMRVitalInput {
  bloodPressure: string;
  heartRate: number;
  respiratoryRate: number;
  temperature: number; // Decimal mapped to number
  oxygenSaturation: number;
  height: number; // Decimal mapped to number
  weight: number; // Decimal mapped to number
}

export interface EMRClinicalNoteInput {
  content: string;
  noteType: string;
}

export interface EMRCreateInput {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  symptoms?: string;
  observations?: string;
  followUpInstructions?: string;
  diagnoses?: EMRDiagnosisInput[];
  treatmentPlans?: EMRTreatmentPlanInput[];
  prescriptions?: EMRPrescriptionInput[];
  vitals?: EMRVitalInput;
  clinicalNotes?: EMRClinicalNoteInput[];
}

export interface EMRUpdateInput {
  symptoms?: string;
  observations?: string;
  followUpInstructions?: string;
  changeReason?: string; // Reason to document in MedicalRecordVersion
  diagnoses?: EMRDiagnosisInput[];
  treatmentPlans?: EMRTreatmentPlanInput[];
  prescriptions?: EMRPrescriptionInput[];
  vitals?: EMRVitalInput;
}

export interface EMRRestoreInput {
  version: number;
  changeReason?: string;
}

export interface EMRDocumentInput {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface PatientAllergyInput {
  allergen: string;
  reaction?: string;
  severity: string;
  diagnosedAt?: string; // ISO string
}

export interface PatientConditionInput {
  code?: string;
  name: string;
  status: string;
  severity: string;
  diagnosedAt?: string; // ISO string
}

// Immutable JSON Snapshot Schema for EMR Versioning
export interface EMRJsonSnapshot {
  symptoms?: string | null;
  observations?: string | null;
  followUpInstructions?: string | null;
  diagnoses: {
    code: string;
    name: string;
    severity: string;
    notes?: string | null;
  }[];
  treatmentPlans: {
    description: string;
    goals?: string | null;
    duration?: string | null;
    status: string;
    notes?: string | null;
  }[];
  prescriptions: {
    notes?: string | null;
    medicines: {
      medicineName: string;
      strength: string;
      frequency: string;
      duration: string;
      instructions?: string | null;
    }[];
  }[];
  vitals?: {
    bloodPressure: string;
    heartRate: number;
    respiratoryRate: number;
    temperature: number;
    oxygenSaturation: number;
    height: number;
    weight: number;
    bmi: number;
  } | null;
}

// Response mappings
export interface MedicalRecordResponse extends MedicalRecord {
  diagnoses: Diagnosis[];
  treatmentPlans: TreatmentPlan[];
  prescriptions: (Prescription & { medicines: PrescriptionMedicine[] })[];
  clinicalNotes: ClinicalNote[];
  documents: MedicalDocument[];
  vitals: PatientVital[];
}

export interface PatientTimelineEvent {
  id: string;
  type: 'VISIT' | 'DIAGNOSIS' | 'PRESCRIPTION' | 'VITAL_RECORD' | 'ALLERGY_RECORD' | 'CONDITION_RECORD' | 'DOCUMENT_UPLOAD';
  date: Date;
  title: string;
  description: string;
  details: any;
}

export interface VitalTrendData {
  recordedAt: Date;
  bloodPressure: string;
  heartRate: number;
  respiratoryRate: number;
  temperature: number;
  oxygenSaturation: number;
  bmi: number;
  weight: number;
}
