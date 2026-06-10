import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/prisma';
import { RbacService } from '../services/rbac.service';
import { DoctorService } from '../services/doctor.service';
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
  await prisma.patientAllergy.deleteMany();
  await prisma.patientCondition.deleteMany();
  await prisma.patientVital.deleteMany();
  await prisma.clinicalNote.deleteMany();
  await prisma.medicalDocument.deleteMany();
  await prisma.medicalRecordVersion.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.treatmentPlan.deleteMany();
  await prisma.prescriptionMedicine.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.doctorAvailability.deleteMany();
  await prisma.doctorSchedule.deleteMany();
  await prisma.doctorQualification.deleteMany();
  await prisma.doctorSpecializationMapping.deleteMany();
  await prisma.doctorSpecialization.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.doctorDepartment.deleteMany();
  await prisma.patientAddress.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.insuranceInformation.deleteMany();
  await prisma.patientMedicalHistory.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
}

describe('EMR Routes Integration Tests', () => {
  let doctorToken: string;
  let patientOwnerToken: string;
  let otherPatientToken: string;
  let nurseToken: string;

  let patientProfileId: string;
  let doctorProfileId: string;
  let docUser: any;
  let patUser: any;
  let otherPatUser: any;
  let nurseUser: any;
  let department: any;

  let medicalRecordId: string;

  beforeAll(async () => {
    await cleanupDb();

    // Create roles
    const adminRole = await RbacService.createRole({ name: RoleType.SUPER_ADMIN, description: 'Admin' });
    const docRole = await RbacService.createRole({ name: RoleType.DOCTOR, description: 'Doctor' });
    const patRole = await RbacService.createRole({ name: RoleType.PATIENT, description: 'Patient' });
    const nurseRole = await RbacService.createRole({ name: RoleType.NURSE, description: 'Nurse' });

    // 1. Admin
    const admin = await prisma.user.create({ data: { email: 'admin.emr@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(admin.id, adminRole.id);

    // 2. Doctor User
    docUser = await prisma.user.create({ data: { email: 'doc.emr@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(docUser.id, docRole.id);
    doctorToken = jwt.sign(
      { userId: docUser.id, email: docUser.email, role: RoleType.DOCTOR, roles: [RoleType.DOCTOR], roleIds: [docRole.id] },
      JWT_SECRET
    );

    // 3. Nurse User
    nurseUser = await prisma.user.create({ data: { email: 'nurse.emr@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(nurseUser.id, nurseRole.id);
    nurseToken = jwt.sign(
      { userId: nurseUser.id, email: nurseUser.email, role: RoleType.NURSE, roles: [RoleType.NURSE], roleIds: [nurseRole.id] },
      JWT_SECRET
    );

    // 4. Patient Owner User
    patUser = await prisma.user.create({ data: { email: 'patient1.emr@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(patUser.id, patRole.id);
    patientOwnerToken = jwt.sign(
      { userId: patUser.id, email: patUser.email, role: RoleType.PATIENT, roles: [RoleType.PATIENT], roleIds: [patRole.id] },
      JWT_SECRET
    );

    // 5. Other Patient User
    otherPatUser = await prisma.user.create({ data: { email: 'patient2.emr@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(otherPatUser.id, patRole.id);
    otherPatientToken = jwt.sign(
      { userId: otherPatUser.id, email: otherPatUser.email, role: RoleType.PATIENT, roles: [RoleType.PATIENT], roleIds: [patRole.id] },
      JWT_SECRET
    );

    // Create Doctor Profile
    department = await prisma.doctorDepartment.create({ data: { name: 'Orthopedics' } });
    const docProfile = await DoctorService.createDoctor({
      userId: docUser.id,
      firstName: 'Elizabeth',
      lastName: 'Blackwell',
      email: docUser.email,
      phone: '9999999333',
      licenseNumber: 'DOC333',
      consultationFee: 200,
      departmentId: department.id,
    }, admin.id);
    doctorProfileId = docProfile.id;

    // Create Patient Profiles
    const patProfile1 = await PatientService.createPatient({
      userId: patUser.id,
      firstName: 'Alice',
      lastName: 'Smith',
      dob: new Date('1995-05-15'),
      gender: 'female',
      phone: '8888888333',
    }, admin.id);
    patientProfileId = patProfile1.id;

    await PatientService.createPatient({
      userId: otherPatUser.id,
      firstName: 'Bob',
      lastName: 'Jones',
      dob: new Date('1988-10-20'),
      gender: 'male',
      phone: '8888888444',
    }, admin.id);
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  describe('POST /api/emr (Create Medical Record)', () => {
    test('should allow Doctor to create EMR record', async () => {
      const response = await request(app)
        .post('/api/emr')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId: patientProfileId,
          doctorId: doctorProfileId,
          symptoms: 'Patient reports mild back pain after lifting weights',
          observations: 'Tenderness observed in lower lumbar region',
          diagnoses: [
            {
              code: 'M54.5',
              name: 'Low back pain',
              severity: 'ACUTE',
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeDefined();
      medicalRecordId = response.body.data.id;
    });

    test('should deny Patient from creating EMR record', async () => {
      const response = await request(app)
        .post('/api/emr')
        .set('Authorization', `Bearer ${patientOwnerToken}`)
        .send({
          patientId: patientProfileId,
          doctorId: doctorProfileId,
          symptoms: 'Patient trying to self-create',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/emr/:id (View Details)', () => {
    test('should allow patient owner to view their own EMR details', async () => {
      const response = await request(app)
        .get(`/api/emr/${medicalRecordId}`)
        .set('Authorization', `Bearer ${patientOwnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.symptoms).toContain('back pain');
    });

    test('should deny other patient from viewing EMR details', async () => {
      const response = await request(app)
        .get(`/api/emr/${medicalRecordId}`)
        .set('Authorization', `Bearer ${otherPatientToken}`);

      expect(response.status).toBe(403);
    });

    test('should allow Nurse to view EMR details', async () => {
      const response = await request(app)
        .get(`/api/emr/${medicalRecordId}`)
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/emr/:id (Update Record)', () => {
    test('should allow assigned Doctor to update EMR record', async () => {
      const response = await request(app)
        .put(`/api/emr/${medicalRecordId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          symptoms: 'Back pain worsening with side bending',
          changeReason: 'Updated clinical symptoms on next day checkup',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.symptoms).toBe('Back pain worsening with side bending');
      expect(response.body.data.version).toBe(2);
    });

    test('should deny Patient from updating EMR record', async () => {
      const response = await request(app)
        .put(`/api/emr/${medicalRecordId}`)
        .set('Authorization', `Bearer ${patientOwnerToken}`)
        .send({
          symptoms: 'Malicious update attempt',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/emr/patient/:patientId/timeline (Patient Timeline)', () => {
    test('should allow Patient Owner to retrieve their timeline', async () => {
      const response = await request(app)
        .get(`/api/emr/patient/${patientProfileId}/timeline`)
        .set('Authorization', `Bearer ${patientOwnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].type).toBeDefined();
    });

    test('should deny other Patient from retrieving timeline', async () => {
      const response = await request(app)
        .get(`/api/emr/patient/${patientProfileId}/timeline`)
        .set('Authorization', `Bearer ${otherPatientToken}`);

      expect(response.status).toBe(403);
    });
  });
});
