import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/prisma';
import { RbacService } from '../services/rbac.service';
import { PatientService } from '../services/patient.service';
import { RoleType } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

async function cleanupDb() {
  await prisma.userSession.deleteMany();
  await prisma.dataAccessLog.deleteMany();
  await prisma.securityEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.patientMedicalHistory.deleteMany();
  await prisma.patientAddress.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.insuranceInformation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
}

describe('Patient Routes Integration Tests', () => {
  let receptionistToken: string;
  let doctorToken: string;
  let patientOwnerToken: string;
  let otherPatientToken: string;

  let patientUser: any;
  let otherPatientUser: any;
  let patientProfileId: string;

  beforeAll(async () => {
    await cleanupDb();

    // 1. Create Receptionist
    const receptionistUser = await prisma.user.create({
      data: {
        email: 'receptionist@medicore.com',
        passwordHash: 'hash',
      },
    });
    const receptionistRole = await RbacService.createRole({
      name: RoleType.RECEPTIONIST,
      description: 'Receptionist',
    });
    await RbacService.assignRoleToUser(receptionistUser.id, receptionistRole.id);
    receptionistToken = jwt.sign(
      {
        userId: receptionistUser.id,
        email: receptionistUser.email,
        roleId: receptionistRole.id,
        role: RoleType.RECEPTIONIST,
        roles: [RoleType.RECEPTIONIST],
        roleIds: [receptionistRole.id],
      },
      JWT_SECRET
    );

    // 2. Create Doctor
    const doctorUser = await prisma.user.create({
      data: {
        email: 'doctor@medicore.com',
        passwordHash: 'hash',
      },
    });
    const doctorRole = await RbacService.createRole({
      name: RoleType.DOCTOR,
      description: 'Doctor',
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

    // 3. Create Patient Owner
    patientUser = await prisma.user.create({
      data: {
        email: 'patient1@medicore.com',
        passwordHash: 'hash',
      },
    });
    const patientRole = await RbacService.createRole({
      name: RoleType.PATIENT,
      description: 'Patient',
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

    // Create patient profile linked to Patient Owner
    const patient = await PatientService.createPatient({
      userId: patientUser.id,
      firstName: 'Alice',
      lastName: 'Smith',
      dob: new Date('1995-03-10'),
      gender: 'female',
      phone: '8888888888',
      email: 'alice.smith@gmail.com',
    });
    patientProfileId = patient.id;

    // 4. Create Another Patient (for non-owner tests)
    otherPatientUser = await prisma.user.create({
      data: {
        email: 'patient2@medicore.com',
        passwordHash: 'hash',
      },
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
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  describe('POST /api/patients', () => {
    test('should allow Receptionist to create a patient profile', async () => {
      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          firstName: 'Bob',
          lastName: 'Brown',
          dob: '1980-04-20',
          gender: 'male',
          phone: '7777777777',
          email: 'bob.brown@gmail.com',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.firstName).toBe('Bob');
    });

    test('should deny Patients from registering new patients', async () => {
      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${patientOwnerToken}`)
        .send({
          firstName: 'Charlie',
          lastName: 'Green',
          dob: '1988-12-05',
          gender: 'male',
          phone: '6666666666',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/patients/:id (Profile Fetching)', () => {
    test('should allow Patient Owner to view their own profile', async () => {
      const response = await request(app)
        .get(`/api/patients/${patientProfileId}`)
        .set('Authorization', `Bearer ${patientOwnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.firstName).toBe('Alice');
    });

    test('should allow Doctor to view a patient profile', async () => {
      const response = await request(app)
        .get(`/api/patients/${patientProfileId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.firstName).toBe('Alice');
    });

    test('should deny other Patient from viewing profile', async () => {
      const response = await request(app)
        .get(`/api/patients/${patientProfileId}`)
        .set('Authorization', `Bearer ${otherPatientToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/patients/:id/medical-history (EMR access)', () => {
    test('should allow Doctor to view medical history', async () => {
      const response = await request(app)
        .get(`/api/patients/${patientProfileId}/medical-history`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should allow Patient Owner to view medical history', async () => {
      const response = await request(app)
        .get(`/api/patients/${patientProfileId}/medical-history`)
        .set('Authorization', `Bearer ${patientOwnerToken}`);

      expect(response.status).toBe(200);
    });

    test('should deny other Patients from accessing medical history', async () => {
      const response = await request(app)
        .get(`/api/patients/${patientProfileId}/medical-history`)
        .set('Authorization', `Bearer ${otherPatientToken}`);

      expect(response.status).toBe(403);
    });

    test('should deny Receptionist from viewing medical history (restricted to clinical staff)', async () => {
      const response = await request(app)
        .get(`/api/patients/${patientProfileId}/medical-history`)
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/patients/:id/medical-history (Add EMR Entry)', () => {
    test('should allow Doctor to write to medical history', async () => {
      const response = await request(app)
        .post(`/api/patients/${patientProfileId}/medical-history`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          condition: 'Asthma',
          notes: 'Albuterol inhaler prescribed',
          diagnosedDate: '2026-01-10',
          allergies: ['Dust'],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.condition).toBe('Asthma');
    });

    test('should deny Patients from adding entries to EMR', async () => {
      const response = await request(app)
        .post(`/api/patients/${patientProfileId}/medical-history`)
        .set('Authorization', `Bearer ${patientOwnerToken}`)
        .send({
          condition: 'Fever',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/patients/:id/timeline (Patient Timeline)', () => {
    test('should allow Doctor to view patient timeline', async () => {
      const response = await request(app)
        .get(`/api/patients/${patientProfileId}/timeline`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      // It should contain the "Asthma" diagnosis added in the previous test
      const asthmaEvent = response.body.data.find((e: any) => e.title.includes('Asthma'));
      expect(asthmaEvent).toBeDefined();
      expect(asthmaEvent.type).toBe('CLINICAL_RECORD');
    });

    test('should allow Patient Owner to view their own timeline', async () => {
      const response = await request(app)
        .get(`/api/patients/${patientProfileId}/timeline`)
        .set('Authorization', `Bearer ${patientOwnerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should deny other Patients from accessing timeline', async () => {
      const response = await request(app)
        .get(`/api/patients/${patientProfileId}/timeline`)
        .set('Authorization', `Bearer ${otherPatientToken}`);

      expect(response.status).toBe(403);
    });

    test('should deny Receptionist from accessing timeline', async () => {
      const response = await request(app)
        .get(`/api/patients/${patientProfileId}/timeline`)
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(response.status).toBe(403);
    });
  });
});
