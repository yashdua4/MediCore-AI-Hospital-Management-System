import prisma from '../config/prisma';
import { EMRService } from '../services/emr.service';
import { DoctorService } from '../services/doctor.service';
import { PatientService } from '../services/patient.service';

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
}

describe('EMRService Unit Tests', () => {
  let actorUserId: string;
  let doctor: any;
  let patient: any;
  let department: any;

  beforeAll(async () => {
    await cleanupDb();

    const actorUser = await prisma.user.create({
      data: {
        email: 'doctor.test@medicore.com',
        passwordHash: 'dummy',
      },
    });
    actorUserId = actorUser.id;

    department = await prisma.doctorDepartment.create({
      data: {
        name: 'Internal Medicine',
      },
    });

    doctor = await DoctorService.createDoctor({
      firstName: 'Watson',
      lastName: 'John',
      email: 'watson@medicore.com',
      phone: '9999999222',
      licenseNumber: 'DOC222',
      consultationFee: 150,
      departmentId: department.id,
    }, actorUserId);

    patient = await PatientService.createPatient({
      firstName: 'Sherlock',
      lastName: 'Holmes',
      dob: new Date('1990-01-01'),
      gender: 'male',
      phone: '8888888222',
    }, actorUserId);
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  test('should successfully create EMR with nested entities and check version 1', async () => {
    const record = await EMRService.createMedicalRecord({
      patientId: patient.id,
      doctorId: doctor.id,
      symptoms: 'Patient reports persistent dry cough and mild fever',
      observations: 'Slight congestion heard in lungs, throat is inflamed',
      followUpInstructions: 'Return in 7 days or if fever exceeds 101F',
      diagnoses: [
        {
          code: 'J06.9',
          name: 'Acute upper respiratory infection, unspecified',
          severity: 'ACUTE',
          notes: 'Standard seasonal infection suspected',
        },
      ],
      treatmentPlans: [
        {
          description: 'Rest, hydration, and over-the-counter antipyretics',
          goals: 'Fever clearance and symptom relief',
          duration: '5 days',
          status: 'ACTIVE',
        },
      ],
      prescriptions: [
        {
          notes: 'Take medicines post meals',
          medicines: [
            {
              medicineName: 'Paracetamol',
              strength: '650 mg',
              frequency: 'TDS',
              duration: '3 days',
              instructions: 'Take as needed for fever',
            },
          ],
        },
      ],
      vitals: {
        bloodPressure: '120/80',
        heartRate: 72,
        respiratoryRate: 16,
        temperature: 37.5,
        oxygenSaturation: 98,
        height: 180,
        weight: 75,
      },
    }, actorUserId);

    expect(record.id).toBeDefined();
    expect(record.version).toBe(1);
    expect(record.diagnoses.length).toBe(1);
    expect(record.treatmentPlans.length).toBe(1);
    expect(record.prescriptions.length).toBe(1);
    expect(record.vitals.length).toBe(1);
    
    // Check BMI calculation
    // BMI = 75 / (1.8 * 1.8) = 75 / 3.24 = 23.15
    expect(Number(record.vitals[0].bmi)).toBeCloseTo(23.15, 1);

    // Verify initial version snapshot exists
    const versions = await EMRService.getVersionLogs(record.id);
    expect(versions.length).toBe(1);
    expect(versions[0].version).toBe(1);
    expect(versions[0].changeReason).toBe('Initial creation');
  });

  test('should successfully update EMR details, increment version, and record new snapshot', async () => {
    const existing = await prisma.medicalRecord.findFirst({
      where: { patientId: patient.id },
    });
    expect(existing).not.toBeNull();

    const updated = await EMRService.updateMedicalRecord(existing!.id, {
      symptoms: 'Patient reports cough resolved but has slight fatigue',
      changeReason: 'Follow-up visit updates',
      diagnoses: [
        {
          code: 'R53.83',
          name: 'Other fatigue',
          severity: 'MILD',
        },
      ],
    }, actorUserId);

    expect(updated.version).toBe(2);
    expect(updated.symptoms).toBe('Patient reports cough resolved but has slight fatigue');
    expect(updated.diagnoses[0].code).toBe('R53.83');

    // Should have 2 versions
    const versions = await EMRService.getVersionLogs(existing!.id);
    expect(versions.length).toBe(2);
    expect(versions[0].version).toBe(2);
    expect(versions[0].changeReason).toBe('Follow-up visit updates');
  });

  test('should trigger sensitive condition security event when accessing records containing HIV/AIDS/Cancer', async () => {
    // Create record with sensitive diagnose keyword
    const sensitiveRecord = await EMRService.createMedicalRecord({
      patientId: patient.id,
      doctorId: doctor.id,
      symptoms: 'Substance abuse and psychological trauma',
      diagnoses: [
        {
          code: 'B20',
          name: 'HIV disease resulting in infectious diseases',
          severity: 'CHRONIC',
        },
      ],
    }, actorUserId);

    // Retrieve EMR record (triggers sensitive check)
    await EMRService.getMedicalRecordById(sensitiveRecord.id, actorUserId);

    // Verify a high severity SecurityEvent is created
    const events = await prisma.securityEvent.findMany({
      where: { eventType: 'SENSITIVE_RECORD_ACCESS', userId: actorUserId },
    });

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].severity).toBe('HIGH');
    expect(events[0].description).toContain('Sensitive EMR');
  });

  test('should restore EMR to previous version and increment active version', async () => {
    const firstRecord = await prisma.medicalRecord.findFirst({
      where: { patientId: patient.id },
    });
    expect(firstRecord).not.toBeNull();
    expect(firstRecord!.version).toBe(2); // Since it was updated in the second test

    // Restore to version 1 (which had dry cough symptoms)
    const restored = await EMRService.restoreVersion(
      firstRecord!.id,
      1,
      'Rollback due to input error',
      actorUserId
    );

    expect(restored.version).toBe(3);
    expect(restored.symptoms).toBe('Patient reports persistent dry cough and mild fever');
    expect(restored.diagnoses[0].code).toBe('J06.9');

    // Confirm next version was logged
    const logs = await EMRService.getVersionLogs(firstRecord!.id);
    expect(logs.length).toBe(3);
    expect(logs[0].version).toBe(3);
    expect(logs[0].changeReason).toBe('Rollback due to input error');
  });

  test('should compile timeline and vital trends correctly', async () => {
    // Record standalone vitals
    await EMRService.addVital(patient.id, {
      bloodPressure: '130/85',
      heartRate: 80,
      respiratoryRate: 18,
      temperature: 36.8,
      oxygenSaturation: 99,
      height: 180,
      weight: 77,
    }, actorUserId);

    const timeline = await EMRService.getPatientTimeline(patient.id, actorUserId);
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline.some((e) => e.type === 'VISIT')).toBe(true);
    expect(timeline.some((e) => e.type === 'VITAL_RECORD')).toBe(true);

    const vitalsResult = await EMRService.getPatientVitals(patient.id);
    expect(vitalsResult.trends).toBeDefined();
    expect(vitalsResult.trends.heartRate.avg).toBeGreaterThan(0);
    expect(vitalsResult.history.length).toBeGreaterThanOrEqual(2);
  });
});
