import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/prisma';
import { RbacService } from '../services/rbac.service';
import { RoleType } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

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

describe('Billing Routes Integration Tests', () => {
  let billingToken: string;
  let accountantToken: string;
  let patientToken: string;

  let billingUser: any;
  let accountantUser: any;
  let patientUser: any;
  let otherPatientUser: any;

  let patientProfile: any;
  let otherPatientProfile: any;
  let doctorProfile: any;
  let department: any;
  let appointment: any;
  let provider: any;
  let policy: any;

  beforeAll(async () => {
    await cleanupDb();

    // 1. Create Roles
    const adminRole = await RbacService.createRole({ name: RoleType.SUPER_ADMIN, description: 'Super Admin' });
    const billingRole = await RbacService.createRole({ name: RoleType.BILLING_EXEC, description: 'Billing Exec' });
    const acctRole = await RbacService.createRole({ name: RoleType.ACCOUNTANT, description: 'Accountant' });
    const patientRole = await RbacService.createRole({ name: RoleType.PATIENT, description: 'Patient' });
    const docRole = await RbacService.createRole({ name: RoleType.DOCTOR, description: 'Doctor' });

    // 2. Create Users & JWTs
    const adminUser = await prisma.user.create({ data: { email: 'admin.routes@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(adminUser.id, adminRole.id);

    billingUser = await prisma.user.create({ data: { email: 'billing.routes@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(billingUser.id, billingRole.id);
    billingToken = jwt.sign(
      { userId: billingUser.id, email: billingUser.email, role: RoleType.BILLING_EXEC, roles: [RoleType.BILLING_EXEC], roleIds: [billingRole.id] },
      JWT_SECRET
    );

    accountantUser = await prisma.user.create({ data: { email: 'acct.routes@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(accountantUser.id, acctRole.id);
    accountantToken = jwt.sign(
      { userId: accountantUser.id, email: accountantUser.email, role: RoleType.ACCOUNTANT, roles: [RoleType.ACCOUNTANT], roleIds: [acctRole.id] },
      JWT_SECRET
    );

    patientUser = await prisma.user.create({ data: { email: 'pat.routes@gmail.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(patientUser.id, patientRole.id);
    patientToken = jwt.sign(
      { userId: patientUser.id, email: patientUser.email, role: RoleType.PATIENT, roles: [RoleType.PATIENT], roleIds: [patientRole.id] },
      JWT_SECRET
    );

    otherPatientUser = await prisma.user.create({ data: { email: 'other.routes@gmail.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(otherPatientUser.id, patientRole.id);

    const docUser = await prisma.user.create({ data: { email: 'doc.routes@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(docUser.id, docRole.id);

    // 3. Profiles
    patientProfile = await prisma.patient.create({
      data: { userId: patientUser.id, firstName: 'Bob', lastName: 'Ross', dob: new Date('1970-01-01'), gender: 'MALE', phone: '9000000001', email: patientUser.email },
    });

    otherPatientProfile = await prisma.patient.create({
      data: { userId: otherPatientUser.id, firstName: 'Alice', lastName: 'Smith', dob: new Date('1985-05-05'), gender: 'FEMALE', phone: '9000000002', email: otherPatientUser.email },
    });

    department = await prisma.doctorDepartment.create({ data: { name: 'Emergency Services' } });
    doctorProfile = await prisma.doctor.create({
      data: { userId: docUser.id, firstName: 'Dr.', lastName: 'Strange', email: docUser.email, phone: '1113334445', licenseNumber: 'LIC_B_R_99', consultationFee: 1000.0, departmentId: department.id },
    });

    appointment = await prisma.appointment.create({
      data: { patientId: patientProfile.id, doctorId: doctorProfile.id, date: new Date(), time: '09:00', status: 'CONFIRMED' },
    });

    // Register provider and policy
    provider = await prisma.insuranceProvider.create({ data: { name: 'Apollo Munich', contactNumber: '9999999999' } });
    policy = await prisma.insurancePolicy.create({
      data: { policyNumber: 'POL-123', providerId: provider.id, patientId: patientProfile.id, coverageLimit: 50000.0, expiryDate: new Date(Date.now() + 100000000), status: 'ACTIVE' },
    });
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  describe('POST /api/billing/invoices', () => {
    test('should allow BILLING_EXEC to create a draft invoice', async () => {
      const res = await request(app)
        .post('/api/billing/invoices')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          patientId: patientProfile.id,
          appointmentId: appointment.id,
          items: [
            { description: 'Emergency consultation', quantity: 1, unitPrice: 1000.0, itemType: 'EMERGENCY' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('DRAFT');
    });

    test('should block PATIENT from creating an invoice', async () => {
      const res = await request(app)
        .post('/api/billing/invoices')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          patientId: patientProfile.id,
          items: [{ description: 'Fee', quantity: 1, unitPrice: 100.0, itemType: 'CONSULTATION' }],
        });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/billing/invoices/:id/finalize', () => {
    test('should allow BILLING_EXEC to finalize a draft invoice', async () => {
      // Create draft first
      const draft = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-ROUTE-${Date.now()}`,
          patientId: patientProfile.id,
          status: 'DRAFT',
          subTotal: 500,
          taxAmount: 90,
          totalAmount: 590,
          outstandingAmount: 590,
        },
      });

      const res = await request(app)
        .put(`/api/billing/invoices/${draft.id}/finalize`)
        .set('Authorization', `Bearer ${billingToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('FINALIZED');
    });
  });

  describe('Claims workflow routes check', () => {
    test('should block BILLING_EXEC from processing a claim', async () => {
      const res = await request(app)
        .put('/api/billing/claims/dummy-id/process')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({ status: 'APPROVED', approvedAmount: 500.0, itemApprovals: [] });

      expect(res.status).toBe(403); // only admin and accountant
    });

    test('should allow ACCOUNTANT to process a claim and register settlement', async () => {
      // Create finalized invoice
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-CLAIM-R-${Date.now()}`,
          patientId: patientProfile.id,
          status: 'FINALIZED',
          subTotal: 1000,
          taxAmount: 180,
          totalAmount: 1180,
          outstandingAmount: 1180,
        },
      });

      const claim: any = await prisma.insuranceClaim.create({
        data: {
          claimNumber: `CLM-R-${Date.now()}`,
          invoiceId: invoice.id,
          policyId: policy.id,
          providerId: provider.id,
          status: 'SUBMITTED',
          totalClaimedAmount: 1000,
          items: {
            create: [{ description: 'Ad-hoc', claimedAmount: 1000, status: 'SUBMITTED' }],
          },
        },
        include: { items: true },
      });

      const res = await request(app)
        .put(`/api/billing/claims/${claim.id}/process`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({
          status: 'APPROVED',
          approvedAmount: 900.0,
          itemApprovals: [{ itemId: claim.items[0].id, approvedAmount: 900.0, status: 'APPROVED' }],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SETTLED');
    });
  });

  describe('Refund workflow routes check', () => {
    test('should allow ACCOUNTANT to request and approve refunds', async () => {
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-REF-R-${Date.now()}`,
          patientId: patientProfile.id,
          status: 'FINALIZED',
          subTotal: 1000,
          taxAmount: 180,
          totalAmount: 1180,
          outstandingAmount: 1180,
        },
      });

      const method = await prisma.paymentMethod.create({ data: { name: 'CARD-REF', description: 'desc' } });
      const payment = await prisma.payment.create({
        data: { invoiceId: invoice.id, amount: 1180.0, paymentMethodId: method.id, status: 'PAID' },
      });

      // Request refund
      const reqRes = await request(app)
        .post(`/api/billing/payments/${payment.id}/refunds`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({ amount: 100.0, reason: 'Overcharged client' });

      expect(reqRes.status).toBe(201);
      const refundId = reqRes.body.data.id;

      // Process/Approve refund
      const procRes = await request(app)
        .put(`/api/billing/refunds/${refundId}/process`)
        .set('Authorization', `Bearer ${accountantToken}`)
        .send({ status: 'APPROVED' });

      expect(procRes.status).toBe(200);
      expect(procRes.body.data.status).toBe('APPROVED');
    });
  });

  describe('Patient Invoice Ownership', () => {
    test('should allow PATIENT to read their own invoice', async () => {
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-OWN-${Date.now()}`,
          patientId: patientProfile.id,
          status: 'FINALIZED',
          subTotal: 200,
          taxAmount: 36,
          totalAmount: 236,
          outstandingAmount: 236,
        },
      });

      const res = await request(app)
        .get(`/api/billing/invoices/${invoice.id}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(invoice.id);
    });

    test('should reject PATIENT from reading another patient\'s invoice', async () => {
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-OTHER-${Date.now()}`,
          patientId: otherPatientProfile.id,
          status: 'FINALIZED',
          subTotal: 200,
          taxAmount: 36,
          totalAmount: 236,
          outstandingAmount: 236,
        },
      });

      const res = await request(app)
        .get(`/api/billing/invoices/${invoice.id}`)
        .set('Authorization', `Bearer ${patientToken}`); // patientToken belongs to patientProfile, not otherPatientProfile

      expect(res.status).toBe(403);
    });
  });
});
