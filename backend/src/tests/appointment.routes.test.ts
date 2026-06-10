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
  await prisma.appointmentStatusHistory.deleteMany();
  await prisma.appointmentReminder.deleteMany();
  await prisma.appointmentNote.deleteMany();
  await prisma.appointmentAttachment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorAvailability.deleteMany();
  await prisma.doctorSchedule.deleteMany();
  await prisma.doctorQualification.deleteMany();
  await prisma.doctorSpecializationMapping.deleteMany();
  await prisma.doctorSpecialization.deleteMany();
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

describe('Appointment Routes Integration Tests', () => {
  let adminToken: string;
  let receptionistToken: string;
  let doctorToken: string;
  let patientOwnerToken: string;
  let otherPatientToken: string;

  let patientProfileId: string;
  let otherPatientProfileId: string;
  let doctorProfileId: string;
  let docUser: any;
  let patUser: any;
  let otherPatUser: any;
  let department: any;

  let appointmentId: string;

  beforeAll(async () => {
    await cleanupDb();

    // Create roles
    const adminRole = await RbacService.createRole({ name: RoleType.SUPER_ADMIN, description: 'Admin' });
    const recepRole = await RbacService.createRole({ name: RoleType.RECEPTIONIST, description: 'Receptionist' });
    const docRole = await RbacService.createRole({ name: RoleType.DOCTOR, description: 'Doctor' });
    const patRole = await RbacService.createRole({ name: RoleType.PATIENT, description: 'Patient' });

    // 1. Admin
    const admin = await prisma.user.create({ data: { email: 'admin.appt@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(admin.id, adminRole.id);
    adminToken = jwt.sign(
      { userId: admin.id, email: admin.email, role: RoleType.SUPER_ADMIN, roles: [RoleType.SUPER_ADMIN], roleIds: [adminRole.id] },
      JWT_SECRET
    );

    // 2. Receptionist
    const receptionist = await prisma.user.create({ data: { email: 'recep.appt@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(receptionist.id, recepRole.id);
    receptionistToken = jwt.sign(
      { userId: receptionist.id, email: receptionist.email, role: RoleType.RECEPTIONIST, roles: [RoleType.RECEPTIONIST], roleIds: [recepRole.id] },
      JWT_SECRET
    );

    // 3. Doctor User
    docUser = await prisma.user.create({ data: { email: 'doc.appt@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(docUser.id, docRole.id);
    doctorToken = jwt.sign(
      { userId: docUser.id, email: docUser.email, role: RoleType.DOCTOR, roles: [RoleType.DOCTOR], roleIds: [docRole.id] },
      JWT_SECRET
    );

    // 4. Patient Owner User
    patUser = await prisma.user.create({ data: { email: 'patient1.appt@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(patUser.id, patRole.id);
    patientOwnerToken = jwt.sign(
      { userId: patUser.id, email: patUser.email, role: RoleType.PATIENT, roles: [RoleType.PATIENT], roleIds: [patRole.id] },
      JWT_SECRET
    );

    // 5. Other Patient User
    otherPatUser = await prisma.user.create({ data: { email: 'patient2.appt@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(otherPatUser.id, patRole.id);
    otherPatientToken = jwt.sign(
      { userId: otherPatUser.id, email: otherPatUser.email, role: RoleType.PATIENT, roles: [RoleType.PATIENT], roleIds: [patRole.id] },
      JWT_SECRET
    );

    // Create Department
    department = await prisma.doctorDepartment.create({
      data: { name: 'Emergency', description: 'Urgent Care' },
    });

    // Create Doctor (Watson, scheduled Mon 09:00 - 17:00)
    const doctor = await DoctorService.createDoctor({
      userId: docUser.id,
      firstName: 'John',
      lastName: 'Watson',
      phone: '9999999120',
      licenseNumber: 'DOC120',
      consultationFee: 150,
      departmentId: department.id,
      schedules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
    });
    doctorProfileId = doctor.id;

    // Create Patient Owner profile
    const patOwnerProfile = await PatientService.createPatient({
      userId: patUser.id,
      firstName: 'Alice',
      lastName: 'Smith',
      dob: new Date('1995-03-10'),
      gender: 'female',
      phone: '8888888120',
    });
    patientProfileId = patOwnerProfile.id;

    // Create Other Patient profile
    const otherPatProfile = await PatientService.createPatient({
      userId: otherPatUser.id,
      firstName: 'Bob',
      lastName: 'Brown',
      dob: new Date('1992-06-15'),
      gender: 'male',
      phone: '8888888121',
    });
    otherPatientProfileId = otherPatProfile.id;
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  describe('POST /api/appointments (Book Appointment)', () => {
    test('should allow Receptionist to book appointment for a patient', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patientId: patientProfileId,
          doctorId: doctorProfileId,
          date: '2026-07-06', // Monday
          time: '10:00',
          duration: 30,
          notes: 'Routine visit',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeDefined();
      appointmentId = response.body.data.id;
    });

    test('should allow Patient Owner to book for themselves', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientOwnerToken}`)
        .send({
          patientId: patientProfileId,
          doctorId: doctorProfileId,
          date: '2026-07-06',
          time: '11:00',
          duration: 30,
        });

      expect(response.status).toBe(201);
    });

    test('should deny Patient from booking for another patient profile', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientOwnerToken}`)
        .send({
          patientId: otherPatientProfileId, // Alice booking for Bob
          doctorId: doctorProfileId,
          date: '2026-07-06',
          time: '12:00',
        });

      expect(response.status).toBe(400); // throws Unauthorized in validation
    });
  });

  describe('GET /api/appointments (Query List)', () => {
    test('should allow Receptionist to list all appointments', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(response.status).toBe(200);
      expect(response.body.appointments.length).toBeGreaterThanOrEqual(1);
    });

    test('should restrict Patient list query to only their own appointments', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${patientOwnerToken}`);

      expect(response.status).toBe(200);
      // Alice should see her 2 booked appointments
      expect(response.body.appointments.every((a: any) => a.patientId === patientProfileId)).toBe(true);
    });
  });

  describe('GET /api/appointments/:id (View Details)', () => {
    test('should allow Patient Owner to view their own appointment details', async () => {
      const response = await request(app)
        .get(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${patientOwnerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(appointmentId);
    });

    test('should allow assigned Doctor to view appointment details', async () => {
      const response = await request(app)
        .get(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
    });

    test('should deny other Patient from viewing details', async () => {
      const response = await request(app)
        .get(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${otherPatientToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/appointments/:id/reschedule (Reschedule)', () => {
    test('should allow Patient Owner to reschedule their own appointment', async () => {
      const response = await request(app)
        .put(`/api/appointments/${appointmentId}/reschedule`)
        .set('Authorization', `Bearer ${patientOwnerToken}`)
        .send({
          date: '2026-07-06',
          time: '13:00',
          reason: 'Need afternoon slot',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.time).toBe('13:00');
    });

    test('should deny other Patient from rescheduling', async () => {
      const response = await request(app)
        .put(`/api/appointments/${appointmentId}/reschedule`)
        .set('Authorization', `Bearer ${otherPatientToken}`)
        .send({
          date: '2026-07-06',
          time: '14:00',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/appointments/:id/notes (Add Notes)', () => {
    test('should allow Doctor to add note to assigned appointment', async () => {
      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/notes`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          content: 'Patient complains of chest pain',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.content).toBe('Patient complains of chest pain');
    });

    test('should deny patient from adding note (clinical details restricted)', async () => {
      const response = await request(app)
        .post(`/api/appointments/${appointmentId}/notes`)
        .set('Authorization', `Bearer ${patientOwnerToken}`)
        .send({
          content: 'Patient note try',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/appointments/statistics (Analytics)', () => {
    test('should allow Admin to view analytics statistics', async () => {
      const response = await request(app)
        .get('/api/appointments/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalAppointments).toBeDefined();
    });

    test('should deny Receptionist from fetching analytics', async () => {
      const response = await request(app)
        .get('/api/appointments/statistics')
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(response.status).toBe(403);
    });
  });
});
