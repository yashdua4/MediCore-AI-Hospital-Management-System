import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/prisma';
import { RbacService } from '../services/rbac.service';
import { RoleType, AppointmentStatus } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

async function cleanupDb() {
  console.log('Cleaning up E2E test database...');
  // AI
  await prisma.aiFeedback.deleteMany();
  await prisma.aiMessage.deleteMany();
  await prisma.aiConversation.deleteMany();

  // Pharmacy / Dispensing
  await prisma.pharmacyTransaction.deleteMany();
  await prisma.prescriptionDispenseItem.deleteMany();
  await prisma.prescriptionDispense.deleteMany();
  await prisma.prescriptionMedicine.deleteMany();
  await prisma.prescription.deleteMany();

  // Purchase & Inventory
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.medicineBatch.deleteMany();
  await prisma.medicineInventory.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.medicineSubstitution.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.medicineCategory.deleteMany();
  await prisma.supplier.deleteMany();

  // Billing & Payments
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

  // Lab
  await prisma.labReport.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.labTechnicianAssignment.deleteMany();
  await prisma.labSample.deleteMany();
  await prisma.labOrder.deleteMany();
  await prisma.labReferenceRange.deleteMany();
  await prisma.labTest.deleteMany();
  await prisma.labTestCategory.deleteMany();

  // IPD / Ward
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

  // Emergency
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

  // EMR
  await prisma.clinicalNote.deleteMany();
  await prisma.medicalDocument.deleteMany();
  await prisma.medicalRecordVersion.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.treatmentPlan.deleteMany();
  await prisma.medicalRecord.deleteMany();

  // Appointments
  await prisma.appointmentStatusHistory.deleteMany();
  await prisma.appointmentReminder.deleteMany();
  await prisma.appointmentNote.deleteMany();
  await prisma.appointmentAttachment.deleteMany();
  await prisma.appointment.deleteMany();

  // Patient Sub-entities
  await prisma.patientMedicalHistory.deleteMany();
  await prisma.patientAddress.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.patientAllergy.deleteMany();
  await prisma.patientCondition.deleteMany();
  await prisma.patientVital.deleteMany();
  await prisma.insuranceInformation.deleteMany();

  // Core Patients, Doctors, Users
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

describe('MediCore E2E Portal Workflow Tests', () => {
  let adminToken: string;
  let receptionistToken: string;
  let doctorToken: string;
  let labTechToken: string;
  let billingToken: string;
  let patientUserToken: string;

  let receptionistUser: any;
  let doctorUser: any;
  let labTechUser: any;
  let billingUser: any;
  let patientUser: any;

  let doctorProfileId: string;
  let patientProfileId: string;
  let labTestId: string;
  let appointmentId: string;
  let medicalRecordId: string;
  let labOrderId: string;
  let sampleId: string;
  let invoiceId: string;

  beforeAll(async () => {
    await cleanupDb();

    // 1. Setup system roles
    const adminRole = await RbacService.createRole({ name: RoleType.SUPER_ADMIN, description: 'Super Admin' });
    const recepRole = await RbacService.createRole({ name: RoleType.RECEPTIONIST, description: 'Receptionist' });
    const docRole = await RbacService.createRole({ name: RoleType.DOCTOR, description: 'Doctor' });
    const techRole = await RbacService.createRole({ name: RoleType.LAB_TECH, description: 'Lab Tech' });
    const billingRole = await RbacService.createRole({ name: RoleType.BILLING_EXEC, description: 'Billing Exec' });
    const patientRole = await RbacService.createRole({ name: RoleType.PATIENT, description: 'Patient' });

    // 2. Create Users & generate JWTs
    const adminUser = await prisma.user.create({ data: { email: 'admin.e2e@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(adminUser.id, adminRole.id);
    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: RoleType.SUPER_ADMIN, roles: [RoleType.SUPER_ADMIN], roleIds: [adminRole.id] },
      JWT_SECRET
    );

    receptionistUser = await prisma.user.create({ data: { email: 'recep.e2e@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(receptionistUser.id, recepRole.id);
    receptionistToken = jwt.sign(
      { userId: receptionistUser.id, email: receptionistUser.email, role: RoleType.RECEPTIONIST, roles: [RoleType.RECEPTIONIST], roleIds: [recepRole.id] },
      JWT_SECRET
    );

    doctorUser = await prisma.user.create({ data: { email: 'doc.e2e@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(doctorUser.id, docRole.id);
    doctorToken = jwt.sign(
      { userId: doctorUser.id, email: doctorUser.email, role: RoleType.DOCTOR, roles: [RoleType.DOCTOR], roleIds: [docRole.id] },
      JWT_SECRET
    );

    labTechUser = await prisma.user.create({ data: { email: 'tech.e2e@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(labTechUser.id, techRole.id);
    labTechToken = jwt.sign(
      { userId: labTechUser.id, email: labTechUser.email, role: RoleType.LAB_TECH, roles: [RoleType.LAB_TECH], roleIds: [techRole.id] },
      JWT_SECRET
    );

    billingUser = await prisma.user.create({ data: { email: 'billing.e2e@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(billingUser.id, billingRole.id);
    billingToken = jwt.sign(
      { userId: billingUser.id, email: billingUser.email, role: RoleType.BILLING_EXEC, roles: [RoleType.BILLING_EXEC], roleIds: [billingRole.id] },
      JWT_SECRET
    );

    patientUser = await prisma.user.create({ data: { email: 'patient.e2e@medicore.com', passwordHash: 'hash' } });
    await RbacService.assignRoleToUser(patientUser.id, patientRole.id);
    patientUserToken = jwt.sign(
      { userId: patientUser.id, email: patientUser.email, role: RoleType.PATIENT, roles: [RoleType.PATIENT], roleIds: [patientRole.id] },
      JWT_SECRET
    );

    // 3. Setup clinical department and doctor profile
    const dept = await prisma.doctorDepartment.create({
      data: { name: 'Emergency Medicine', description: 'ED' },
    });

    const doctor = await prisma.doctor.create({
      data: {
        userId: doctorUser.id,
        firstName: 'John',
        lastName: 'Watson',
        email: doctorUser.email,
        phone: '8887776665',
        licenseNumber: 'LIC-E2E-1',
        consultationFee: 500.00,
        departmentId: dept.id,
      },
    });
    doctorProfileId = doctor.id;

    // Create doctor schedule dynamically for tomorrow
    const tomorrow = new Date(Date.now() + 86400000);
    const tomorrowDayOfWeek = tomorrow.getDay();
    await prisma.doctorSchedule.create({
      data: {
        doctorId: doctor.id,
        dayOfWeek: tomorrowDayOfWeek,
        startTime: '08:00',
        endTime: '18:00',
      },
    });

    // 4. Setup Lab test and category catalog
    const category = await prisma.labTestCategory.create({
      data: { name: 'Pathology', description: 'Blood tests' },
    });

    const labTest = await prisma.labTest.create({
      data: {
        name: 'Complete Blood Count',
        code: 'CBC-E2E',
        categoryId: category.id,
        price: 500.00,
        testType: 'BLOOD',
      },
    });
    labTestId = labTest.id;

    await prisma.labReferenceRange.create({
      data: {
        labTestId: labTest.id,
        parameter: 'Hemoglobin',
        rangeMin: 13.5,
        rangeMax: 17.5,
        unit: 'g/dL',
        gender: 'ALL',
      },
    });
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  test('Step 1: Receptionist registers a new patient profile', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        userId: patientUser.id,
        firstName: 'Alice',
        lastName: 'Smith',
        dob: '1995-03-10',
        gender: 'female',
        phone: '8888888000',
        email: patientUser.email,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.firstName).toBe('Alice');
    patientProfileId = res.body.data.id;
  });

  test('Step 2: Patient books a consulting slot with Doctor Watson', async () => {
    // Tomorrow at 10:00
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientUserToken}`)
      .send({
        patientId: patientProfileId,
        doctorId: doctorProfileId,
        date: tomorrowStr,
        time: '10:00',
        duration: 30,
        notes: 'Clinical consultation test',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('REQUESTED');
    appointmentId = res.body.data.id;
  });

  test('Step 3: Receptionist confirms and then checks-in the appointment', async () => {
    // 1. Confirm appointment
    const confirmRes = await request(app)
      .put(`/api/appointments/${appointmentId}/status`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        status: AppointmentStatus.CONFIRMED,
        reason: 'OPD Schedule confirmed',
      });
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('CONFIRMED');

    // 2. Check-in appointment
    const checkinRes = await request(app)
      .put(`/api/appointments/${appointmentId}/status`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        status: AppointmentStatus.CHECKED_IN,
        reason: 'Patient arrived in OPD',
      });

    expect(checkinRes.status).toBe(200);
    expect(checkinRes.body.data.status).toBe('CHECKED_IN');
  });

  test('Step 4: Doctor starts consultation and records EMR details', async () => {
    const res = await request(app)
      .post('/api/emr')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patientId: patientProfileId,
        doctorId: doctorProfileId,
        appointmentId,
        symptoms: 'Dry cough and fatigue',
        observations: 'Congestion observed in chest',
        diagnoses: [
          {
            code: 'J06.9',
            name: 'Acute upper respiratory infection',
            severity: 'ACUTE',
          },
        ],
        vitals: {
          bloodPressure: '120/80',
          heartRate: 75,
          respiratoryRate: 16,
          temperature: 37.8,
          oxygenSaturation: 98,
          height: 165,
          weight: 60,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.version).toBe(1);
    medicalRecordId = res.body.data.id;
  });

  test('Step 4b: Doctor and Patient retrieve the EMR details successfully', async () => {
    // 1. Doctor retrieves record
    const docRes = await request(app)
      .get(`/api/emr/${medicalRecordId}`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(docRes.status).toBe(200);
    expect(docRes.body.data.symptoms).toBe('Dry cough and fatigue');

    // 2. Patient retrieves record
    const patRes = await request(app)
      .get(`/api/emr/${medicalRecordId}`)
      .set('Authorization', `Bearer ${patientUserToken}`);
    expect(patRes.status).toBe(200);
  });

  test('Step 5: Doctor requests a Complete Blood Count lab order', async () => {
    const res = await request(app)
      .post('/api/lab/orders')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patientId: patientProfileId,
        doctorId: doctorProfileId,
        appointmentId,
        labTestId,
        priority: 'NORMAL',
        clinicalNotes: 'Order CBC to verify hemoglobin',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('ORDERED');
    labOrderId = res.body.data.id;
  });

  test('Step 6: Lab Tech signs self, collects sample, and logs pathological results', async () => {
    // 1. Assign Lab Tech
    const assignRes = await request(app)
      .put(`/api/lab/orders/${labOrderId}/assign`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({ technicianId: labTechUser.id });
    expect(assignRes.status).toBe(200);

    // 2. Collect sample
    const sampleRes = await request(app)
      .post(`/api/lab/orders/${labOrderId}/samples`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({ sampleType: 'Whole Blood', storageLocation: 'ED-FRIDGE-1' });
    expect(sampleRes.status).toBe(201);
    sampleId = sampleRes.body.data.id;

    // 3. Mark sample as processing
    const statusRes = await request(app)
      .put(`/api/lab/samples/${sampleId}/status`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({ status: 'PROCESSING' });
    expect(statusRes.status).toBe(200);

    // 4. Enter Results
    const resultsRes = await request(app)
      .post(`/api/lab/orders/${labOrderId}/results`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({
        results: [
          { parameter: 'Hemoglobin', value: '12.2', unit: 'g/dL', notes: 'Mild anemia' },
        ],
      });
    expect(resultsRes.status).toBe(200);
    expect(resultsRes.body.data[0].flag).toBe('LOW'); // 12.2 < 13.5 reference range min

    // 5. Approve & Finalize Report
    const approveRes = await request(app)
      .put(`/api/lab/orders/${labOrderId}/approve`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({ notes: 'Results verified and finalized' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('FINAL');
  });

  test('Step 7: Billing department generates and finalizes invoice', async () => {
    // 1. Create Draft Invoice
    const createRes = await request(app)
      .post('/api/billing/invoices')
      .set('Authorization', `Bearer ${billingToken}`)
      .send({
        patientId: patientProfileId,
        appointmentId,
        items: [
          { description: 'Consultation - OPD General', quantity: 1, unitPrice: 500.00, itemType: 'CONSULTATION' },
          { description: 'Complete Blood Count (CBC)', quantity: 1, unitPrice: 500.00, itemType: 'LAB_TEST' },
        ],
        discountAmount: 100.00,
      });

    expect(createRes.status).toBe(201);
    invoiceId = createRes.body.data.id;
    // Computations check:
    // subtotal = 1000, tax = 180 (18% of 1000), discount = 100, total = 1000 + 180 - 100 = 1080.00
    expect(Number(createRes.body.data.totalAmount)).toBe(1080.00);

    // 2. Finalize Invoice
    const finalizeRes = await request(app)
      .put(`/api/billing/invoices/${invoiceId}/finalize`)
      .set('Authorization', `Bearer ${billingToken}`);

    expect(finalizeRes.status).toBe(200);
    expect(finalizeRes.body.data.status).toBe('FINALIZED');
  });

  test('Step 8: Patient checks outstanding bills and pays invoice in full', async () => {
    // 1. Query Patient Invoices
    const queryRes = await request(app)
      .get(`/api/billing/patients/${patientProfileId}/invoices`)
      .set('Authorization', `Bearer ${patientUserToken}`);

    expect(queryRes.status).toBe(200);
    expect(queryRes.body.data).toHaveLength(1);
    expect(queryRes.body.data[0].id).toBe(invoiceId);
    expect(queryRes.body.data[0].status).toBe('FINALIZED');
    const invoiceTotal = Number(queryRes.body.data[0].totalAmount);

    // 2. Patient pays Invoice
    // Since patient roles are not allowed to directly record payments under recordPayment route restriction,
    // we use the Billing token to record a payment of total amount.
    const payRes = await request(app)
      .post(`/api/billing/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${billingToken}`)
      .send({
        amount: invoiceTotal,
        paymentMethodName: 'UPI',
        transactionRef: 'TXN-E2E-PAY-FINAL',
      });

    expect(payRes.status).toBe(201);
    expect(payRes.body.data.updatedInvoice.status).toBe('PAID');
    expect(Number(payRes.body.data.updatedInvoice.outstandingAmount)).toBe(0);
  });

  test('Step 8b: Admin accesses appointment statistics successfully', async () => {
    const res = await request(app)
      .get('/api/appointments/statistics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalAppointments).toBeDefined();
  });
});
