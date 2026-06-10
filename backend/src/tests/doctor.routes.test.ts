import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/prisma';
import { RbacService } from '../services/rbac.service';
import { DoctorService } from '../services/doctor.service';
import { RoleType } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

async function cleanupDb() {
  await prisma.userSession.deleteMany();
  await prisma.dataAccessLog.deleteMany();
  await prisma.securityEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.doctorAvailability.deleteMany();
  await prisma.doctorSchedule.deleteMany();
  await prisma.doctorQualification.deleteMany();
  await prisma.doctorSpecializationMapping.deleteMany();
  await prisma.doctorSpecialization.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.doctorDepartment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
}

describe('Doctor Routes Integration Tests', () => {
  let adminToken: string;
  let doctorOwnerToken: string;
  let otherDoctorToken: string;
  let patientToken: string;

  let doctorUser: any;
  let otherDoctorUser: any;
  let doctorProfileId: string;
  let department: any;

  beforeAll(async () => {
    await cleanupDb();

    // Create Roles
    const superAdminRole = await RbacService.createRole({ name: RoleType.SUPER_ADMIN, description: 'Super Admin' });
    const doctorRole = await RbacService.createRole({ name: RoleType.DOCTOR, description: 'Doctor' });
    const patientRole = await RbacService.createRole({ name: RoleType.PATIENT, description: 'Patient' });

    // 1. Create Admin
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@medicore.com',
        passwordHash: 'hash',
      },
    });
    await RbacService.assignRoleToUser(adminUser.id, superAdminRole.id);
    adminToken = jwt.sign(
      {
        userId: adminUser.id,
        email: adminUser.email,
        roleId: superAdminRole.id,
        role: RoleType.SUPER_ADMIN,
        roles: [RoleType.SUPER_ADMIN],
        roleIds: [superAdminRole.id],
      },
      JWT_SECRET
    );

    // 2. Create Doctor User (Owner of the profile we'll test)
    doctorUser = await prisma.user.create({
      data: {
        email: 'doc.owner@medicore.com',
        passwordHash: 'hash',
      },
    });
    await RbacService.assignRoleToUser(doctorUser.id, doctorRole.id);
    doctorOwnerToken = jwt.sign(
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

    // 3. Create Other Doctor User
    otherDoctorUser = await prisma.user.create({
      data: {
        email: 'other.doc@medicore.com',
        passwordHash: 'hash',
      },
    });
    await RbacService.assignRoleToUser(otherDoctorUser.id, doctorRole.id);
    otherDoctorToken = jwt.sign(
      {
        userId: otherDoctorUser.id,
        email: otherDoctorUser.email,
        roleId: doctorRole.id,
        role: RoleType.DOCTOR,
        roles: [RoleType.DOCTOR],
        roleIds: [doctorRole.id],
      },
      JWT_SECRET
    );

    // 4. Create Patient User
    const patientUser = await prisma.user.create({
      data: {
        email: 'patient@medicore.com',
        passwordHash: 'hash',
      },
    });
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

    // Create Department
    department = await prisma.doctorDepartment.create({
      data: {
        name: 'Orthopedics',
        description: 'Bones & joints',
      },
    });

    // Create Doctor profile linked to doctorUser
    const doctor = await DoctorService.createDoctor({
      userId: doctorUser.id,
      firstName: 'Gregory',
      lastName: 'House',
      phone: '9998887776',
      email: 'house@medicore.com',
      licenseNumber: 'MD998877',
      consultationFee: 300,
      departmentId: department.id,
    });
    doctorProfileId = doctor.id;
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  describe('POST /api/doctors (Create Doctor)', () => {
    test('should allow Admin to create a doctor profile', async () => {
      const response = await request(app)
        .post('/api/doctors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Stephen',
          lastName: 'Strange',
          phone: '9898989898',
          email: 'strange@medicore.com',
          licenseNumber: 'MD112233',
          consultationFee: 500,
          departmentName: 'Neurosurgery',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.firstName).toBe('Stephen');
    });

    test('should deny non-Admins from creating doctors', async () => {
      const response = await request(app)
        .post('/api/doctors')
        .set('Authorization', `Bearer ${doctorOwnerToken}`)
        .send({
          firstName: 'No',
          lastName: 'Access',
          phone: '9000000000',
          licenseNumber: 'MD000000',
          consultationFee: 100,
          departmentId: department.id,
        });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/doctors/:id (Update Doctor)', () => {
    test('should allow Admin to update doctor details', async () => {
      const response = await request(app)
        .put(`/api/doctors/${doctorProfileId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Gregory Updated By Admin',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.firstName).toBe('Gregory Updated By Admin');
    });

    test('should allow Doctor Owner to update their own details', async () => {
      const response = await request(app)
        .put(`/api/doctors/${doctorProfileId}`)
        .set('Authorization', `Bearer ${doctorOwnerToken}`)
        .send({
          firstName: 'Gregory Updated By Self',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.firstName).toBe('Gregory Updated By Self');
    });

    test('should deny other doctors from updating profile', async () => {
      const response = await request(app)
        .put(`/api/doctors/${doctorProfileId}`)
        .set('Authorization', `Bearer ${otherDoctorToken}`)
        .send({
          firstName: 'Hack Attempt',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/doctors/:id/schedules (Manage Weekly Schedule)', () => {
    test('should allow Doctor Owner to update schedules', async () => {
      const response = await request(app)
        .post(`/api/doctors/${doctorProfileId}/schedules`)
        .set('Authorization', `Bearer ${doctorOwnerToken}`)
        .send([
          { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
          { dayOfWeek: 3, startTime: '13:00', endTime: '16:00' },
        ]);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    test('should fail if schedules overlap', async () => {
      const response = await request(app)
        .post(`/api/doctors/${doctorProfileId}/schedules`)
        .set('Authorization', `Bearer ${doctorOwnerToken}`)
        .send([
          { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
          { dayOfWeek: 1, startTime: '11:30', endTime: '14:00' }, // overlaps
        ]);

      expect(response.status).toBe(400);
    });
  });

  describe('POST & DELETE /api/doctors/:id/leaves (Leave Operations)', () => {
    let leaveId: string;

    test('should allow Doctor Owner to add leave', async () => {
      const response = await request(app)
        .post(`/api/doctors/${doctorProfileId}/leaves`)
        .set('Authorization', `Bearer ${doctorOwnerToken}`)
        .send({
          date: '2026-11-20',
          reason: 'Conference leave',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeDefined();
      leaveId = response.body.data.id;
    });

    test('should deny other doctors from removing leave', async () => {
      const response = await request(app)
        .delete(`/api/doctors/leaves/${leaveId}`)
        .set('Authorization', `Bearer ${otherDoctorToken}`);

      expect(response.status).toBe(403);
    });

    test('should allow Doctor Owner to remove leave', async () => {
      const response = await request(app)
        .delete(`/api/doctors/leaves/${leaveId}`)
        .set('Authorization', `Bearer ${doctorOwnerToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/doctors/:id/statistics (Fetch Stats)', () => {
    test('should allow Doctor Owner to view their statistics', async () => {
      const response = await request(app)
        .get(`/api/doctors/${doctorProfileId}/statistics`)
        .set('Authorization', `Bearer ${doctorOwnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.doctorId).toBe(doctorProfileId);
      expect(response.body.data.weeklyScheduleHours).toBeDefined();
    });

    test('should deny patients from viewing doctor statistics', async () => {
      const response = await request(app)
        .get(`/api/doctors/${doctorProfileId}/statistics`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/doctors/:id (Soft Delete)', () => {
    test('should deny Doctor Owner from deleting their own profile', async () => {
      const response = await request(app)
        .delete(`/api/doctors/${doctorProfileId}`)
        .set('Authorization', `Bearer ${doctorOwnerToken}`);

      expect(response.status).toBe(403);
    });

    test('should allow Admin to soft delete doctor', async () => {
      const response = await request(app)
        .delete(`/api/doctors/${doctorProfileId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });
});
