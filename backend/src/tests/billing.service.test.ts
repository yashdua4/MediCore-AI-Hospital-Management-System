import prisma from '../config/prisma';
import { BillingService } from '../services/billing.service';
import { RoleType } from '@prisma/client';

async function cleanupDb() {
  await prisma.financialAudit.deleteMany();
  await prisma.revenueTransaction.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.insuranceClaimItem.deleteMany();
  await prisma.insuranceClaim.deleteMany();
  await prisma.insurancePolicy.deleteMany();
  await prisma.insuranceProvider.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.doctorDepartment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.securityEvent.deleteMany();
  await prisma.dataAccessLog.deleteMany();
}

describe('BillingService Unit Tests', () => {
  let adminUser: any;
  let accountantUser: any;
  let billingExecUser: any;
  let patientUser: any;
  let patientProfile: any;
  let doctorProfile: any;
  let department: any;
  let appointment: any;

  beforeAll(async () => {
    await cleanupDb();

    // Create Roles
    const adminRole = await prisma.role.create({
      data: { name: RoleType.SUPER_ADMIN, description: 'Super Admin' },
    });
    const billingRole = await prisma.role.create({
      data: { name: RoleType.BILLING_EXEC, description: 'Billing Executive' },
    });
    const accountantRole = await prisma.role.create({
      data: { name: RoleType.ACCOUNTANT, description: 'Accountant' },
    });
    const patientRole = await prisma.role.create({
      data: { name: RoleType.PATIENT, description: 'Patient' },
    });
    const doctorRole = await prisma.role.create({
      data: { name: RoleType.DOCTOR, description: 'Doctor' },
    });

    // Create Users
    adminUser = await prisma.user.create({
      data: {
        email: 'admin.billing@medicore.com',
        passwordHash: 'hash',
        roles: { create: { roleId: adminRole.id } },
      },
    });

    accountantUser = await prisma.user.create({
      data: {
        email: 'acct.billing@medicore.com',
        passwordHash: 'hash',
        roles: { create: { roleId: accountantRole.id } },
      },
    });

    billingExecUser = await prisma.user.create({
      data: {
        email: 'exec.billing@medicore.com',
        passwordHash: 'hash',
        roles: { create: { roleId: billingRole.id } },
      },
    });

    patientUser = await prisma.user.create({
      data: {
        email: 'pat.billing@medicore.com',
        passwordHash: 'hash',
        roles: { create: { roleId: patientRole.id } },
      },
    });

    const docUser = await prisma.user.create({
      data: {
        email: 'doc.billing@medicore.com',
        passwordHash: 'hash',
        roles: { create: { roleId: doctorRole.id } },
      },
    });

    // Profiles
    patientProfile = await prisma.patient.create({
      data: {
        userId: patientUser.id,
        firstName: 'Jane',
        lastName: 'Doe',
        dob: new Date('1990-05-15'),
        gender: 'FEMALE',
        email: patientUser.email,
        phone: '9888877777',
      },
    });

    department = await prisma.doctorDepartment.create({
      data: { name: 'Cardiology', description: 'Heart center' },
    });

    doctorProfile = await prisma.doctor.create({
      data: {
        userId: docUser.id,
        firstName: 'Dr. House',
        lastName: 'Gregory',
        email: docUser.email,
        phone: '1112223334',
        licenseNumber: 'LIC_BILL_101',
        consultationFee: 500.0,
        departmentId: department.id,
      },
    });

    appointment = await prisma.appointment.create({
      data: {
        patientId: patientProfile.id,
        doctorId: doctorProfile.id,
        date: new Date(),
        time: '10:00',
        status: 'CONFIRMED',
      },
    });
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  test('should create a draft invoice with correct computations and log audit trail', async () => {
    const invoice = await BillingService.createInvoice(
      {
        patientId: patientProfile.id,
        appointmentId: appointment.id,
        items: [
          { description: 'Consultation Fee', quantity: 1, unitPrice: 500.0, itemType: 'CONSULTATION' },
          { description: 'ECG Lab Test', quantity: 1, unitPrice: 150.0, itemType: 'LAB_TEST' },
        ],
        discountAmount: 50.0,
      },
      billingExecUser.id
    );

    expect(invoice.invoiceNumber).toBeDefined();
    expect(invoice.status).toBe('DRAFT');
    expect(Number(invoice.subTotal)).toBe(650.0);
    // Tax computation (18% of subTotal): 650 * 0.18 = 117
    expect(Number(invoice.taxAmount)).toBe(117.0);
    expect(Number(invoice.discountAmount)).toBe(50.0);
    // totalAmount = subTotal + tax - discount = 650 + 117 - 50 = 717
    expect(Number(invoice.totalAmount)).toBe(717.0);
    expect(Number(invoice.outstandingAmount)).toBe(717.0);

    // Verify FinancialAudit
    const audit = await prisma.financialAudit.findFirst({
      where: { recordId: invoice.id, action: 'CREATE' },
    });
    expect(audit).toBeDefined();
    expect(audit?.performedById).toBe(billingExecUser.id);
  });

  test('should finalize and cancel invoices accurately', async () => {
    // 1. Create Invoice
    const invoice = await BillingService.createInvoice(
      {
        patientId: patientProfile.id,
        items: [{ description: 'Cardiology Consultation', quantity: 1, unitPrice: 500.0, itemType: 'CONSULTATION' }],
      },
      billingExecUser.id
    );

    // 2. Try to cancel before finalize is allowed
    const cancelled = await BillingService.cancelInvoice(invoice.id, billingExecUser.id);
    expect(cancelled.status).toBe('CANCELLED');

    // 3. Create another one, finalize it
    const invoice2 = await BillingService.createInvoice(
      {
        patientId: patientProfile.id,
        items: [{ description: 'Cardiology Consultation', quantity: 1, unitPrice: 500.0, itemType: 'CONSULTATION' }],
      },
      billingExecUser.id
    );

    const finalized = await BillingService.finalizeInvoice(invoice2.id, billingExecUser.id);
    expect(finalized.status).toBe('FINALIZED');

    // Trying to finalize already finalized should fail
    await expect(BillingService.finalizeInvoice(invoice2.id, billingExecUser.id)).rejects.toThrow();
  });

  test('should process full and partial payments, adjusting outstanding balances', async () => {
    // Create and finalize invoice
    const invoice = await BillingService.createInvoice(
      {
        patientId: patientProfile.id,
        items: [{ description: 'Surgery Charges', quantity: 1, unitPrice: 1000.0, itemType: 'SURGERY' }],
      },
      billingExecUser.id
    );
    await BillingService.finalizeInvoice(invoice.id, billingExecUser.id);

    // subtotal = 1000, tax = 180, total = 1180
    // Record Partial Payment
    const partialResult = await BillingService.recordPayment(
      invoice.id,
      { amount: 500.0, paymentMethodName: 'CREDIT_CARD', transactionRef: 'TXN-PARTIAL-123' },
      billingExecUser.id
    );

    expect(partialResult.payment.status).toBe('PAID');
    expect(partialResult.updatedInvoice.status).toBe('PARTIALLY_PAID');
    expect(Number(partialResult.updatedInvoice.paidAmount)).toBe(500.0);
    expect(Number(partialResult.updatedInvoice.outstandingAmount)).toBe(680.0); // 1180 - 500

    // Record Final Payment
    const finalResult = await BillingService.recordPayment(
      invoice.id,
      { amount: 680.0, paymentMethodName: 'UPI', transactionRef: 'TXN-FINAL-123' },
      billingExecUser.id
    );
    expect(finalResult.updatedInvoice.status).toBe('PAID');
    expect(Number(finalResult.updatedInvoice.outstandingAmount)).toBe(0.0);

    // Verify Revenue Transactions logged
    const txs = await prisma.revenueTransaction.findMany({ where: { invoiceId: invoice.id } });
    expect(txs).toHaveLength(2);
    expect(txs[0].type).toBe('CREDIT');
  });

  test('should validate and settle insurance claims correctly', async () => {
    // 1. Create provider & policy
    const provider = await BillingService.createProvider({
      name: 'Star Health Insurance',
      contactNumber: '1800102102',
      email: 'claims@starhealth.com',
    });

    const policy = await BillingService.createPolicy({
      policyNumber: 'STAR-POL-5555',
      providerId: provider.id,
      patientId: patientProfile.id,
      coverageLimit: 10000.0,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // 2. Create and finalize invoice
    const invoice = await BillingService.createInvoice(
      {
        patientId: patientProfile.id,
        items: [{ description: 'Admission Charges', quantity: 1, unitPrice: 2000.0, itemType: 'ADMISSION' }],
      },
      billingExecUser.id
    );
    await BillingService.finalizeInvoice(invoice.id, billingExecUser.id);
    // subtotal = 2000, tax = 360, total = 2360

    // 3. Submit Claim
    const claim = await BillingService.submitInsuranceClaim(
      {
        invoiceId: invoice.id,
        policyId: policy.id,
        items: [{ description: 'Room stay admission', claimedAmount: 2000.0 }],
      },
      billingExecUser.id
    );

    expect(claim.claimNumber).toBeDefined();
    expect(claim.status).toBe('SUBMITTED');
    expect(Number(claim.totalClaimedAmount)).toBe(2000.0);

    // 4. Process Claim Settlement (Approve)
    const processedClaim = await BillingService.processInsuranceClaim(
      claim.id,
      {
        status: 'APPROVED',
        approvedAmount: 1800.0,
        itemApprovals: [{ itemId: claim.items[0].id, approvedAmount: 1800.0, status: 'APPROVED' }],
      },
      accountantUser.id
    );

    expect(processedClaim.status).toBe('SETTLED');
    expect(Number(processedClaim.totalApprovedAmount)).toBe(1800.0);

    // Check Policy Used Coverage updated
    const updatedPolicy = await prisma.insurancePolicy.findUnique({ where: { id: policy.id } });
    expect(Number(updatedPolicy?.usedCoverage)).toBe(1800.0);

    // Check Invoice balances: paidAmount increases by 1800, outstanding goes from 2360 to 560
    const updatedInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(Number(updatedInvoice?.paidAmount)).toBe(1800.0);
    expect(Number(updatedInvoice?.outstandingAmount)).toBe(560.0);
    expect(updatedInvoice?.status).toBe('PARTIALLY_PAID');
  });

  test('should process refunds correctly', async () => {
    // 1. Create and pay invoice
    const invoice = await BillingService.createInvoice(
      {
        patientId: patientProfile.id,
        items: [{ description: 'Lab Charges', quantity: 1, unitPrice: 100.0, itemType: 'LAB_TEST' }],
      },
      billingExecUser.id
    );
    await BillingService.finalizeInvoice(invoice.id, billingExecUser.id);
    // subtotal = 100, tax = 18, total = 118

    const payResult = await BillingService.recordPayment(
      invoice.id,
      { amount: 118.0, paymentMethodName: 'CASH' },
      billingExecUser.id
    );

    const payment = payResult.payment;

    // 2. Request refund
    const refund = await BillingService.requestRefund(
      payment.id,
      { amount: 50.0, reason: 'Test partial refund' },
      accountantUser.id
    );

    expect(refund.status).toBe('PENDING');
    expect(Number(refund.amount)).toBe(50.0);

    // 3. Approve refund
    const approvedRefund = await BillingService.processRefund(refund.id, { status: 'APPROVED' }, accountantUser.id);
    expect(approvedRefund.status).toBe('APPROVED');

    // 4. Verify Invoice & payment values
    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(updatedPayment?.status).toBe('PAID'); // since it was a partial refund, the main payment is still paid

    const updatedInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(Number(updatedInvoice?.paidAmount)).toBe(68.0); // 118 - 50
    expect(Number(updatedInvoice?.outstandingAmount)).toBe(50.0); // 0 + 50
    expect(updatedInvoice?.status).toBe('PARTIALLY_PAID');

    // Verify Revenue DEBIT transaction
    const debitTx = await prisma.revenueTransaction.findFirst({
      where: { invoiceId: invoice.id, type: 'DEBIT' },
    });
    expect(debitTx).toBeDefined();
    expect(Number(debitTx?.amount)).toBe(50.0);
  });

  test('should return revenue and insurance dashboards', async () => {
    const revDash = await BillingService.getRevenueDashboard(adminUser.id);
    expect(revDash.outstandingPayments).toBeGreaterThanOrEqual(0);
    expect(revDash.revenueTrends).toBeDefined();
    expect(revDash.departmentRevenue).toBeDefined();

    const insDash = await BillingService.getInsuranceDashboard(adminUser.id);
    expect(insDash.totalClaimsCount).toBeGreaterThanOrEqual(0);
    expect(insDash.claimApprovalRate).toBeGreaterThanOrEqual(0);
    expect(insDash.topProviders).toBeDefined();
  });
});
