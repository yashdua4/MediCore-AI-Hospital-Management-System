import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';
import { RoleType, AppointmentStatus } from '@prisma/client';

async function seed() {
  console.log('Seeding Demo Hospital Environment...');

  // 1. Clean Database (in dependency order)
  console.log('Cleaning existing records...');
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

  // 2. Setup Roles
  console.log('Creating system roles...');
  const roleMap = new Map<RoleType, any>();
  for (const roleName of Object.values(RoleType)) {
    const role = await prisma.role.create({
      data: {
        name: roleName,
        description: `Access role for ${roleName}`,
      },
    });
    roleMap.set(roleName, role);
  }

  // 3. Create Users
  console.log('Creating demo users...');
  const passwordHash = await bcrypt.hash('DemoPassword123', 10);

  const usersData = [
    { email: 'admin@medicore.com', role: RoleType.SUPER_ADMIN },
    { email: 'doctor@medicore.com', role: RoleType.DOCTOR },
    { email: 'nurse@medicore.com', role: RoleType.NURSE },
    { email: 'patient@medicore.com', role: RoleType.PATIENT },
    { email: 'labtech@medicore.com', role: RoleType.LAB_TECH },
    { email: 'billing@medicore.com', role: RoleType.BILLING_EXEC },
    { email: 'receptionist@medicore.com', role: RoleType.RECEPTIONIST },
    { email: 'emergency@medicore.com', role: RoleType.EMERGENCY_DOCTOR },
  ];

  const userMap = new Map<RoleType, any>();
  for (const item of usersData) {
    const user = await prisma.user.create({
      data: {
        email: item.email,
        passwordHash,
      },
    });
    const role = roleMap.get(item.role);
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    });
    userMap.set(item.role, user);
  }

  // 4. Create Department & Doctor Profile
  console.log('Creating doctor clinical profile...');
  const dept = await prisma.doctorDepartment.create({
    data: { name: 'General Medicine' },
  });

  const doctorUser = userMap.get(RoleType.DOCTOR);
  const doctor = await prisma.doctor.create({
    data: {
      userId: doctorUser.id,
      firstName: 'John',
      lastName: 'Watson',
      email: doctorUser.email,
      phone: '9876543210',
      licenseNumber: 'LIC_DOC_99182',
      consultationFee: 800.00,
      departmentId: dept.id,
    },
  });

  // 5. Create Patient Profile
  console.log('Creating patient registration profile...');
  const patientUser = userMap.get(RoleType.PATIENT);
  const patient = await prisma.patient.create({
    data: {
      userId: patientUser.id,
      firstName: 'John',
      lastName: 'Doe',
      dob: new Date('1990-05-15'),
      gender: 'MALE',
      phone: '9998887776',
      email: patientUser.email,
      bloodGroup: 'O_POSITIVE',
    },
  });

  await prisma.patientAddress.create({
    data: {
      patientId: patient.id,
      streetAddress: 'Baker Street 221B',
      city: 'London',
      state: 'Middlesex',
      postalCode: 'NW1 6XE',
      country: 'United Kingdom',
    },
  });

  await prisma.emergencyContact.create({
    data: {
      patientId: patient.id,
      name: 'Mary Morstan',
      relationship: 'SPOUSE',
      phone: '9991112223',
    },
  });

  // 6. Create Lab Test Catalog
  console.log('Creating lab test categories and tests...');
  const labCat = await prisma.labTestCategory.create({
    data: { name: 'Hematology', description: 'Blood cell assays' },
  });

  const labTest = await prisma.labTest.create({
    data: {
      name: 'Complete Blood Count (CBC)',
      code: 'CBC',
      categoryId: labCat.id,
      price: 450.00,
      testType: 'BLOOD',
    },
  });

  await prisma.labReferenceRange.create({
    data: {
      labTestId: labTest.id,
      parameter: 'Hemoglobin',
      rangeMin: 13.5,
      rangeMax: 17.5,
      unit: 'g/dL',
      gender: 'MALE',
    },
  });

  // 7. Seed Vitals, Conditions, and Allergies
  console.log('Logging vitals, conditions, and allergies...');
  const nurseUser = userMap.get(RoleType.NURSE);
  await prisma.patientVital.create({
    data: {
      patientId: patient.id,
      bloodPressure: '120/80',
      heartRate: 72,
      respiratoryRate: 16,
      temperature: 36.6,
      oxygenSaturation: 99,
      height: 180,
      weight: 75,
      bmi: 23.1,
      recordedById: nurseUser.id,
    },
  });

  await prisma.patientCondition.create({
    data: {
      patientId: patient.id,
      name: 'Hypertension',
      status: 'ACTIVE',
      severity: 'MILD',
      diagnosedAt: new Date(),
    },
  });

  await prisma.patientAllergy.create({
    data: {
      patientId: patient.id,
      allergen: 'Penicillin',
      reaction: 'Skin rash',
      severity: 'MEDIUM',
    },
  });

  // 8. Create Appointment
  console.log('Scheduling consult appointment...');
  const appt = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      date: new Date(Date.now() + 86400000), // tomorrow
      time: '10:00',
      duration: 30,
      status: AppointmentStatus.CONFIRMED,
      notes: 'General checkup',
    },
  });

  // 9. Create Invoice
  console.log('Generating billing statements...');
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-DEMO-001',
      patientId: patient.id,
      appointmentId: appt.id,
      status: 'FINALIZED',
      subTotal: 800.00,
      taxAmount: 144.00,
      discountAmount: 0.00,
      totalAmount: 944.00,
      outstandingAmount: 944.00,
    },
  });

  await prisma.invoiceItem.create({
    data: {
      invoiceId: invoice.id,
      description: 'Consultation Fee - General Medicine',
      quantity: 1,
      unitPrice: 800.00,
      totalPrice: 800.00,
      itemType: 'CONSULTATION',
    },
  });

  // 10. Seed emergency department demo case
  console.log('Creating emergency department demo case...');
  const emergencyUser = userMap.get(RoleType.EMERGENCY_DOCTOR);
  const erDept = await prisma.doctorDepartment.create({
    data: { name: 'Emergency Medicine' },
  });
  const emergencyDoctor = await prisma.doctor.create({
    data: {
      userId: emergencyUser.id,
      firstName: 'Fiona',
      lastName: 'Gallagher',
      email: emergencyUser.email,
      phone: '9876501234',
      licenseNumber: 'LIC_ER_DEMO_001',
      consultationFee: 900.00,
      departmentId: erDept.id,
    },
  });

  const emergencyCase = await prisma.emergencyCase.create({
    data: {
      caseNumber: 'ER-DEMO-001',
      patientId: patient.id,
      status: 'TRIAGED',
      arrivalMode: 'AMBULANCE',
      chiefComplaint: 'Chest pain and shortness of breath',
      triageLevel: 'LEVEL_2_EMERGENCY',
    },
  });

  await prisma.triageAssessment.create({
    data: {
      emergencyCaseId: emergencyCase.id,
      triageLevel: 'LEVEL_2_EMERGENCY',
      chiefComplaint: 'Chest pain and shortness of breath',
      symptoms: 'Diaphoresis, mild dyspnea',
      systolicBP: 138,
      diastolicBP: 88,
      heartRate: 102,
      temperature: 37.1,
      respiratoryRate: 22,
      oxygenSaturation: 94,
      triageNotes: 'ECG and troponin ordered',
      triageNurseId: nurseUser.id,
    },
  });

  await prisma.emergencyDoctorAssignment.create({
    data: {
      emergencyCaseId: emergencyCase.id,
      doctorId: emergencyDoctor.id,
      role: 'PRIMARY_ED_PHYSICIAN',
      status: 'ACCEPTED',
      acceptedAt: new Date(),
    },
  });

  console.log('Seeding Demo Hospital completed successfully!');
  console.log('');
  console.log('Demo accounts (password: DemoPassword123):');
  console.log('  Admin:        admin@medicore.com');
  console.log('  Doctor:       doctor@medicore.com');
  console.log('  Nurse:        nurse@medicore.com');
  console.log('  Patient:      patient@medicore.com');
  console.log('  Lab Tech:     labtech@medicore.com');
  console.log('  Billing:      billing@medicore.com');
  console.log('  Receptionist: receptionist@medicore.com');
  console.log('  Emergency:    emergency@medicore.com');
}

seed()
  .catch((e) => {
    console.error('Error seeding demo database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
