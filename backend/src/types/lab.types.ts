import { LabOrder, LabSample, LabResult, LabReport, LabInventory, LabTest } from '@prisma/client';

export interface LabOrderCreateInput {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  labTestId: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT' | 'EMERGENCY';
  clinicalNotes?: string;
}

export interface LabTechnicianAssignmentInput {
  technicianId: string;
}

export interface LabSampleCollectInput {
  sampleType: string;
  storageLocation?: string;
}

export interface LabResultValueInput {
  parameter: string;
  value: string;
  unit: string;
  notes?: string;
}

export interface LabResultEntryInput {
  results: LabResultValueInput[];
}

export interface LabInventoryItemInput {
  itemName: string;
  category: 'REAGENT' | 'CHEMICAL' | 'CONSUMABLE';
  quantity: number;
  unit: string;
  minStockLevel: number;
  expiryDate?: string; // ISO string
  storageLocation?: string;
}

export interface LabOrderResponse extends LabOrder {
  labTest: LabTest;
  samples: LabSample[];
  results: LabResult[];
  reports: LabReport[];
}

export interface TechnicianWorkloadResponse {
  technicianId: string;
  technicianName: string;
  assignedCount: number;
}

export interface LabDashboardMetricsResponse {
  totalOrders: number;
  pendingSamplesCount: number;
  processingCount: number;
  completedCount: number;
  criticalAlertsCount: number;
  technicianWorkload: TechnicianWorkloadResponse[];
  averageTurnaroundTimeMinutes: number;
  lowStockItems: LabInventory[];
}

export interface CriticalResultAlert {
  labOrderId: string;
  patientName: string;
  parameter: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: string; // CRITICAL
  enteredAt: Date;
}
