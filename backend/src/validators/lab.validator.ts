import { z } from 'zod';

export const createLabOrderSchema = z.object({
  patientId: z.string().uuid('Invalid Patient ID'),
  doctorId: z.string().uuid('Invalid Doctor ID'),
  appointmentId: z.string().uuid('Invalid Appointment ID').optional(),
  labTestId: z.string().uuid('Invalid Lab Test ID'),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT', 'EMERGENCY']),
  clinicalNotes: z.string().max(1000, 'Clinical notes cannot exceed 1000 characters').optional(),
});

export const assignTechnicianSchema = z.object({
  technicianId: z.string().uuid('Invalid Technician User ID'),
});

export const collectSampleSchema = z.object({
  sampleType: z.string().min(1, 'Sample type is required').max(100),
  storageLocation: z.string().max(255).optional(),
});

export const labResultValueSchema = z.object({
  parameter: z.string().min(1, 'Parameter name is required'),
  value: z.string().min(1, 'Result value is required'),
  unit: z.string().min(1, 'Unit is required'),
  notes: z.string().optional(),
});

export const enterResultsSchema = z.object({
  results: z.array(labResultValueSchema).min(1, 'At least one parameter result is required'),
});

export const approveResultsSchema = z.object({
  notes: z.string().optional(),
});

export const labInventoryItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required').max(255),
  category: z.enum(['REAGENT', 'CHEMICAL', 'CONSUMABLE']),
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  unit: z.string().min(1, 'Unit is required').max(50),
  minStockLevel: z.number().int().min(0, 'Minimum stock level cannot be negative'),
  expiryDate: z.string().datetime({ precision: 3 }).or(z.string().date()).optional(),
  storageLocation: z.string().max(255).optional(),
});
