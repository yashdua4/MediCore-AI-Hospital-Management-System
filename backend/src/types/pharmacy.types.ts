import {
  Medicine,
  MedicineCategory,
  MedicineInventory,
  MedicineBatch,
  MedicineSubstitution
} from '@prisma/client';

export interface MedicineCreateInput {
  name: string;
  genericName: string;
  brandName: string;
  strength: string;
  dosageForm: string;
  manufacturer: string;
  categoryId: string;
  prescriptionRequired?: boolean;
  price: number;
}

export interface SupplierCreateInput {
  name: string;
  contactName?: string;
  phone: string;
  email?: string;
  address?: string;
  performanceScore?: number;
}

export interface PurchaseOrderItemInput {
  medicineId: string;
  quantity: number;
  unitPrice: number;
  batchNumber?: string;
  expiryDate?: string; // ISO String or date format
}

export interface PurchaseOrderCreateInput {
  supplierId: string;
  items: PurchaseOrderItemInput[];
}

export interface PrescriptionDispenseItemInput {
  medicineId: string;
  quantity: number;
  batchNumber: string;
}

export interface PrescriptionDispenseInput {
  prescriptionId: string;
  items: PrescriptionDispenseItemInput[];
  notes?: string;
  paymentMethod: 'CASH' | 'CARD' | 'INSURANCE' | 'UPI';
}

export interface MedicineSubstitutionInput {
  originalMedicineId: string;
  substituteMedicineId: string;
  notes?: string;
}

export interface StockMovementInput {
  medicineId: string;
  batchNumber?: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RESERVED' | 'RELEASED';
  quantity: number;
  reason?: string;
}

export interface PharmacyDashboardMetricsResponse {
  dailyDispensedCount: number;
  lowStockItemsCount: number;
  expiringItemsCount: number;
  totalRevenueToday: number;
  lowStockAlerts: MedicineInventory[];
  expiringBatches: MedicineBatch[];
  supplierPerformance: {
    supplierId: string;
    name: string;
    performanceScore: number;
  }[];
}

export interface SupplierPerformanceResponse {
  supplierId: string;
  name: string;
  performanceScore: number;
}

export interface MedicineSearchResponse extends Medicine {
  category: MedicineCategory;
  inventories: MedicineInventory[];
  batches: MedicineBatch[];
  substitutes: MedicineSubstitution[];
}
