import { z } from 'zod';

export const createMedicineSchema = z.object({
  name: z.string().min(1, 'Medicine name is required').max(255),
  genericName: z.string().min(1, 'Generic name is required').max(255),
  brandName: z.string().min(1, 'Brand name is required').max(255),
  strength: z.string().min(1, 'Strength is required').max(50),
  dosageForm: z.string().min(1, 'Dosage form is required').max(100),
  manufacturer: z.string().min(1, 'Manufacturer is required').max(255),
  categoryId: z.string().uuid('Invalid category ID'),
  prescriptionRequired: z.boolean().default(true),
  price: z.number().positive('Price must be a positive number'),
});

export const updateMedicineSchema = createMedicineSchema.partial();

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(255),
  contactName: z.string().max(255).optional(),
  phone: z.string().min(5, 'Valid phone number is required').max(50),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  performanceScore: z.number().min(0).max(5).optional(),
});

export const purchaseOrderItemSchema = z.object({
  medicineId: z.string().uuid('Invalid medicine ID'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
  batchNumber: z.string().min(1, 'Batch number is required').optional(),
  expiryDate: z.string().datetime({ precision: 3 }).or(z.string().date()).optional(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID'),
  items: z.array(purchaseOrderItemSchema).min(1, 'Purchase order must have at least one item'),
});

export const dispenseItemSchema = z.object({
  medicineId: z.string().uuid('Invalid medicine ID'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  batchNumber: z.string().min(1, 'Batch number is required'),
});

export const dispensePrescriptionSchema = z.object({
  prescriptionId: z.string().uuid('Invalid prescription ID'),
  items: z.array(dispenseItemSchema).min(1, 'At least one medicine must be dispensed'),
  notes: z.string().max(1000).optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'INSURANCE', 'UPI']).default('CASH'),
});

export const createSubstitutionSchema = z.object({
  originalMedicineId: z.string().uuid('Invalid original medicine ID'),
  substituteMedicineId: z.string().uuid('Invalid substitute medicine ID'),
  notes: z.string().max(1000).optional(),
});

export const stockMovementSchema = z.object({
  medicineId: z.string().uuid('Invalid medicine ID'),
  batchNumber: z.string().optional(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'RESERVED', 'RELEASED']),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  reason: z.string().max(500).optional(),
});
