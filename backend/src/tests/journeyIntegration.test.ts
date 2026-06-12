import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/prisma';
import { RbacService } from '../services/rbac.service';
import { RoleType, AppointmentStatus } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

async function cleanupDb() {
  await prisma.aiFeedback.deleteMany();
  await prisma.aiMessage.deleteMany();
  await prisma.aiConversation.deleteMany();
  await prisma.pharmacyTransaction.deleteMany();
  await prisma.prescriptionDispenseItem.deleteMany();
  await prisma.prescriptionDispense.deleteMany();
  await prisma.prescriptionMedicine.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.medicineBatch.deleteMany();
  await prisma.medicineInventory.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.medicineSubstitution.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.medicineCategory.deleteMany();
  await prisma.supplier.deleteMany();
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
  await prisma.labReport.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.labTechnicianAssignment.deleteMany();
  await prisma.labSample.deleteMany();
  await prisma.labOrder.deleteMany();
  await prisma.labReferenceRange.deleteMany();
  await prisma.labTest.deleteMany();
  await prisma.labTestCategory.deleteMany();
  await prisma.admissionCharge.deleteMany();
  await prisma.bedAssignment.deleteMany();
  await prisma.patientTransfer.deleteMany();
  await prisma.dischargeSummary.deleteMany();
  await prisma.nursingAssignment.deleteMany();
  await prisma.admissionNote.deleteMany();
  await prisma.admission.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.ward.deleteMany();
  await prisma.emergencyDisposition.deleteMany();
  await prisma.emergencyTimeline.deleteMany();
  await prisma.criticalAlert.deleteMany();
  await prisma.emergencyTransfer.deleteMany();
  await prisma.traumaCase.deleteMany();
  await prisma.emergencyProcedure.deleteMany();
  await prisma.emergencyTreatment.deleteMany();
  await prisma.emergencyDoctorAssignment.deleteMany();
  await prisma.triageAssessment.deleteMany();
  await prisma.emergencyCase.deleteMany();
  await prisma.clinicalNote.deleteMany();
  await prisma.medicalDocument.deleteMany();
  await prisma.medicalRecordVersion.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.treatmentPlan.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointmentStatusHistory.deleteMany();
  await prisma.appointmentReminder.deleteMany();
  await prisma.appointmentNote.deleteMany();
  await prisma.appointmentAttachment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patientMedicalHistory.deleteMany();
  await prisma.patientAddress.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.patientAllergy.deleteMany();
  await prisma.patientCondition.deleteMany();
  await prisma.patientVital.deleteMany();
  await prisma.insuranceInformation.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctorAvailability.deleteMany();
  await prisma.doctorSchedule.deleteMany();
  await prisma.doctorQualification.deleteMany();
  await prisma.doctorSpecializationMapping.deleteMany();
  await prisma.doctorSpecialization.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.doctorDepartment.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.securityEvent.deleteMany();
  await prisma.dataAccessLog.deleteMany();
  await prisma.user.deleteMany();
}

function signToken(user: { id: string; email: string }, role: RoleType, roleId: string) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role,
      roles: [role],
      roleIds: [roleId],
    },
    JWT_SECRET
  );
}

