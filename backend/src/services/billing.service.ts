import prisma from '../config/prisma';
import { AuditService } from './audit.service';
import {
  CreateInvoiceInput,
  RecordPaymentInput,
  RequestRefundInput,
  ProcessRefundInput,
  CreateProviderInput,
  CreatePolicyInput,
  SubmitClaimInput,
  ProcessClaimInput,
  RevenueDashboardMetrics,
  InsuranceDashboardMetrics,
} from '../types/billing.types';
import { Prisma } from '@prisma/client';

export class BillingService {
  /**
   * Helper to write to DataAccessLog.
   */
  private static async logDataAccess(
    userId: string | undefined,
    resourceId: string,
    action: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    if (!userId) return;
    try {
      await prisma.dataAccessLog.create({
        data: {
          userId,
          resource: 'BILLING',
          resourceId,
          action,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to log billing data access:', error);
    }
  }

  /**
   * Helper to log financial audits.
   */
  private static async logFinancialAudit(
    recordType: 'INVOICE' | 'PAYMENT' | 'REFUND' | 'CLAIM',
    recordId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE',
    performedById: string,
    ipAddress: string,
    preValue?: any,
    postValue?: any
  ) {
    try {
      await prisma.financialAudit.create({
        data: {
          recordType,
          recordId,
          action,
          performedById,
          preValue: preValue ? (JSON.parse(JSON.stringify(preValue)) as Prisma.InputJsonValue) : undefined,
          postValue: postValue ? (JSON.parse(JSON.stringify(postValue)) as Prisma.InputJsonValue) : undefined,
          ipAddress,
        },
      });
    } catch (error) {
      console.error('Failed to write financial audit:', error);
    }
  }

  /**
   * Create an invoice (Draft by default).
   */
  static async createInvoice(
    data: CreateInvoiceInput,
    actorUserId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    // Verify patient
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
    });
    if (!patient) {
      throw new Error(`Patient with ID '${data.patientId}' not found`);
    }

    // Verify appointment if provided
    if (data.appointmentId) {
      const appt = await prisma.appointment.findUnique({
        where: { id: data.appointmentId },
      });
      if (!appt) {
        throw new Error(`Appointment with ID '${data.appointmentId}' not found`);
      }
    }

    // Calculations
    const subTotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = parseFloat((subTotal * 0.18).toFixed(2));
    const discountAmount = data.discountAmount || 0;
    const totalAmount = parseFloat((subTotal + taxAmount - discountAmount).toFixed(2));
    const outstandingAmount = totalAmount;

    const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoiceNumber,
          patientId: data.patientId,
          appointmentId: data.appointmentId || null,
          status: 'DRAFT',
          subTotal: new Prisma.Decimal(subTotal),
          taxAmount: new Prisma.Decimal(taxAmount),
          discountAmount: new Prisma.Decimal(discountAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(0),
          outstandingAmount: new Prisma.Decimal(outstandingAmount),
          items: {
            create: data.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              totalPrice: new Prisma.Decimal(item.quantity * item.unitPrice),
              itemType: item.itemType,
              referenceId: item.referenceId || null,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return created;
    });

    // Logging & Audit
    await this.logFinancialAudit('INVOICE', invoice.id, 'CREATE', actorUserId, ipAddress, null, invoice);
    await AuditService.log('INVOICE_CREATED', 'Invoice', `Invoice ${invoice.invoiceNumber} created for patient ${invoice.patientId}`, actorUserId, ipAddress, userAgent);

    return invoice;
  }

  /**
   * Finalize an invoice.
   */
  static async finalizeInvoice(
    id: string,
    actorUserId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      throw new Error(`Invoice with ID '${id}' not found`);
    }
    if (existing.status !== 'DRAFT') {
      throw new Error(`Invoice has already been finalized or cancelled`);
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'FINALIZED' },
      include: { items: true },
    });

    await this.logFinancialAudit('INVOICE', id, 'STATUS_CHANGE', actorUserId, ipAddress, existing, updated);
    await AuditService.log('INVOICE_UPDATED', 'Invoice', `Invoice ${existing.invoiceNumber} finalized`, actorUserId, ipAddress, userAgent);

    return updated;
  }

  /**
   * Cancel an invoice.
   */
  static async cancelInvoice(
    id: string,
    actorUserId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!existing) {
      throw new Error(`Invoice with ID '${id}' not found`);
    }
    if (existing.status === 'CANCELLED' || existing.status === 'PAID') {
      throw new Error(`Cannot cancel invoice because it is already ${existing.status}`);
    }

    // Check if any payments are paid
    const hasPaidPayments = existing.payments.some((p) => p.status === 'PAID');
    if (hasPaidPayments) {
      throw new Error(`Cannot cancel invoice with completed payments`);
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.logFinancialAudit('INVOICE', id, 'STATUS_CHANGE', actorUserId, ipAddress, existing, updated);
    await AuditService.log('INVOICE_UPDATED', 'Invoice', `Invoice ${existing.invoiceNumber} cancelled`, actorUserId, ipAddress, userAgent);

    return updated;
  }

  /**
   * Record a payment against a finalized/partially paid invoice.
   */
  static async recordPayment(
    invoiceId: string,
    data: RecordPaymentInput,
    actorUserId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) {
      throw new Error(`Invoice with ID '${invoiceId}' not found`);
    }
    if (invoice.status !== 'FINALIZED' && invoice.status !== 'PARTIALLY_PAID') {
      throw new Error(`Payments can only be recorded on FINALIZED or PARTIALLY_PAID invoices. Current status: ${invoice.status}`);
    }

    const requestedAmount = Number(data.amount);
    const currentOutstanding = invoice.outstandingAmount.toNumber();
    if (requestedAmount > currentOutstanding) {
      throw new Error(`Payment amount (${requestedAmount}) exceeds outstanding balance (${currentOutstanding})`);
    }

    // Find or create PaymentMethod
    const method = await prisma.paymentMethod.upsert({
      where: { name: data.paymentMethodName },
      update: {},
      create: { name: data.paymentMethodName, description: `${data.paymentMethodName} payment option` },
    });

    const result = await prisma.$transaction(async (tx) => {
      // Create payment (mocking successful payment flow)
      const paymentStatus = 'PAID';

      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amount: new Prisma.Decimal(requestedAmount),
          paymentMethodId: method.id,
          status: paymentStatus,
          transactionRef: data.transactionRef || `REF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          notes: data.notes || null,
        },
      });

      const newPaidAmount = invoice.paidAmount.toNumber() + requestedAmount;
      const newOutstanding = parseFloat((currentOutstanding - requestedAmount).toFixed(2));
      const newInvoiceStatus = newOutstanding === 0 ? 'PAID' : 'PARTIALLY_PAID';

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: new Prisma.Decimal(newPaidAmount),
          outstandingAmount: new Prisma.Decimal(newOutstanding),
          status: newInvoiceStatus,
        },
      });

      // Create transaction audit log
      await tx.revenueTransaction.create({
        data: {
          invoiceId,
          type: 'CREDIT',
          amount: new Prisma.Decimal(requestedAmount),
          description: `Payment of ${requestedAmount} via ${data.paymentMethodName}. Ref: ${payment.transactionRef}`,
        },
      });

      return { payment, updatedInvoice };
    });

    await this.logFinancialAudit('PAYMENT', result.payment.id, 'CREATE', actorUserId, ipAddress, null, result.payment);
    await this.logFinancialAudit('INVOICE', invoice.id, 'STATUS_CHANGE', actorUserId, ipAddress, invoice, result.updatedInvoice);
    await AuditService.log('PAYMENT_RECEIVED', 'Payment', `Received payment of ${requestedAmount} for invoice ${invoice.invoiceNumber}`, actorUserId, ipAddress, userAgent);

    return result;
  }

  /**
   * Request a Refund (Accountants/Admins).
   */
  static async requestRefund(
    paymentId: string,
    data: RequestRefundInput,
    actorUserId: string,
    ipAddress: string = '127.0.0.1',
    _userAgent: string = 'System'
  ) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true, refunds: true },
    });
    if (!payment) {
      throw new Error(`Payment with ID '${paymentId}' not found`);
    }
    if (payment.status !== 'PAID') {
      throw new Error(`Refunds can only be requested for completed (PAID) payments`);
    }

    const refundAmount = Number(data.amount);
    const alreadyRefunded = payment.refunds
      .filter((r) => r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.amount.toNumber(), 0);

    const maxRefundable = payment.amount.toNumber() - alreadyRefunded;
    if (refundAmount > maxRefundable) {
      throw new Error(`Requested refund amount (${refundAmount}) exceeds maximum refundable amount (${maxRefundable})`);
    }

    const refund = await prisma.refund.create({
      data: {
        paymentId,
        invoiceId: payment.invoiceId,
        amount: new Prisma.Decimal(refundAmount),
        status: 'PENDING',
        reason: data.reason,
      },
    });

    await this.logFinancialAudit('REFUND', refund.id, 'CREATE', actorUserId, ipAddress, null, refund);
    return refund;
  }

  /**
   * Process a Refund (Approve/Reject by Accountant/Admin).
   */
  static async processRefund(
    refundId: string,
    data: ProcessRefundInput,
    actorUserId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: { include: { refunds: true } }, invoice: true },
    });
    if (!refund) {
      throw new Error(`Refund with ID '${refundId}' not found`);
    }
    if (refund.status !== 'PENDING') {
      throw new Error(`Refund has already been processed: ${refund.status}`);
    }

    const result = await prisma.$transaction(async (tx) => {
      if (data.status === 'APPROVED') {
        const refundAmount = refund.amount.toNumber();

        // Update refund record
        const updatedRefund = await tx.refund.update({
          where: { id: refundId },
          data: {
            status: 'APPROVED',
            processedById: actorUserId,
            processedAt: new Date(),
          },
        });

        // Sum up all approved refunds for this payment to decide if fully or partially refunded
        const otherApprovedRefunds = refund.payment.refunds
          .filter((r) => r.status === 'APPROVED' && r.id !== refundId)
          .reduce((sum, r) => sum + r.amount.toNumber(), 0);

        const totalRefunded = otherApprovedRefunds + refundAmount;
        const newPaymentStatus = totalRefunded >= refund.payment.amount.toNumber() ? 'REFUNDED' : 'PAID';

        await tx.payment.update({
          where: { id: refund.paymentId },
          data: { status: newPaymentStatus },
        });

        // Recalculate invoice amounts: decrease paid, increase outstanding
        const newPaidAmount = Math.max(0, refund.invoice.paidAmount.toNumber() - refundAmount);
        const newOutstandingAmount = parseFloat((refund.invoice.outstandingAmount.toNumber() + refundAmount).toFixed(2));
        
        let newInvoiceStatus = refund.invoice.status;
        if (newOutstandingAmount > 0) {
          newInvoiceStatus = newPaidAmount > 0 ? 'PARTIALLY_PAID' : 'FINALIZED';
        }

        await tx.invoice.update({
          where: { id: refund.invoiceId },
          data: {
            paidAmount: new Prisma.Decimal(newPaidAmount),
            outstandingAmount: new Prisma.Decimal(newOutstandingAmount),
            status: newInvoiceStatus,
          },
        });

        // Write Revenue Debit Transaction
        await tx.revenueTransaction.create({
          data: {
            invoiceId: refund.invoiceId,
            type: 'DEBIT',
            amount: refund.amount,
            description: `Approved refund for payment ${refund.paymentId}. Reason: ${refund.reason}`,
          },
        });

        return updatedRefund;
      } else {
        // Rejected
        return await tx.refund.update({
          where: { id: refundId },
          data: {
            status: 'REJECTED',
            processedById: actorUserId,
            processedAt: new Date(),
          },
        });
      }
    });

    await this.logFinancialAudit('REFUND', refundId, 'STATUS_CHANGE', actorUserId, ipAddress, refund, result);

    if (data.status === 'APPROVED') {
      await AuditService.log(
        'REFUND_ISSUED',
        'Refund',
        `Approved refund of ${refund.amount.toNumber()} for invoice ${refund.invoice.invoiceNumber}`,
        actorUserId,
        ipAddress,
        userAgent
      );
    }

    return result;
  }

  /**
   * Create an Insurance Provider (Admin).
   */
  static async createProvider(data: CreateProviderInput) {
    const existing = await prisma.insuranceProvider.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new Error(`Insurance provider with name '${data.name}' already exists`);
    }

    return await prisma.insuranceProvider.create({
      data,
    });
  }

  /**
   * Create an Insurance Policy for a patient (Admin).
   */
  static async createPolicy(data: CreatePolicyInput) {
    const existing = await prisma.insurancePolicy.findUnique({
      where: { policyNumber: data.policyNumber },
    });
    if (existing) {
      throw new Error(`Insurance policy with number '${data.policyNumber}' already exists`);
    }

    const provider = await prisma.insuranceProvider.findUnique({
      where: { id: data.providerId },
    });
    if (!provider) {
      throw new Error(`Insurance provider with ID '${data.providerId}' not found`);
    }

    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
    });
    if (!patient) {
      throw new Error(`Patient with ID '${data.patientId}' not found`);
    }

    return await prisma.insurancePolicy.create({
      data: {
        policyNumber: data.policyNumber,
        providerId: data.providerId,
        patientId: data.patientId,
        coverageLimit: new Prisma.Decimal(data.coverageLimit),
        expiryDate: new Date(data.expiryDate),
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Submit an Insurance Claim (Billing Executive/Admin).
   */
  static async submitInsuranceClaim(
    data: SubmitClaimInput,
    actorUserId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
    });
    if (!invoice) {
      throw new Error(`Invoice with ID '${data.invoiceId}' not found`);
    }
    if (invoice.status !== 'FINALIZED' && invoice.status !== 'PARTIALLY_PAID') {
      throw new Error(`Claims can only be generated for FINALIZED or PARTIALLY_PAID invoices.`);
    }

    const policy = await prisma.insurancePolicy.findUnique({
      where: { id: data.policyId },
      include: { provider: true },
    });
    if (!policy) {
      throw new Error(`Insurance policy with ID '${data.policyId}' not found`);
    }
    if (policy.patientId !== invoice.patientId) {
      throw new Error(`Policy patient ID does not match invoice patient ID`);
    }

    // Verify policy active
    if (policy.status !== 'ACTIVE') {
      throw new Error(`Insurance policy is not active (Status: ${policy.status})`);
    }
    if (new Date(policy.expiryDate).getTime() < Date.now()) {
      throw new Error(`Insurance policy has expired on ${policy.expiryDate.toDateString()}`);
    }

    const totalClaimed = data.items.reduce((sum, item) => sum + item.claimedAmount, 0);
    const remainingLimit = policy.coverageLimit.toNumber() - policy.usedCoverage.toNumber();
    if (totalClaimed > remainingLimit) {
      throw new Error(`Total claimed amount (${totalClaimed}) exceeds policy's remaining coverage limit (${remainingLimit})`);
    }

    const claimNumber = `CLM-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const claim = await prisma.insuranceClaim.create({
      data: {
        claimNumber,
        invoiceId: data.invoiceId,
        policyId: data.policyId,
        providerId: policy.providerId,
        status: 'SUBMITTED',
        totalClaimedAmount: new Prisma.Decimal(totalClaimed),
        items: {
          create: data.items.map((item) => ({
            description: item.description,
            claimedAmount: new Prisma.Decimal(item.claimedAmount),
            status: 'SUBMITTED',
          })),
        },
      },
      include: {
        items: true,
      },
    });

    await this.logFinancialAudit('CLAIM', claim.id, 'CREATE', actorUserId, ipAddress, null, claim);
    await AuditService.log(
      'CLAIM_SUBMITTED',
      'InsuranceClaim',
      `Submitted insurance claim ${claim.claimNumber} for invoice ${invoice.invoiceNumber}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return claim;
  }

  /**
   * Process/Review an Insurance Claim (Admin/Accountant/Provider).
   */
  static async processInsuranceClaim(
    claimId: string,
    data: ProcessClaimInput,
    actorUserId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      include: { items: true, invoice: true, policy: true },
    });
    if (!claim) {
      throw new Error(`Insurance claim with ID '${claimId}' not found`);
    }
    if (claim.status === 'SETTLED' || claim.status === 'APPROVED' || claim.status === 'REJECTED') {
      throw new Error(`Claim has already been processed with status: ${claim.status}`);
    }

    const approvedAmount = Number(data.approvedAmount);
    if (approvedAmount > claim.totalClaimedAmount.toNumber()) {
      throw new Error(`Approved amount (${approvedAmount}) cannot exceed claimed amount (${claim.totalClaimedAmount.toNumber()})`);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update items status
      for (const itemApproval of data.itemApprovals) {
        await tx.insuranceClaimItem.update({
          where: { id: itemApproval.itemId },
          data: {
            approvedAmount: new Prisma.Decimal(itemApproval.approvedAmount),
            status: itemApproval.status,
          },
        });
      }

      // 2. Update Claim Status
      const updatedClaim = await tx.insuranceClaim.update({
        where: { id: claimId },
        data: {
          status: data.status,
          totalApprovedAmount: new Prisma.Decimal(approvedAmount),
          settledAt: new Date(),
        },
        include: { items: true },
      });

      if (data.status === 'APPROVED' || data.status === 'PARTIALLY_APPROVED') {
        // 3. Increment policy's usedCoverage
        await tx.insurancePolicy.update({
          where: { id: claim.policyId },
          data: {
            usedCoverage: { increment: new Prisma.Decimal(approvedAmount) },
          },
        });

        // 4. Record Invoice Payment from Insurance
        const method = await tx.paymentMethod.upsert({
          where: { name: 'INSURANCE' },
          update: {},
          create: { name: 'INSURANCE', description: 'Insurance payout coverage' },
        });

        await tx.payment.create({
          data: {
            invoiceId: claim.invoiceId,
            amount: new Prisma.Decimal(approvedAmount),
            paymentMethodId: method.id,
            status: 'PAID',
            transactionRef: `INS-CLAIM-${claim.claimNumber}`,
            notes: `Settled from Insurance Provider for claim ${claim.claimNumber}`,
          },
        });

        // 5. Update Invoice outstanding
        const newPaidAmount = claim.invoice.paidAmount.toNumber() + approvedAmount;
        const newOutstanding = Math.max(0, parseFloat((claim.invoice.outstandingAmount.toNumber() - approvedAmount).toFixed(2)));
        const newInvoiceStatus = newOutstanding === 0 ? 'PAID' : 'PARTIALLY_PAID';

        await tx.invoice.update({
          where: { id: claim.invoiceId },
          data: {
            paidAmount: new Prisma.Decimal(newPaidAmount),
            outstandingAmount: new Prisma.Decimal(newOutstanding),
            status: newInvoiceStatus,
          },
        });

        // 6. Revenue Transaction
        await tx.revenueTransaction.create({
          data: {
            invoiceId: claim.invoiceId,
            type: 'CREDIT',
            amount: new Prisma.Decimal(approvedAmount),
            description: `Insurance settlement credit of ${approvedAmount} for claim ${claim.claimNumber}`,
          },
        });

        // Transition claim to SETTLED status
        return await tx.insuranceClaim.update({
          where: { id: claimId },
          data: { status: 'SETTLED' },
          include: { items: true },
        });
      }

      return updatedClaim;
    });

    await this.logFinancialAudit('CLAIM', claimId, 'STATUS_CHANGE', actorUserId, ipAddress, claim, result);

    if (data.status === 'APPROVED' || data.status === 'PARTIALLY_APPROVED') {
      await AuditService.log(
        'CLAIM_APPROVED',
        'InsuranceClaim',
        `Approved claim ${claim.claimNumber} with amount ${approvedAmount}`,
        actorUserId,
        ipAddress,
        userAgent
      );
    } else {
      await AuditService.log(
        'CLAIM_REJECTED',
        'InsuranceClaim',
        `Rejected claim ${claim.claimNumber}`,
        actorUserId,
        ipAddress,
        userAgent
      );
    }

    return result;
  }

  /**
   * Get invoice by ID (ownership protection checked at route/controller).
   */
  static async getInvoiceById(id: string, actorUserId?: string, ipAddress?: string, userAgent?: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        payments: { include: { paymentMethod: true } },
        claims: true,
        refunds: true,
        patient: true,
      },
    });

    if (invoice) {
      await this.logDataAccess(actorUserId, id, 'READ', ipAddress, userAgent);
    }

    return invoice;
  }

  /**
   * Fetch patient invoices.
   */
  static async getPatientInvoices(patientId: string, actorUserId?: string, ipAddress?: string, userAgent?: string) {
    const invoices = await prisma.invoice.findMany({
      where: { patientId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    await this.logDataAccess(actorUserId, patientId, 'READ_ALL_PATIENT_INVOICES', ipAddress, userAgent);
    return invoices;
  }

  /**
   * Revenue Dashboard metrics.
   */
  static async getRevenueDashboard(actorUserId?: string, ipAddress?: string, userAgent?: string): Promise<RevenueDashboardMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Daily revenue: Sum of payment amounts today (where status = PAID)
    const dailyPayments = await prisma.payment.findMany({
      where: {
        status: 'PAID',
        paymentDate: { gte: today },
      },
    });
    const dailyRevenue = dailyPayments.reduce((sum, p) => sum + p.amount.toNumber(), 0);

    // 2. Monthly revenue: Sum of payments this month
    const monthlyPayments = await prisma.payment.findMany({
      where: {
        status: 'PAID',
        paymentDate: { gte: firstDayOfMonth },
      },
    });
    const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + p.amount.toNumber(), 0);

    // 3. Outstanding Payments
    const outstandingAgg = await prisma.invoice.aggregate({
      where: {
        status: { in: ['FINALIZED', 'PARTIALLY_PAID'] },
      },
      _sum: {
        outstandingAmount: true,
      },
    });
    const outstandingPayments = outstandingAgg._sum.outstandingAmount?.toNumber() || 0;

    // 4. Refund Summary
    const pendingRefundsCount = await prisma.refund.count({
      where: { status: 'PENDING' },
    });
    const approvedRefundsAgg = await prisma.refund.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amount: true },
    });
    const approvedRefundsAmount = approvedRefundsAgg._sum.amount?.toNumber() || 0;

    // 5. Department wise Revenue: Join InvoiceItem -> Invoice -> Appointment -> Doctor -> Department
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          status: { in: ['PAID', 'PARTIALLY_PAID'] },
        },
      },
      include: {
        invoice: {
          include: {
            appointment: {
              include: {
                doctor: {
                  include: {
                    department: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const deptMap: { [key: string]: number } = {};
    for (const item of invoiceItems) {
      const deptName = item.invoice.appointment?.doctor?.department?.name || 'General Outpatient';
      deptMap[deptName] = (deptMap[deptName] || 0) + item.totalPrice.toNumber();
    }
    const departmentRevenue = Object.keys(deptMap).map((dept) => ({
      department: dept,
      revenue: deptMap[dept],
    }));

    // 6. Revenue Trends (last 7 days payments)
    const trends: { [key: string]: number } = {};
    for (let i = 6; i >= 0; i--) {
      const dateStr = new Date(today.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      trends[dateStr] = 0;
    }

    const pastWeekPayments = await prisma.payment.findMany({
      where: {
        status: 'PAID',
        paymentDate: { gte: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000) },
      },
    });

    for (const p of pastWeekPayments) {
      const dateStr = p.paymentDate.toISOString().split('T')[0];
      if (trends[dateStr] !== undefined) {
        trends[dateStr] += p.amount.toNumber();
      }
    }

    const revenueTrends = Object.keys(trends).map((date) => ({
      date,
      revenue: trends[date],
    }));

    if (actorUserId) {
      await this.logDataAccess(actorUserId, 'REVENUE_DASHBOARD', 'READ_ANALYTICS', ipAddress, userAgent);
    }

    return {
      dailyRevenue,
      monthlyRevenue,
      outstandingPayments,
      refundSummary: {
        pendingRefundsCount,
        approvedRefundsAmount,
      },
      departmentRevenue,
      revenueTrends,
    };
  }

  /**
   * Insurance Claims Dashboard metrics.
   */
  static async getInsuranceDashboard(actorUserId?: string, ipAddress?: string, userAgent?: string): Promise<InsuranceDashboardMetrics> {
    const claims = await prisma.insuranceClaim.findMany({
      include: { provider: true },
    });

    const totalClaimsCount = claims.length;

    // Claims status breakdown
    const statusMap: { [key: string]: { count: number; amount: number } } = {};
    let totalClaimedAmount = 0;
    let totalSettledAmount = 0;
    let approvedClaimsCount = 0;

    for (const c of claims) {
      const status = c.status;
      const claimed = c.totalClaimedAmount.toNumber();
      const approved = c.totalApprovedAmount.toNumber();

      totalClaimedAmount += claimed;
      totalSettledAmount += approved;

      if (!statusMap[status]) {
        statusMap[status] = { count: 0, amount: 0 };
      }
      statusMap[status].count += 1;
      statusMap[status].amount += claimed;

      if (status === 'APPROVED' || status === 'PARTIALLY_APPROVED' || status === 'SETTLED') {
        approvedClaimsCount += 1;
      }
    }

    const claimsByStatus = Object.keys(statusMap).map((status) => ({
      status,
      count: statusMap[status].count,
      amount: statusMap[status].amount,
    }));

    const claimApprovalRate = totalClaimsCount > 0 ? parseFloat(((approvedClaimsCount / totalClaimsCount) * 100).toFixed(2)) : 0;

    // Top Providers
    const providerMap: { [key: string]: { count: number; settled: number } } = {};
    for (const c of claims) {
      const pName = c.provider.name;
      const approved = c.totalApprovedAmount.toNumber();

      if (!providerMap[pName]) {
        providerMap[pName] = { count: 0, settled: 0 };
      }
      providerMap[pName].count += 1;
      providerMap[pName].settled += approved;
    }

    const topProviders = Object.keys(providerMap).map((pName) => ({
      providerName: pName,
      claimsCount: providerMap[pName].count,
      settledAmount: providerMap[pName].settled,
    })).sort((a, b) => b.settledAmount - a.settledAmount).slice(0, 5);

    if (actorUserId) {
      await this.logDataAccess(actorUserId, 'INSURANCE_DASHBOARD', 'READ_ANALYTICS', ipAddress, userAgent);
    }

    return {
      totalClaimsCount,
      claimsByStatus,
      claimApprovalRate,
      totalClaimedAmount,
      totalSettledAmount,
      topProviders,
    };
  }
}
