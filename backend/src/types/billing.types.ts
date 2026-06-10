export interface CreateInvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  itemType: 'CONSULTATION' | 'APPOINTMENT' | 'LAB_TEST' | 'MEDICINE' | 'ADMISSION' | 'EMERGENCY' | 'ROOM' | 'SURGERY';
  referenceId?: string;
}

export interface CreateInvoiceInput {
  patientId: string;
  appointmentId?: string;
  items: CreateInvoiceItemInput[];
  discountAmount?: number;
}

export interface RecordPaymentInput {
  amount: number;
  paymentMethodName: string;
  transactionRef?: string;
  notes?: string;
}

export interface RequestRefundInput {
  amount: number;
  reason: string;
}

export interface CreateProviderInput {
  name: string;
  contactNumber: string;
  email?: string;
  address?: string;
}

export interface CreatePolicyInput {
  policyNumber: string;
  providerId: string;
  patientId: string;
  coverageLimit: number;
  expiryDate: string; // ISO date string
}

export interface SubmitClaimInput {
  invoiceId: string;
  policyId: string;
  items: {
    description: string;
    claimedAmount: number;
  }[];
}

export interface ClaimItemApprovalInput {
  itemId: string;
  approvedAmount: number;
  status: 'APPROVED' | 'REJECTED';
}

export interface ProcessClaimInput {
  status: 'APPROVED' | 'REJECTED' | 'PARTIALLY_APPROVED';
  approvedAmount: number;
  itemApprovals: ClaimItemApprovalInput[];
}

export interface ProcessRefundInput {
  status: 'APPROVED' | 'REJECTED';
}

export interface RevenueDashboardMetrics {
  dailyRevenue: number;
  monthlyRevenue: number;
  outstandingPayments: number;
  refundSummary: {
    pendingRefundsCount: number;
    approvedRefundsAmount: number;
  };
  departmentRevenue: {
    department: string;
    revenue: number;
  }[];
  revenueTrends: {
    date: string;
    revenue: number;
  }[];
}

export interface InsuranceDashboardMetrics {
  totalClaimsCount: number;
  claimsByStatus: {
    status: string;
    count: number;
    amount: number;
  }[];
  claimApprovalRate: number;
  totalClaimedAmount: number;
  totalSettledAmount: number;
  topProviders: {
    providerName: string;
    claimsCount: number;
    settledAmount: number;
  }[];
}
