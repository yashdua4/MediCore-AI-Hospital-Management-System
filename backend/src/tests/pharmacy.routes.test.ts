import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/prisma';
import { RbacService } from '../services/rbac.service';
import { RoleType } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

async function cleanupDb() {
  await prisma.pharmacyTransaction.deleteMany();
  await prisma.prescriptionDispenseItem.deleteMany();
  await prisma.prescriptionDispense.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.medicineBatch.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.medicineInventory.deleteMany();
  await prisma.medicineSubstitution.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.medicineCategory.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.prescriptionMedicine.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.medicalRecordVersion.deleteMany();
  await prisma.medicalRecord.deleteMany();
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

describe('Pharmacy Routes Integration Tests', () => {
  let pharmToken: string;
  let docToken: string;
  let patientToken: string;
  let recepToken: string;

  let pharmUser: any;
  let docUser: any;
  let patientUser: any;
  let recepUser: any;

  let patientProfile: any;
  let doctorProfile: any;
  let department: any;
  let category: any;
  let medicine: any;
  let supplier: any;
  let prescription: any;
  let poId: string;

  beforeAll(async () => {
    await cleanupDb();

    // 1. Setup Roles
    const pharmRole = await RbacService.createRole({ name: RoleType.PHARMACIST, description: 'Pharmacist' });
    const docRole = await RbacService.createRole({ name: RoleType.DOCTOR, description: 'Doctor' });
    const patientRole = await RbacService.createRole({ name: RoleType.PATIENT, description: 'Patient' });
    const recepRole = await RbacService.createRole({ name: RoleType.RECEPTIONIST, description: 'Receptionist' });

    // 2. Create Users & Sign Tokens
    pharmUser = await prisma.user.create({ data: { email: 'pharm@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(pharmUser.id, pharmRole.id);
    pharmToken = jwt.sign(
      {
        userId: pharmUser.id,
        email: pharmUser.email,
        roleId: pharmRole.id,
        role: RoleType.PHARMACIST,
        roles: [RoleType.PHARMACIST],
        roleIds: [pharmRole.id],
      },
      JWT_SECRET
    );

    docUser = await prisma.user.create({ data: { email: 'doc@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(docUser.id, docRole.id);
    docToken = jwt.sign(
      {
        userId: docUser.id,
        email: docUser.email,
        roleId: docRole.id,
        role: RoleType.DOCTOR,
        roles: [RoleType.DOCTOR],
        roleIds: [docRole.id],
      },
      JWT_SECRET
    );

    patientUser = await prisma.user.create({ data: { email: 'patient@gmail.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(patientUser.id, patientRole.id);
    patientToken = jwt.sign(
      {
        userId: patientUser.id,
        email: patientUser.email,
        roleId: patientRole.id,
        role: RoleType.PATIENT,
        roles: [RoleType.PATIENT],
        roleIds: [patientRole.id],
      },
      JWT_SECRET
    );

    recepUser = await prisma.user.create({ data: { email: 'recep@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(recepUser.id, recepRole.id);
    recepToken = jwt.sign(
      {
        userId: recepUser.id,
        email: recepUser.email,
        roleId: recepRole.id,
        role: RoleType.RECEPTIONIST,
        roles: [RoleType.RECEPTIONIST],
        roleIds: [recepRole.id],
      },
      JWT_SECRET
    );

    // 3. Setup core profiles
    department = await prisma.doctorDepartment.create({
      data: { name: 'Cardiology', description: 'Heart care' },
    });

    doctorProfile = await prisma.doctor.create({
      data: {
        userId: docUser.id,
        firstName: 'Stephen',
        lastName: 'Strange',
        email: docUser.email,
        phone: '1231231234',
        licenseNumber: 'LIC_INT_999',
        consultationFee: 500.0,
        departmentId: department.id,
      },
    });

    patientProfile = await prisma.patient.create({
      data: {
        userId: patientUser.id,
        firstName: 'Peter',
        lastName: 'Parker',
        dob: new Date('1990-01-01'),
        gender: 'MALE',
        email: patientUser.email,
        phone: '9876543210',
      },
    });

    // 4. Setup catalog definitions
    category = await prisma.medicineCategory.create({
      data: { name: 'Painkillers', description: 'Analgesics' },
    });

    medicine = await prisma.medicine.create({
      data: {
        name: 'Paracetamol 500mg',
        genericName: 'Paracetamol',
        brandName: 'Calpol',
        strength: '500mg',
        dosageForm: 'Tablet',
        manufacturer: 'GSK',
        categoryId: category.id,
        price: 5.0,
      },
    });

    supplier = await prisma.supplier.create({
      data: { name: 'Local Supplier', phone: '1234567890' },
    });

    // Setup prescription
    const rec = await prisma.medicalRecord.create({
      data: { patientId: patientProfile.id, doctorId: doctorProfile.id },
    });
    prescription = await prisma.prescription.create({
      data: {
        medicalRecordId: rec.id,
        medicines: {
          create: [
            {
              medicineName: 'Paracetamol 500mg',
              strength: '500mg',
              frequency: '1 daily',
              duration: '3 days',
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  describe('POST /api/pharmacy/medicines', () => {
    test('should allow Pharmacist to register medicine', async () => {
      const res = await request(app)
        .post('/api/pharmacy/medicines')
        .set('Authorization', `Bearer ${pharmToken}`)
        .send({
          name: 'Ibuprofen 400mg',
          brandName: 'Advil',
          genericName: 'Ibuprofen',
          strength: '400mg',
          dosageForm: 'Tablet',
          manufacturer: 'Pfizer',
          categoryId: category.id,
          price: 10.0,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Ibuprofen 400mg');
    });

    test('should deny Receptionist from registering medicine', async () => {
      const res = await request(app)
        .post('/api/pharmacy/medicines')
        .set('Authorization', `Bearer ${recepToken}`)
        .send({
          name: 'Ibuprofen 400mg',
          brandName: 'Advil',
          genericName: 'Ibuprofen',
          strength: '400mg',
          dosageForm: 'Tablet',
          manufacturer: 'Pfizer',
          categoryId: category.id,
          price: 10.0,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/pharmacy/purchase-orders', () => {
    test('should allow Pharmacist to create purchase order', async () => {
      const res = await request(app)
        .post('/api/pharmacy/purchase-orders')
        .set('Authorization', `Bearer ${pharmToken}`)
        .send({
          supplierId: supplier.id,
          items: [
            {
              medicineId: medicine.id,
              quantity: 200,
              unitPrice: 3.5,
              batchNumber: 'PCT-001',
              expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
        });

      expect(res.status).toBe(201);
      poId = res.body.data.id;
    });
  });

  describe('PUT /api/pharmacy/purchase-orders/:id/receive', () => {
    test('should allow Pharmacist to receive PO stock', async () => {
      const res = await request(app)
        .put(`/api/pharmacy/purchase-orders/${poId}/receive`)
        .set('Authorization', `Bearer ${pharmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('RECEIVED');
    });
  });

  describe('POST /api/pharmacy/dispense', () => {
    test('should allow Pharmacist to dispense prescription', async () => {
      const res = await request(app)
        .post('/api/pharmacy/dispense')
        .set('Authorization', `Bearer ${pharmToken}`)
        .send({
          prescriptionId: prescription.id,
          items: [
            {
              medicineId: medicine.id,
              quantity: 10,
              batchNumber: 'PCT-001',
            },
          ],
          paymentMethod: 'CASH',
        });

      expect(res.status).toBe(200);
      const dispenseId = res.body.data.dispense.id;
      expect(dispenseId).toBeDefined();
    });

    test('should deny Doctor from dispensing prescription', async () => {
      const res = await request(app)
        .post('/api/pharmacy/dispense')
        .set('Authorization', `Bearer ${docToken}`)
        .send({
          prescriptionId: prescription.id,
          items: [
            {
              medicineId: medicine.id,
              quantity: 10,
              batchNumber: 'PCT-001',
            },
          ],
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/pharmacy/dispense/history/:prescriptionId', () => {
    test('should allow Patient to retrieve history', async () => {
      const res = await request(app)
        .get(`/api/pharmacy/dispense/history/${prescription.id}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/pharmacy/dashboard', () => {
    test('should allow Pharmacist to view dashboard', async () => {
      const res = await request(app)
        .get('/api/pharmacy/dashboard')
        .set('Authorization', `Bearer ${pharmToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.dailyDispensedCount).toBe(1);
    });

    test('should deny Patient from viewing dashboard', async () => {
      const res = await request(app)
        .get('/api/pharmacy/dashboard')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
    });
  });
});
