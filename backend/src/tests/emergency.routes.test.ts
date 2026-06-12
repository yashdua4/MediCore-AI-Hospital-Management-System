import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/prisma';
import { RbacService } from '../services/rbac.service';
import { RoleType } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

async function cleanupDb() {
  await prisma.emergencyTimeline.deleteMany();
  await prisma.emergencyDisposition.deleteMany();
  await prisma.criticalAlert.deleteMany();
  await prisma.emergencyTransfer.deleteMany();
  await prisma.traumaCase.deleteMany();
  await prisma.emergencyProcedure.deleteMany();
  await prisma.emergencyTreatment.deleteMany();
  await prisma.emergencyDoctorAssignment.deleteMany();
  await prisma.triageAssessment.deleteMany();
  await prisma.emergencyCase.deleteMany();
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

describe('Emergency Routes Integration Tests', () => {
  let adminToken: string;
  let adminUser: any;
  let adminRole: any;

  let doctorToken: string;
  let doctorUser: any;
  let doctorRole: any;
  let doctorProfile: any;

  let patientProfile: any;
  let dept: any;

  let caseId: string;
  let assignmentId: string;
  let alertId: string;

  beforeAll(async () => {
    await cleanupDb();

    // 1. Create Admin Role & User
    adminRole = await RbacService.createRole({ name: RoleType.SUPER_ADMIN, description: 'Super Admin' });
    adminUser = await prisma.user.create({
      data: { email: 'admin.er@medicore.com', passwordHash: 'hash' },
    });
    await RbacService.assignRoleToUser(adminUser.id, adminRole.id);
    adminToken = jwt.sign(
      {
        userId: adminUser.id,
        email: adminUser.email,
        roleId: adminRole.id,
        role: RoleType.SUPER_ADMIN,
        roles: [RoleType.SUPER_ADMIN],
        roleIds: [adminRole.id],
      },
      JWT_SECRET
    );

    // 2. Create Doctor Role & User
    doctorRole = await RbacService.createRole({ name: RoleType.DOCTOR, description: 'Doctor' });
    doctorUser = await prisma.user.create({
      data: { email: 'doctor.er@medicore.com', passwordHash: 'hash' },
    });
    await RbacService.assignRoleToUser(doctorUser.id, doctorRole.id);
    doctorToken = jwt.sign(
      {
        userId: doctorUser.id,
        email: doctorUser.email,
        roleId: doctorRole.id,
        role: RoleType.DOCTOR,
        roles: [RoleType.DOCTOR],
        roleIds: [doctorRole.id],
      },
      JWT_SECRET
    );

    // Create doctor profile
    dept = await prisma.doctorDepartment.create({
      data: { name: 'Emergency Medicine', description: 'ER department' },
    });

    doctorProfile = await prisma.doctor.create({
      data: {
        userId: doctorUser.id,
        firstName: 'Fiona',
        lastName: 'Gallagher',
        email: doctorUser.email,
        phone: '3333333333',
        licenseNumber: 'LIC_ER_333',
        consultationFee: 500.00,
        departmentId: dept.id,
      },
    });

    // Create patient profile
    patientProfile = await prisma.patient.create({
      data: {
        firstName: 'Peter',
        lastName: 'Parker',
        dob: new Date('1995-05-05'),
        gender: 'MALE',
        phone: '4444444444',
      },
    });
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  describe('POST /api/emergency', () => {
    test('should allow Admin to open a new emergency case', async () => {
      const res = await request(app)
        .post('/api/emergency')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: patientProfile.id,
          arrivalMode: 'AMBULANCE',
          chiefComplaint: 'Acute chest discomfort and shortness of breath',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBe('ARRIVED');
      expect(res.body.data.caseNumber).toContain('ER-');
      caseId = res.body.data.id;
    });
  });

  describe('GET /api/emergency/:id', () => {
    test('should allow retrieval of emergency case details', async () => {
      const res = await request(app)
        .get(`/api/emergency/${caseId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(caseId);
      expect(res.body.data.patient.id).toBe(patientProfile.id);
    });
  });

  describe('POST /api/emergency/:id/triage', () => {
    test('should allow triage recording', async () => {
      const res = await request(app)
        .post(`/api/emergency/${caseId}/triage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          triageLevel: 'LEVEL_1_CRITICAL',
          chiefComplaint: 'Chest discomfort',
          symptoms: 'Diaphoresis, radiant left arm pain',
          systolicBP: 140,
          diastolicBP: 90,
          heartRate: 110,
          temperature: 98.6,
          respiratoryRate: 24,
          oxygenSaturation: 92,
          triageNotes: 'Immediate ECG needed',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.triageLevel).toBe('LEVEL_1_CRITICAL');
    });
  });

  describe('POST /api/emergency/:id/assign', () => {
    test('should allow assigning doctor to emergency case', async () => {
      const res = await request(app)
        .post(`/api/emergency/${caseId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: doctorProfile.id,
          role: 'PRIMARY_ED_PHYSICIAN',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PENDING');
      assignmentId = res.body.data.id;
    });
  });

  describe('PUT /api/emergency/assignments/:assignmentId/respond', () => {
    test('should allow doctor to accept assignment', async () => {
      const res = await request(app)
        .put(`/api/emergency/assignments/${assignmentId}/respond`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          status: 'ACCEPTED',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ACCEPTED');
    });
  });

  describe('POST /api/emergency/:id/alerts', () => {
    test('should allow triggering critical alert', async () => {
      const res = await request(app)
        .post(`/api/emergency/${caseId}/alerts`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          alertType: 'CARDIAC_ARREST',
          notes: 'Patient unresponsive, starting CPR',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.alertType).toBe('CARDIAC_ARREST');
      expect(res.body.data.status).toBe('ACTIVE');
      alertId = res.body.data.id;
    });
  });

  describe('PUT /api/emergency/alerts/:alertId/resolve', () => {
    test('should allow alert resolution', async () => {
      const res = await request(app)
        .put(`/api/emergency/alerts/${alertId}/resolve`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          notes: 'ROSC achieved, vitals stable',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('RESOLVED');
    });
  });

  describe('GET /api/emergency/dashboard', () => {
    test('should fetch live emergency dashboard', async () => {
      const res = await request(app)
        .get('/api/emergency/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.activeCasesCount).toBe(1);
      expect(res.body.data.casesByTriage.LEVEL_1_CRITICAL).toBe(1);
    });
  });

  describe('POST /api/emergency/:id/disposition', () => {
    test('should close the case with outcome', async () => {
      const res = await request(app)
        .post(`/api/emergency/${caseId}/disposition`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          outcome: 'ADMITTED',
          notes: 'Transferred to ICU',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.outcome).toBe('ADMITTED');
    });
  });

  describe('GET /api/emergency/analytics', () => {
    test('should fetch emergency analytics', async () => {
      const res = await request(app)
        .get('/api/emergency/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.outcomeMetrics.ADMITTED).toBe(1);
    });
  });
});
