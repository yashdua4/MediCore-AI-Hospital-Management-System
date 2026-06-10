import { z } from 'zod';

export const qualificationSchema = z.object({
  degree: z.string().trim().min(2, 'Degree must be at least 2 characters'),
  institution: z.string().trim().min(3, 'Institution must be at least 3 characters'),
  year: z.number().int().min(1950, 'Year must be after 1950').max(new Date().getFullYear(), 'Year cannot be in the future'),
});

export const scheduleSchema = z
  .object({
    dayOfWeek: z.number().int().min(0, 'Day must be between 0 (Sunday) and 6 (Saturday)').max(6, 'Day must be between 0 (Sunday) and 6 (Saturday)'),
    startTime: z.string().regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'),
    endTime: z.string().regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'),
  })
  .refine(
    (data) => {
      const [startH, startM] = data.startTime.split(':').map(Number);
      const [endH, endM] = data.endTime.split(':').map(Number);
      return startH * 60 + startM < endH * 60 + endM;
    },
    { message: 'Start time must be before end time', path: ['startTime'] }
  );

export const createAvailabilitySchema = z
  .object({
    date: z.string().transform((val) => new Date(val)),
    startTime: z
      .string()
      .regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be HH:MM format')
      .optional()
      .nullable(),
    endTime: z
      .string()
      .regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be HH:MM format')
      .optional()
      .nullable(),
    reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        const [startH, startM] = data.startTime.split(':').map(Number);
        const [endH, endM] = data.endTime.split(':').map(Number);
        return startH * 60 + startM < endH * 60 + endM;
      }
      return true;
    },
    { message: 'Start time must be before end time', path: ['startTime'] }
  );

export const createDoctorSchema = z.object({
  userId: z.string().uuid('Invalid user ID format').optional(),
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  licenseNumber: z.string().trim().min(3, 'License number must be at least 3 characters'),
  consultationFee: z.number().positive('Consultation fee must be a positive number'),
  departmentId: z.string().uuid('Invalid department ID format').optional(),
  departmentName: z.string().trim().min(2, 'Department name must be at least 2 characters').optional(),
  specializationIds: z.array(z.string().uuid('Invalid specialization ID format')).optional(),
  specializationNames: z.array(z.string().trim().min(2)).optional(),
  qualifications: z.array(qualificationSchema).optional(),
  schedules: z.array(scheduleSchema).optional(),
}).refine(
  (data) => data.departmentId || data.departmentName,
  { message: 'Either departmentId or departmentName is required', path: ['departmentId'] }
);

export const updateDoctorSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').optional(),
  email: z.string().trim().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits').optional(),
  licenseNumber: z.string().trim().min(3, 'License number must be at least 3 characters').optional(),
  consultationFee: z.number().positive('Consultation fee must be a positive number').optional(),
  departmentId: z.string().uuid('Invalid department ID format').optional(),
  departmentName: z.string().trim().min(2, 'Department name must be at least 2 characters').optional(),
  specializationIds: z.array(z.string().uuid('Invalid specialization ID format')).optional(),
  specializationNames: z.array(z.string().trim().min(2)).optional(),
  qualifications: z.array(qualificationSchema).optional(),
});

export const manageSchedulesSchema = z.array(scheduleSchema);
