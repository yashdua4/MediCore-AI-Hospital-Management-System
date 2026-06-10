import { z } from 'zod';

export const createInvoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unitPrice: z.number().positive('Unit price must be positive'),
  itemType: z.enum([
    'CONSULTATION',
    'APPOINTMENT',
    'LAB_TEST',
    'MEDICINE',
    'ADMISSION',
    'EMERGENCY',
    'ROOM',
    'SURGERY',
  ]),
  referenceId: z.string().optional(),
});

export const createInvoiceSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  appointmentId: z.string().uuid('Invalid appointment ID').optional(),
  items: z.array(createInvoiceItemSchema).min(1, 'Invoice must have at least one item'),
  discountAmount: z.number().nonnegative('Discount amount cannot be negative').optional().default(0),
});

export const receivePaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be positive'),
  paymentMethodName: z.enum(['UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING', 'CASH', 'INSURANCE']),
  transactionRef: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
});

export const requestRefundSchema = z.object({
  amount: z.number().positive('Refund amount must be positive'),
  reason: z.string().min(1, 'Refund reason is required').max(1000),
});

export const processRefundSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export const createProviderSchema = z.object({
  name: z.string().min(1, 'Provider name is required').max(255),
  contactNumber: z.string().min(5, 'Valid contact number is required').max(50),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().max(500).optional(),
});

export const createPolicySchema = z.object({
  policyNumber: z.string().min(1, 'Policy number is required').max(100),
  providerId: z.string().uuid('Invalid provider ID'),
  patientId: z.string().uuid('Invalid patient ID'),
  coverageLimit: z.number().positive('Coverage limit must be positive'),
  expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid expiry date format',
  }),
});

export const submitClaimItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  claimedAmount: z.number().positive('Claimed amount must be positive'),
});

export const submitClaimSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  policyId: z.string().uuid('Invalid policy ID'),
  items: z.array(submitClaimItemSchema).min(1, 'Claim must have at least one item'),
});

export const claimItemApprovalSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  approvedAmount: z.number().nonnegative('Approved amount cannot be negative'),
  status: z.enum(['APPROVED', 'REJECTED']),
});

export const processClaimSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PARTIALLY_APPROVED']),
  approvedAmount: z.number().nonnegative('Total approved amount cannot be negative'),
  itemApprovals: z.array(claimItemApprovalSchema).min(1, 'At least one item approval is required'),
});
