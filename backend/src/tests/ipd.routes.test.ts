import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/prisma';
import { RbacService } from '../services/rbac.service';
import { RoleType } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

async function cleanupDb() {
  await prisma.nursingAssignment.deleteMany();
  await prisma.admissionNote.deleteMany();
  await prisma.dischargeSummary.deleteMany();
  await prisma.admissionCharge.deleteMany();
  await prisma.patientTransfer.deleteMany();
  await prisma.bedAssignment.deleteMany();
  await prisma.admission.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.ward.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.doctorDepartment.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.securityEvent.deleteMany();
  await prisma.dataAccessLog.deleteMany();
}

describe('IPD Routes Integration Tests', () => {
  let adminToken: string;
  let docToken: string;
  let nurseToken: string;
  let recepToken: string;
  let patientToken: string;

  let patientProfile: any;
  let otherPatientProfile: any;
  let doctorProfile: any;
  let department: any;
  let ward: any;
  let room: any;
  let bed: any;

  beforeAll(async () => {
    await cleanupDb();

    // 1. Setup Roles
    const adminRole = await RbacService.createRole({ name: RoleType.SUPER_ADMIN, description: 'Admin' });
    const docRole = await RbacService.createRole({ name: RoleType.DOCTOR, description: 'Doctor' });
    const nurseRole = await RbacService.createRole({ name: RoleType.NURSE, description: 'Nurse' });
    const recepRole = await RbacService.createRole({ name: RoleType.RECEPTIONIST, description: 'Receptionist' });
    const patientRole = await RbacService.createRole({ name: RoleType.PATIENT, description: 'Patient' });

    // 2. Setup Users & JWTs
    const adminUser = await prisma.user.create({ data: { email: 'admin.ipd.r@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(adminUser.id, adminRole.id);
    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: RoleType.SUPER_ADMIN, roles: [RoleType.SUPER_ADMIN], roleIds: [adminRole.id] },
      JWT_SECRET
    );

    const docUser = await prisma.user.create({ data: { email: 'doc.ipd.r@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(docUser.id, docRole.id);
    docToken = jwt.sign(
      { userId: docUser.id, email: docUser.email, role: RoleType.DOCTOR, roles: [RoleType.DOCTOR], roleIds: [docRole.id] },
      JWT_SECRET
    );

    const nurseUser = await prisma.user.create({ data: { email: 'nurse.ipd.r@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(nurseUser.id, nurseRole.id);
    nurseToken = jwt.sign(
      { userId: nurseUser.id, email: nurseUser.email, role: RoleType.NURSE, roles: [RoleType.NURSE], roleIds: [nurseRole.id] },
      JWT_SECRET
    );

    const recepUser = await prisma.user.create({ data: { email: 'recep.ipd.r@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(recepUser.id, recepRole.id);
    recepToken = jwt.sign(
      { userId: recepUser.id, email: recepUser.email, role: RoleType.RECEPTIONIST, roles: [RoleType.RECEPTIONIST], roleIds: [recepRole.id] },
      JWT_SECRET
    );

    const patientUser = await prisma.user.create({ data: { email: 'pat.ipd.r@gmail.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(patientUser.id, patientRole.id);
    patientToken = jwt.sign(
      { userId: patientUser.id, email: patientUser.email, role: RoleType.PATIENT, roles: [RoleType.PATIENT], roleIds: [patientRole.id] },
      JWT_SECRET
    );

    const otherPatientUser = await prisma.user.create({ data: { email: 'other.ipd.r@gmail.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(otherPatientUser.id, patientRole.id);

    // Setup profiles
    patientProfile = await prisma.patient.create({
      data: { userId: patientUser.id, firstName: 'Robby', lastName: 'Ross', dob: new Date('1990-01-01'), gender: 'MALE', phone: '9111111111', email: patientUser.email },
    });

    otherPatientProfile = await prisma.patient.create({
      data: { userId: otherPatientUser.id, firstName: 'Alice', lastName: 'Routes', dob: new Date('1992-02-02'), gender: 'FEMALE', phone: '9111111112', email: otherPatientUser.email },
    });

    department = await prisma.doctorDepartment.create({ data: { name: 'Emergency Wards' } });
    doctorProfile = await prisma.doctor.create({
      data: { userId: docUser.id, firstName: 'Dr.', lastName: 'Stephen', email: docUser.email, phone: '1116666666', licenseNumber: 'LIC_IPD_R_9', consultationFee: 1000.0, departmentId: department.id },
    });

    ward = await prisma.ward.create({ data: { name: 'Emergency Block C', type: 'EMERGENCY', capacity: 10 } });
    room = await prisma.room.create({ data: { roomNumber: 'EMR-C01', wardId: ward.id, roomType: 'EMERGENCY', chargesPerDay: 3000.0, status: 'AVAILABLE' } });
    bed = await prisma.bed.create({ data: { bedNumber: 'C01-A', roomId: room.id, status: 'AVAILABLE' } });
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  describe('Ward Catalog Config Setup', () => {
    test('should allow ADMIN to create Wards, Rooms, Beds', async () => {
      const wRes = await request(app)
        .post('/api/ipd/wards')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Private Ward Block D', type: 'PRIVATE', capacity: 5 });

      expect(wRes.status).toBe(201);
      const wardId = wRes.body.data.id;

      const rRes = await request(app)
        .post('/api/ipd/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roomNumber: 'PRV-D01', wardId, roomType: 'PRIVATE', chargesPerDay: 8000.0 });

      expect(rRes.status).toBe(201);
      const roomId = rRes.body.data.id;

      const bRes = await request(app)
        .post('/api/ipd/beds')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ bedNumber: 'D01-A', roomId });

      expect(bRes.status).toBe(201);
    });

    test('should reject DOCTOR from creating Wards', async () => {
      const res = await request(app)
        .post('/api/ipd/wards')
        .set('Authorization', `Bearer ${docToken}`)
        .send({ name: 'Rejected Ward', type: 'GENERAL', capacity: 100 });

      expect(res.status).toBe(403);
    });
  });

  describe('Admissions and Discharges Workflow', () => {
    let admissionId: string;

    test('should allow RECEPTIONIST to admit a patient', async () => {
      const res = await request(app)
        .post('/api/ipd/admissions')
        .set('Authorization', `Bearer ${recepToken}`)
        .send({
          patientId: patientProfile.id,
          doctorId: doctorProfile.id,
          reason: 'Severe dehydration',
          bedId: bed.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('ADMITTED');
      admissionId = res.body.data.id;
    });

    test('should allow NURSE to log progress notes', async () => {
      const res = await request(app)
        .post(`/api/ipd/admissions/${admissionId}/notes`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ noteType: 'NURSING', content: 'Vitals stable. Saline drip running.' });

      expect(res.status).toBe(201);
      expect(res.body.data.noteType).toBe('NURSING');
    });

    test('should allow DOCTOR to discharge patient and log summary', async () => {
      const res = await request(app)
        .post(`/api/ipd/admissions/${admissionId}/discharge`)
        .set('Authorization', `Bearer ${docToken}`)
        .send({
          treatmentSummary: 'Rehydrated with saline IV.',
          medicationInstructions: 'Oral rehydration salts.',
          followUpInstructions: 'Review if fever recurs.',
          dischargeCondition: 'Recovered',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.updatedAdmiss.status).toBe('DISCHARGED');
    });
  });

  describe('Patient Ownership Checks', () => {
    let ownAdmissionId: string;
    let otherAdmissionId: string;

    beforeAll(async () => {
      // Free the bed first
      await prisma.bed.update({ where: { id: bed.id }, data: { status: 'AVAILABLE' } });
      await prisma.ward.update({ where: { id: ward.id }, data: { occupancy: 0 } });

      // Admit own patient
      const own = await prisma.admission.create({
        data: {
          admissionNumber: 'ADM-OWN',
          patientId: patientProfile.id,
          doctorId: doctorProfile.id,
          status: 'ADMITTED',
          reason: 'Own check',
        },
      });
      ownAdmissionId = own.id;

      // Free bed again for other patient
      await prisma.bed.create({
        data: { bedNumber: 'C01-B_OTHER', roomId: room.id, status: 'AVAILABLE' },
      });

      const other = await prisma.admission.create({
        data: {
          admissionNumber: 'ADM-OTHER',
          patientId: otherPatientProfile.id,
          doctorId: doctorProfile.id,
          status: 'ADMITTED',
          reason: 'Other check',
        },
      });
      otherAdmissionId = other.id;
    });

    test('should allow PATIENT to view their own admission report details', async () => {
      const res = await request(app)
        .get(`/api/ipd/admissions/${ownAdmissionId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(ownAdmissionId);
    });

    test('should reject PATIENT from viewing another patient\'s admission details', async () => {
      const res = await request(app)
        .get(`/api/ipd/admissions/${otherAdmissionId}`)
        .set('Authorization', `Bearer ${patientToken}`); // patientToken belongs to patientProfile (Bob Ross) not other patient profile

      expect(res.status).toBe(403);
    });

    test('should reject PATIENT from reading dashboard telemetry analytics', async () => {
      const res = await request(app)
        .get('/api/ipd/dashboard')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403); // Doctors, Admins only
    });
  });
});
