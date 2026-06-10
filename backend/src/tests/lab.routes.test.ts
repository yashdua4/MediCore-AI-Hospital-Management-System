import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/prisma';
import { RbacService } from '../services/rbac.service';
import { RoleType } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

async function cleanupDb() {
  await prisma.labReport.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.labTechnicianAssignment.deleteMany();
  await prisma.labSample.deleteMany();
  await prisma.labOrder.deleteMany();
  await prisma.labReferenceRange.deleteMany();
  await prisma.labTest.deleteMany();
  await prisma.labTestCategory.deleteMany();
  await prisma.labInventory.deleteMany();
  await prisma.labEquipment.deleteMany();
  await prisma.doctorSpecializationMapping.deleteMany();
  await prisma.doctorQualification.deleteMany();
  await prisma.doctorSchedule.deleteMany();
  await prisma.doctorAvailability.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.doctorDepartment.deleteMany();
  await prisma.patientMedicalHistory.deleteMany();
  await prisma.patientAddress.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.insuranceInformation.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.dataAccessLog.deleteMany();
  await prisma.securityEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
}

describe('Lab Routes Integration Tests', () => {
  let docToken: string;
  let techToken: string;
  let patientOwnerToken: string;
  let otherPatientToken: string;

  let docUser: any;
  let techUser: any;
  let patientUser: any;
  let otherPatientUser: any;

  let doctorProfile: any;
  let patientProfile: any;
  let category: any;
  let labTest: any;
  let dept: any;

  let orderId: string;
  let sampleId: string;
  let reportId: string;

  beforeAll(async () => {
    await cleanupDb();

    // 1. Create Roles
    const docRole = await RbacService.createRole({ name: RoleType.DOCTOR, description: 'Doctor' });
    const techRole = await RbacService.createRole({ name: RoleType.LAB_TECH, description: 'Technician' });
    const patientRole = await RbacService.createRole({ name: RoleType.PATIENT, description: 'Patient' });

    // 2. Create Doctor User
    docUser = await prisma.user.create({
      data: { email: 'doctor.lab@medicore.com', passwordHash: 'hash' },
    });
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

    // 3. Create Tech User
    techUser = await prisma.user.create({
      data: { email: 'tech.lab@medicore.com', passwordHash: 'hash' },
    });
    await RbacService.assignRoleToUser(techUser.id, techRole.id);
    techToken = jwt.sign(
      {
        userId: techUser.id,
        email: techUser.email,
        roleId: techRole.id,
        role: RoleType.LAB_TECH,
        roles: [RoleType.LAB_TECH],
        roleIds: [techRole.id],
      },
      JWT_SECRET
    );

    // 4. Create Patient User (Owner)
    patientUser = await prisma.user.create({
      data: { email: 'patient.owner@gmail.com', passwordHash: 'hash' },
    });
    await RbacService.assignRoleToUser(patientUser.id, patientRole.id);
    patientOwnerToken = jwt.sign(
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

    // 5. Create Other Patient User (Unrelated)
    otherPatientUser = await prisma.user.create({
      data: { email: 'patient.other@gmail.com', passwordHash: 'hash' },
    });
    await RbacService.assignRoleToUser(otherPatientUser.id, patientRole.id);
    otherPatientToken = jwt.sign(
      {
        userId: otherPatientUser.id,
        email: otherPatientUser.email,
        roleId: patientRole.id,
        role: RoleType.PATIENT,
        roles: [RoleType.PATIENT],
        roleIds: [patientRole.id],
      },
      JWT_SECRET
    );

    // Create doctor department and doctor profile
    dept = await prisma.doctorDepartment.create({
      data: { name: 'Laboratory Medicine', description: 'Lab department' },
    });

    doctorProfile = await prisma.doctor.create({
      data: {
        userId: docUser.id,
        firstName: 'Stephen',
        lastName: 'Strange',
        email: docUser.email,
        phone: '1111111111',
        licenseNumber: 'LIC_LAB_111',
        consultationFee: 400.00,
        departmentId: dept.id,
      },
    });

    // Create patient profile
    patientProfile = await prisma.patient.create({
      data: {
        userId: patientUser.id,
        firstName: 'Peter',
        lastName: 'Parker',
        dob: new Date('1990-01-01'),
        gender: 'MALE',
        email: patientUser.email,
        phone: '2222222222',
      },
    });

    // Create Catalog definitions
    category = await prisma.labTestCategory.create({
      data: { name: 'Pathology Category', description: 'Path tests' },
    });

    labTest = await prisma.labTest.create({
      data: {
        categoryId: category.id,
        name: 'Lipid Profile',
        code: 'LP001',
        price: 200.0,
        testType: 'BLOOD',
      },
    });

    await prisma.labReferenceRange.create({
      data: {
        labTestId: labTest.id,
        parameter: 'Cholesterol',
        gender: 'ALL',
        rangeMin: 0.0,
        rangeMax: 200.0,
        unit: 'mg/dL',
      },
    });
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  describe('POST /api/lab/orders', () => {
    test('should allow Doctor to create a lab order', async () => {
      const res = await request(app)
        .post('/api/lab/orders')
        .set('Authorization', `Bearer ${docToken}`)
        .send({
          patientId: patientProfile.id,
          doctorId: doctorProfile.id,
          labTestId: labTest.id,
          priority: 'NORMAL',
          clinicalNotes: 'Routine cholesterol test',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBe('ORDERED');
      orderId = res.body.data.id;
    });

    test('should deny Patient from creating a lab order', async () => {
      const res = await request(app)
        .post('/api/lab/orders')
        .set('Authorization', `Bearer ${patientOwnerToken}`)
        .send({
          patientId: patientProfile.id,
          doctorId: doctorProfile.id,
          labTestId: labTest.id,
          priority: 'NORMAL',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/lab/orders/:id/assign', () => {
    test('should allow Lab Tech to assign tech to order', async () => {
      const res = await request(app)
        .put(`/api/lab/orders/${orderId}/assign`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          technicianId: techUser.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.technicianId).toBe(techUser.id);
    });
  });

  describe('POST /api/lab/orders/:id/samples', () => {
    test('should allow Lab Tech to collect sample', async () => {
      const res = await request(app)
        .post(`/api/lab/orders/${orderId}/samples`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          sampleType: 'Serum',
          storageLocation: 'Box A',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.sampleType).toBe('Serum');
      sampleId = res.body.data.id;
    });
  });

  describe('PUT /api/lab/samples/:sampleId/status', () => {
    test('should allow Lab Tech to start processing sample', async () => {
      const res = await request(app)
        .put(`/api/lab/samples/${sampleId}/status`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          status: 'PROCESSING',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PROCESSING');
    });
  });

  describe('POST /api/lab/orders/:id/results', () => {
    test('should allow Lab Tech to enter results', async () => {
      const res = await request(app)
        .post(`/api/lab/orders/${orderId}/results`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          results: [
            { parameter: 'Cholesterol', value: '250.0', unit: 'mg/dL', notes: 'High value' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].flag).toBe('CRITICAL'); // 250 > 200 * 1.2 (240)
    });
  });

  describe('PUT /api/lab/orders/:id/approve', () => {
    test('should allow Lab Tech (Pathologist role validation) to approve results', async () => {
      const res = await request(app)
        .put(`/api/lab/orders/${orderId}/approve`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('FINAL');
      reportId = res.body.data.id;
    });
  });

  describe('GET /api/lab/reports/:reportId', () => {
    test('should allow Patient Owner to retrieve report', async () => {
      const res = await request(app)
        .get(`/api/lab/reports/${reportId}`)
        .set('Authorization', `Bearer ${patientOwnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(reportId);
    });

    test('should allow Doctor to retrieve report', async () => {
      const res = await request(app)
        .get(`/api/lab/reports/${reportId}`)
        .set('Authorization', `Bearer ${docToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(reportId);
    });

    test('should deny unrelated patient from retrieving report', async () => {
      const res = await request(app)
        .get(`/api/lab/reports/${reportId}`)
        .set('Authorization', `Bearer ${otherPatientToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/lab/dashboard', () => {
    test('should allow Lab Tech to view dashboard metrics', async () => {
      const res = await request(app)
        .get('/api/lab/dashboard')
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalOrders).toBe(1);
    });

    test('should deny Patient from viewing dashboard metrics', async () => {
      const res = await request(app)
        .get('/api/lab/dashboard')
        .set('Authorization', `Bearer ${patientOwnerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/lab/inventory', () => {
    test('should allow Lab Tech to view inventory list', async () => {
      const res = await request(app)
        .get('/api/lab/inventory')
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