describe('MediCore Journey Integration Tests', () => {
  let adminToken: string;
  let doctorToken: string;
  let nurseToken: string;
  let patientToken: string;
  let billingToken: string;
  let emergencyToken: string;
  let receptionistToken: string;

  let doctorUser: { id: string; email: string };
  let patientUser: { id: string; email: string };
  let doctorProfileId: string;
  let patientProfileId: string;
  let appointmentId: string;
  let invoiceId: string;
  let emergencyCaseId: string;

  beforeAll(async () => {
    await cleanupDb();

    const roles = {
      admin: await RbacService.createRole({ name: RoleType.SUPER_ADMIN, description: 'Admin' }),
      doctor: await RbacService.createRole({ name: RoleType.DOCTOR, description: 'Doctor' }),
      nurse: await RbacService.createRole({ name: RoleType.NURSE, description: 'Nurse' }),
      patient: await RbacService.createRole({ name: RoleType.PATIENT, description: 'Patient' }),
      billing: await RbacService.createRole({ name: RoleType.BILLING_EXEC, description: 'Billing' }),
      emergency: await RbacService.createRole({ name: RoleType.EMERGENCY_DOCTOR, description: 'ER Doctor' }),
      receptionist: await RbacService.createRole({ name: RoleType.RECEPTIONIST, description: 'Receptionist' }),
    };

    const adminUser = await prisma.user.create({ data: { email: 'admin.journey@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(adminUser.id, roles.admin.id);
    adminToken = signToken(adminUser, RoleType.SUPER_ADMIN, roles.admin.id);

    doctorUser = await prisma.user.create({ data: { email: 'doctor.journey@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(doctorUser.id, roles.doctor.id);
    doctorToken = signToken(doctorUser, RoleType.DOCTOR, roles.doctor.id);

    const nurseUser = await prisma.user.create({ data: { email: 'nurse.journey@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(nurseUser.id, roles.nurse.id);
    nurseToken = signToken(nurseUser, RoleType.NURSE, roles.nurse.id);

    patientUser = await prisma.user.create({ data: { email: 'patient.journey@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(patientUser.id, roles.patient.id);
    patientToken = signToken(patientUser, RoleType.PATIENT, roles.patient.id);

    const billingUser = await prisma.user.create({ data: { email: 'billing.journey@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(billingUser.id, roles.billing.id);
    billingToken = signToken(billingUser, RoleType.BILLING_EXEC, roles.billing.id);

    const emergencyUser = await prisma.user.create({ data: { email: 'emergency.journey@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(emergencyUser.id, roles.emergency.id);
    emergencyToken = signToken(emergencyUser, RoleType.EMERGENCY_DOCTOR, roles.emergency.id);

    const receptionistUser = await prisma.user.create({ data: { email: 'receptionist.journey@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(receptionistUser.id, roles.receptionist.id);
    receptionistToken = signToken(receptionistUser, RoleType.RECEPTIONIST, roles.receptionist.id);

    const dept = await prisma.doctorDepartment.create({ data: { name: 'General Medicine' } });
    const doctor = await prisma.doctor.create({
      data: {
        userId: doctorUser.id,
        firstName: 'Jane',
        lastName: 'Smith',
        email: doctorUser.email,
        phone: '5551234567',
        licenseNumber: 'LIC-JOURNEY-1',
        consultationFee: 600,
        departmentId: dept.id,
      },
    });
    doctorProfileId = doctor.id;

    const tomorrow = new Date(Date.now() + 86400000);
    await prisma.doctorSchedule.create({
      data: {
        doctorId: doctor.id,
        dayOfWeek: tomorrow.getDay(),
        startTime: '09:00',
        endTime: '17:00',
      },
    });
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  describe('Patient Journey', () => {
    test('registers profile and accesses patient portal data', async () => {
      const createRes = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          userId: patientUser.id,
          firstName: 'Alice',
          lastName: 'Patient',
          dob: '1992-08-20',
          gender: 'female',
          phone: '7776665555',
          email: patientUser.email,
        });

      expect(createRes.status).toBe(201);
      patientProfileId = createRes.body.data.id;

      const profileRes = await request(app)
        .get(`/api/patients/${patientProfileId}`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.firstName).toBe('Alice');

      const timelineRes = await request(app)
        .get(`/api/patients/${patientProfileId}/timeline`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(timelineRes.status).toBe(200);
    });
  });

  describe('Doctor Journey', () => {
    test('views doctor profile and records clinical documentation', async () => {
      const profileRes = await request(app)
        .get(`/api/doctors/${doctorProfileId}`)
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.firstName).toBe('Jane');

      const scheduleRes = await request(app)
        .get(`/api/doctors/${doctorProfileId}/availability`)
        .query({ date: new Date(Date.now() + 86400000).toISOString().split('T')[0] })
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(scheduleRes.status).toBe(200);

      const emrRes = await request(app)
        .post('/api/emr')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId: patientProfileId,
          doctorId: doctorProfileId,
          symptoms: 'Persistent headache',
          observations: 'No neurological deficits',
          diagnoses: [{ code: 'R51', name: 'Headache', severity: 'MILD' }],
        });
      expect(emrRes.status).toBe(201);
      expect(emrRes.body.data.version).toBe(1);
    });
  });

  describe('Admin Journey', () => {
    test('accesses security dashboard, RBAC, and operational statistics', async () => {
      const securityRes = await request(app)
        .get('/api/security/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(securityRes.status).toBe(200);

      const rolesRes = await request(app)
        .get('/api/rbac/roles')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(rolesRes.status).toBe(200);
      expect(Array.isArray(rolesRes.body.data)).toBe(true);

      const statsRes = await request(app)
        .get('/api/appointments/statistics')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(statsRes.status).toBe(200);
    });
  });

  describe('Emergency Journey', () => {
    test('runs ER intake through triage and disposition', async () => {
      const openRes = await request(app)
        .post('/api/emergency')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: patientProfileId,
          arrivalMode: 'WALK_IN',
          chiefComplaint: 'Severe abdominal pain',
        });
      expect(openRes.status).toBe(201);
      emergencyCaseId = openRes.body.data.id;

      const triageRes = await request(app)
        .post(`/api/emergency/${emergencyCaseId}/triage`)
        .set('Authorization', `Bearer ${emergencyToken}`)
        .send({
          triageLevel: 'LEVEL_2_EMERGENCY',
          chiefComplaint: 'Abdominal pain',
          symptoms: 'Nausea and guarding',
          systolicBP: 130,
          diastolicBP: 85,
          heartRate: 98,
          temperature: 37.4,
          respiratoryRate: 20,
          oxygenSaturation: 97,
        });
      expect(triageRes.status).toBe(201);

      const dashboardRes = await request(app)
        .get('/api/emergency/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(dashboardRes.status).toBe(200);
      expect(dashboardRes.body.data.activeCasesCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Billing Journey', () => {
    test('creates, finalizes, and settles an invoice', async () => {
      const createRes = await request(app)
        .post('/api/billing/invoices')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          patientId: patientProfileId,
          items: [
            { description: 'Consultation Fee', quantity: 1, unitPrice: 600, itemType: 'CONSULTATION' },
          ],
        });
      expect(createRes.status).toBe(201);
      invoiceId = createRes.body.data.id;

      const finalizeRes = await request(app)
        .put(`/api/billing/invoices/${invoiceId}/finalize`)
        .set('Authorization', `Bearer ${billingToken}`);
      expect(finalizeRes.status).toBe(200);
      expect(finalizeRes.body.data.status).toBe('FINALIZED');

      const payRes = await request(app)
        .post(`/api/billing/invoices/${invoiceId}/payments`)
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          amount: Number(finalizeRes.body.data.totalAmount),
          paymentMethodName: 'CARD',
          transactionRef: 'JOURNEY-PAY-001',
        });
      expect(payRes.status).toBe(201);
      expect(payRes.body.data.updatedInvoice.status).toBe('PAID');
    });
  });

  describe('Appointment Journey', () => {
    test('books, confirms, checks in, and completes an appointment', async () => {
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const bookRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          patientId: patientProfileId,
          doctorId: doctorProfileId,
          date: tomorrowStr,
          time: '11:00',
          duration: 30,
          notes: 'Follow-up visit',
        });
      expect(bookRes.status).toBe(201);
      expect(bookRes.body.data.status).toBe('REQUESTED');
      appointmentId = bookRes.body.data.id;

      const confirmRes = await request(app)
        .put(`/api/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ status: AppointmentStatus.CONFIRMED, reason: 'Slot confirmed' });
      expect(confirmRes.status).toBe(200);

      const checkInRes = await request(app)
        .put(`/api/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ status: AppointmentStatus.CHECKED_IN, reason: 'Patient arrived' });
      expect(checkInRes.status).toBe(200);

      const vitalsRes = await request(app)
        .post('/api/emr/vitals')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patientId: patientProfileId,
          bloodPressure: '118/76',
          heartRate: 70,
          respiratoryRate: 16,
          temperature: 36.8,
          oxygenSaturation: 99,
          height: 170,
          weight: 68,
        });
      expect(vitalsRes.status).toBe(201);

      const consultRes = await request(app)
        .put(`/api/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: AppointmentStatus.IN_CONSULTATION, reason: 'Consultation started' });
      expect(consultRes.status).toBe(200);

      const completeRes = await request(app)
        .put(`/api/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: AppointmentStatus.COMPLETED, reason: 'Consultation finished' });
      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.status).toBe('COMPLETED');
    });
  });
});
