import { z } from 'zod';

export const createWardSchema = z.object({
  name: z.string().min(1, 'Ward name is required').max(255),
  type: z.enum(['GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'ICU', 'NICU', 'EMERGENCY', 'RECOVERY']),
  capacity: z.number().int().positive('Capacity must be a positive integer'),
});

export const createRoomSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required').max(50),
  wardId: z.string().uuid('Invalid ward ID'),
  roomType: z.enum(['GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'ICU', 'NICU', 'EMERGENCY', 'RECOVERY']),
  chargesPerDay: z.number().positive('Charges per day must be a positive number'),
});

export const createBedSchema = z.object({
  bedNumber: z.string().min(1, 'Bed number is required').max(50),
  roomId: z.string().uuid('Invalid room ID'),
});

export const admitPatientSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  doctorId: z.string().uuid('Invalid doctor ID'),
  reason: z.string().min(1, 'Admission reason is required').max(500),
  bedId: z.string().uuid('Invalid bed ID'),
});

export const transferPatientSchema = z.object({
  targetBedId: z.string().uuid('Invalid target bed ID'),
  reason: z.string().min(1, 'Transfer reason is required').max(500),
});

export const assignNurseSchema = z.object({
  nurseId: z.string().uuid('Invalid nurse user ID'),
  wardId: z.string().uuid('Invalid ward ID'),
  shiftStart: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid shift start date format',
  }),
  shiftEnd: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid shift end date format',
  }),
  notes: z.string().max(1000).optional(),
});

export const createNoteSchema = z.object({
  noteType: z.enum(['CLINICAL', 'NURSING', 'GENERAL']),
  content: z.string().min(1, 'Note content is required').max(2000),
});

export const dischargePatientSchema = z.object({
  treatmentSummary: z.string().min(1, 'Treatment summary is required').max(5000),
  medicationInstructions: z.string().min(1, 'Medication instructions are required').max(5000),
  followUpInstructions: z.string().min(1, 'Follow-up instructions are required').max(5000),
  dischargeCondition: z.string().min(1, 'Discharge condition description is required').max(255),
});

export const addChargeSchema = z.object({
  chargeType: z.enum(['ROOM', 'BED', 'NURSING', 'SPECIAL_CARE']),
  amount: z.number().positive('Charge amount must be positive'),
  quantity: z.number().int().positive('Quantity must be a positive integer').optional().default(1),
  description: z.string().min(1, 'Description is required').max(500),
});
