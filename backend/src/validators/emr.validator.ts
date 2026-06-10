import { z } from 'zod';

const bpRegex = /^\d{2,3}\/\d{2,3}$/;

export const diagnosisSchema = z.object({
  code: z.string().min(1, 'ICD code is required'),
  name: z.string().min(1, 'Diagnosis name is required'),
  severity: z.string().min(1, 'Severity is required'),
  notes: z.string().optional(),
});

export const treatmentPlanSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  goals: z.string().optional(),
  duration: z.string().optional(),
  status: z.string().default('ACTIVE'),
  notes: z.string().optional(),
});

export const prescriptionMedicineSchema = z.object({
  medicineName: z.string().min(1, 'Medicine name is required'),
  strength: z.string().min(1, 'Strength is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().min(1, 'Duration is required'),
  instructions: z.string().optional(),
});

export const prescriptionSchema = z.object({
  notes: z.string().optional(),
  medicines: z.array(prescriptionMedicineSchema).min(1, 'At least one medicine is required'),
});

export const vitalSchema = z.object({
  bloodPressure: z.string().regex(bpRegex, 'BP must be in format Systolic/Diastolic (e.g., 120/80)'),
  heartRate: z.number().int().min(30).max(250, 'Heart rate must be between 30 and 250 bpm'),
  respiratoryRate: z.number().int().min(5).max(60, 'Respiratory rate must be between 5 and 60 bpm'),
  temperature: z.number().min(30).max(45, 'Temperature must be between 30.0 and 45.0 °C'),
  oxygenSaturation: z.number().int().min(50).max(100, 'Oxygen saturation must be between 50% and 100%'),
  height: z.number().min(30).max(300, 'Height must be between 30 and 300 cm'),
  weight: z.number().min(1).max(500, 'Weight must be between 1 and 500 kg'),
});

export const createMedicalRecordSchema = z.object({
  patientId: z.string().uuid('Invalid Patient ID'),
  doctorId: z.string().uuid('Invalid Doctor ID'),
  appointmentId: z.string().uuid('Invalid Appointment ID').optional(),
  symptoms: z.string().optional(),
  observations: z.string().optional(),
  followUpInstructions: z.string().optional(),
  diagnoses: z.array(diagnosisSchema).optional(),
  treatmentPlans: z.array(treatmentPlanSchema).optional(),
  prescriptions: z.array(prescriptionSchema).optional(),
  vitals: vitalSchema.optional(),
});

export const updateMedicalRecordSchema = z.object({
  symptoms: z.string().optional(),
  observations: z.string().optional(),
  followUpInstructions: z.string().optional(),
  changeReason: z.string().optional(),
  diagnoses: z.array(diagnosisSchema).optional(),
  treatmentPlans: z.array(treatmentPlanSchema).optional(),
  prescriptions: z.array(prescriptionSchema).optional(),
  vitals: vitalSchema.optional(),
});

export const restoreEMRSchema = z.object({
  version: z.number().int().positive('Version must be a positive integer'),
  changeReason: z.string().optional(),
});

export const allergySchema = z.object({
  allergen: z.string().min(1, 'Allergen is required'),
  reaction: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'SEVERE']),
  diagnosedAt: z.string().datetime({ precision: 3 }).optional(),
});

export const conditionSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'Condition name is required'),
  status: z.enum(['ACTIVE', 'RESOLVED', 'REMISSION']),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE']),
  diagnosedAt: z.string().datetime({ precision: 3 }).optional(),
});

export const documentSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileUrl: z.string().url('File URL must be a valid URL'),
  fileType: z.enum(['LAB_REPORT', 'X_RAY', 'MRI', 'CT', 'PRESCRIPTION', 'SCANNED_DOC']),
  fileSize: z.number().int().positive('File size must be positive'),
});
