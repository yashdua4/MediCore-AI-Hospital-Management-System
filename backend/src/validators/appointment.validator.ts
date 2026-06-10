import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';

const statusValues = Object.values(AppointmentStatus) as [string, ...string[]];

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID format'),
  doctorId: z.string().uuid('Invalid doctor ID format'),
  date: z
    .string()
    .transform((val) => new Date(val))
    .refine(
      (val) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return val >= today;
      },
      { message: 'Appointment date cannot be in the past' }
    ),
  time: z.string().regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
  duration: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).optional().default(30),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

export const updateAppointmentSchema = z.object({
  doctorId: z.string().uuid('Invalid doctor ID format').optional(),
  date: z
    .string()
    .transform((val) => new Date(val))
    .refine(
      (val) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return val >= today;
      },
      { message: 'Appointment date cannot be in the past' }
    )
    .optional(),
  time: z.string().regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format').optional(),
  duration: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).optional(),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

export const rescheduleAppointmentSchema = z.object({
  date: z
    .string()
    .transform((val) => new Date(val))
    .refine(
      (val) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return val >= today;
      },
      { message: 'Appointment date cannot be in the past' }
    ),
  time: z.string().regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
  duration: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).optional(),
  reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(statusValues as [string, ...string[]], {
    errorMap: () => ({ message: 'Invalid appointment status value' }),
  }),
  reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional(),
});

export const createAppointmentNoteSchema = z.object({
  content: z.string().trim().min(1, 'Note content cannot be empty').max(2000, 'Note cannot exceed 2000 characters'),
});

export const createAppointmentAttachmentSchema = z.object({
  fileName: z.string().trim().min(1, 'File name is required'),
  fileUrl: z.string().trim().url('Invalid file URL format'),
  fileType: z.string().trim().min(1, 'File type is required'),
});
