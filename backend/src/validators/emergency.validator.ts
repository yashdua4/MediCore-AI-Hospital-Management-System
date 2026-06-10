import { z } from 'zod';

export const createEmergencyCaseSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  arrivalMode: z.string().min(1, 'Arrival mode is required').max(100),
  chiefComplaint: z.string().min(1, 'Chief complaint is required').max(1000),
});

export const triageAssessmentSchema = z.object({
  triageLevel: z.enum([
    'LEVEL_1_CRITICAL',
    'LEVEL_2_EMERGENCY',
    'LEVEL_3_URGENT',
    'LEVEL_4_SEMI_URGENT',
    'LEVEL_5_NON_URGENT'
  ]),
  chiefComplaint: z.string().min(1, 'Chief complaint is required').max(1000),
  symptoms: z.string().min(1, 'Symptoms description is required').max(2000),
  systolicBP: z.number().positive('Systolic BP must be positive').optional(),
  diastolicBP: z.number().positive('Diastolic BP must be positive').optional(),
  heartRate: z.number().positive('Heart rate must be positive').optional(),
  temperature: z.number().positive('Temperature must be positive').optional(),
  respiratoryRate: z.number().positive('Respiratory rate must be positive').optional(),
  oxygenSaturation: z.number().min(0).max(100, 'Oxygen saturation must be between 0 and 100').optional(),
  triageNotes: z.string().max(2000).optional(),
});

export const assignDoctorSchema = z.object({
  doctorId: z.string().uuid('Invalid doctor ID'),
  role: z.string().min(1, 'Doctor role is required').max(100),
});

export const respondAssignmentSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
});

export const createTreatmentSchema = z.object({
  treatmentDescription: z.string().min(1, 'Treatment description is required').max(2000),
  notes: z.string().max(2000).optional(),
});

export const createProcedureSchema = z.object({
  procedureType: z.enum([
    'CPR',
    'INTUBATION',
    'DEFIBRILLATION',
    'EMERGENCY_SURGERY',
    'TRAUMA_STABILIZATION',
    'OTHER'
  ]),
  notes: z.string().max(2000).optional(),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start time format',
  }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid end time format',
  }).optional(),
  outcome: z.string().min(1, 'Outcome is required').max(100),
});

export const createTraumaCaseSchema = z.object({
  injuryMechanism: z.string().min(1, 'Injury mechanism is required').max(200),
  severityScore: z.number().int().min(1).max(75, 'ISS must be between 1 and 75').optional(),
  gcsScore: z.number().int().min(3).max(15, 'GCS must be between 3 and 15').optional(),
  isMultiTrauma: z.boolean().optional().default(false),
  surgicalConsultationRequired: z.boolean().optional().default(false),
  traumaSurgeonId: z.string().uuid('Invalid trauma surgeon doctor ID').optional(),
});

export const initiateTransferSchema = z.object({
  transferType: z.enum([
    'ICU_TRANSFER',
    'WARD_TRANSFER',
    'EXTERNAL_HOSPITAL_TRANSFER'
  ]),
  reason: z.string().min(1, 'Transfer reason is required').max(1000),
  destination: z.string().min(1, 'Destination unit/hospital is required').max(200),
});

export const approveTransferSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export const triggerAlertSchema = z.object({
  alertType: z.enum([
    'CARDIAC_ARREST',
    'STROKE',
    'SEVERE_TRAUMA',
    'RESPIRATORY_FAILURE',
    'ICU_ESCALATION',
    'MASS_CASUALTY'
  ]),
  notes: z.string().max(2000).optional(),
});

export const resolveAlertSchema = z.object({
  notes: z.string().max(2000).optional(),
});

export const createDispositionSchema = z.object({
  outcome: z.enum([
    'DISCHARGED',
    'ADMITTED',
    'TRANSFERRED',
    'DECEASED',
    'LEFT_AGAINST_MEDICAL_ADVICE'
  ]),
  notes: z.string().max(2000).optional(),
});

export const massCasualtySchema = z.object({
  incidentType: z.string().min(1, 'Incident type is required').max(200),
  patientCount: z.number().int().positive('Patient count must be positive').max(50, 'Max 50 patients per request'),
  chiefComplaint: z.string().min(1, 'Chief complaint description is required').max(1000),
});
