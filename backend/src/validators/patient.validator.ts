import { z } from 'zod';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export const addressSchema = z.object({
  streetAddress: z.string().trim().min(3, 'Street address must be at least 3 characters'),
  city: z.string().trim().min(2, 'City must be at least 2 characters'),
  state: z.string().trim().min(2, 'State must be at least 2 characters'),
  postalCode: z.string().trim().regex(/^\d{6}$/, 'Postal code must be exactly 6 digits'),
  country: z.string().trim().min(2, 'Country must be at least 2 characters').optional().default('India'),
});

export const emergencyContactSchema = z.object({
  name: z.string().trim().min(3, 'Emergency contact name must be at least 3 characters'),
  relationship: z.string().trim().min(2, 'Relationship must be at least 2 characters'),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  email: z.string().trim().email('Invalid emergency contact email address').optional().or(z.literal('')),
});

export const insuranceSchema = z.object({
  providerName: z.string().trim().min(3, 'Provider name must be at least 3 characters'),
  policyNumber: z.string().trim().min(3, 'Policy number must be at least 3 characters'),
  policyHolderName: z.string().trim().min(3, 'Policy holder name must be at least 3 characters'),
  coverageDetails: z.string().trim().max(1000, 'Coverage details cannot exceed 1000 characters').optional(),
  expiryDate: z
    .string()
    .transform((val) => new Date(val))
    .refine((val) => val > new Date(), { message: 'Insurance expiry date must be in the future' })
    .optional(),
});

export const createPatientSchema = z.object({
  userId: z.string().uuid('Invalid user ID format').optional(),
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters'),
  dob: z
    .string()
    .transform((val) => new Date(val))
    .refine((val) => val < new Date(), { message: 'Date of birth must be in the past' }),
  gender: z.enum(['male', 'female', 'other'], { errorMap: () => ({ message: 'Invalid gender value' }) }),
  bloodGroup: z.enum(bloodGroups, { errorMap: () => ({ message: 'Invalid blood group type' }) }).optional(),
  email: z.string().trim().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  aadhaar: z.string().trim().regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits').optional().or(z.literal('')),
  address: addressSchema.optional(),
  emergencyContact: emergencyContactSchema.optional(),
  insuranceInfo: insuranceSchema.optional(),
});

export const updatePatientSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').optional(),
  dob: z
    .string()
    .transform((val) => new Date(val))
    .refine((val) => val < new Date(), { message: 'Date of birth must be in the past' })
    .optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  bloodGroup: z.enum(bloodGroups).optional(),
  email: z.string().trim().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits').optional(),
  aadhaar: z.string().trim().regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits').optional().or(z.literal('')),
  address: addressSchema.optional(),
  emergencyContact: emergencyContactSchema.optional(),
  insuranceInfo: insuranceSchema.optional(),
});

export const createMedicalHistorySchema = z.object({
  condition: z.string().trim().min(2, 'Condition name must be at least 2 characters'),
  diagnosedDate: z
    .string()
    .transform((val) => new Date(val))
    .refine((val) => val < new Date(), { message: 'Diagnosis date must be in the past' })
    .optional(),
  notes: z.string().trim().max(2000, 'Notes cannot exceed 2000 characters').optional(),
  allergies: z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
});
