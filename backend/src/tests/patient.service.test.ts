import prisma from '../config/prisma';
import { PatientService } from '../services/patient.service';

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
}

describe('PatientService Unit Tests', () => {
  let actorUser: any;

  beforeAll(async () => {
    await cleanupDb();
    actorUser = await prisma.user.create({
      data: {
        id: 'actor-user-id-test',
        email: 'staff@medicore.com',
        passwordHash: 'dummy',
      },
    });
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  test('should create a patient profile with nested address and contacts', async () => {
    const patient = await PatientService.createPatient(
      {
        firstName: 'John',
        lastName: 'Doe',
        dob: new Date('1990-05-15'),
        gender: 'male',
        bloodGroup: 'O+',
        email: 'john.doe@gmail.com',
        phone: '9876543210',
        aadhaar: '123456789012',
        address: {
          streetAddress: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
        },
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'Spouse',
          phone: '9876543211',
        },
      },
      actorUser.id
    );

    expect(patient.id).toBeDefined();
    expect(patient.firstName).toBe('John');
    expect(patient.address?.city).toBe('Mumbai');
    expect(patient.emergencyContact?.name).toBe('Jane Doe');

    // Verify audit logs were written
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'PATIENT_UPDATE' },
    });
    expect(audit).toBeDefined();
    expect(audit?.details).toContain('Created patient profile');
  });

  test('should fail to create duplicate phone, email, or Aadhaar', async () => {
    // Duplicate Phone
    await expect(
      PatientService.createPatient({
        firstName: 'Duplicate',
        lastName: 'Phone',
        dob: new Date('1985-01-01'),
        gender: 'male',
        phone: '9876543210', // duplicate phone
      })
    ).rejects.toThrow('already exists');

    // Duplicate Email
    await expect(
      PatientService.createPatient({
        firstName: 'Duplicate',
        lastName: 'Email',
        dob: new Date('1985-01-01'),
        gender: 'male',
        email: 'john.doe@gmail.com', // duplicate email
        phone: '9876543219',
      })
    ).rejects.toThrow('already exists');

    // Duplicate Aadhaar
    await expect(
      PatientService.createPatient({
        firstName: 'Duplicate',
        lastName: 'Aadhaar',
        dob: new Date('1985-01-01'),
        gender: 'male',
        phone: '9876543218',
        aadhaar: '123456789012', // duplicate Aadhaar
      })
    ).rejects.toThrow('already exists');
  });

  test('should retrieve patient by ID and write DataAccessLog', async () => {
    const patient = await prisma.patient.findFirst({ where: { phone: '9876543210' } });
    expect(patient).not.toBeNull();

    const result = await PatientService.getPatientById(patient!.id, actorUser.id, '127.0.0.1', 'firefox');
    expect(result.id).toBe(patient!.id);

    // Verify data access log was written
    const accessLog = await prisma.dataAccessLog.findFirst({
      where: { userId: actorUser.id, resourceId: patient!.id },
    });
    expect(accessLog).toBeDefined();
    expect(accessLog?.resource).toBe('EMR');
    expect(accessLog?.action).toBe('READ');
  });

  test('should soft delete and exclude from queries', async () => {
    const tempPatient = await PatientService.createPatient({
      firstName: 'Temp',
      lastName: 'User',
      dob: new Date('2000-01-01'),
      gender: 'other',
      phone: '9999999999',
    });

    // Verify is in search
    let list = await PatientService.queryPatients({ search: 'Temp' });
    expect(list.patients).toHaveLength(1);

    // Soft delete
    await PatientService.softDeletePatient(tempPatient.id, actorUser.id);

    // Excluded from query list
    list = await PatientService.queryPatients({ search: 'Temp' });
    expect(list.patients).toHaveLength(0);

    // Blocked direct fetch
    await expect(PatientService.getPatientById(tempPatient.id)).rejects.toThrow('not found');
  });

  test('should write and fetch medical history and log audits', async () => {
    const patient = await prisma.patient.findFirst({ where: { phone: '9876543210' } });
    expect(patient).not.toBeNull();

    const entry = await PatientService.addMedicalHistoryEntry(
      patient!.id,
      {
        condition: 'Hypertension',
        diagnosedDate: new Date('2025-01-01'),
        notes: 'Take Amlodipine 5mg daily',
        allergies: ['Penicillin'],
        chronicConditions: ['High Blood Pressure'],
      },
      actorUser.id
    );

    expect(entry.condition).toBe('Hypertension');
    expect(entry.allergies).toContain('Penicillin');

    const history = await PatientService.getMedicalHistory(patient!.id, actorUser.id);
    expect(history).toHaveLength(1);
    expect(history[0].condition).toBe('Hypertension');

    // Check EMR access log
    const dataAccess = await prisma.dataAccessLog.findFirst({
      where: { userId: actorUser.id, action: 'READ', resourceId: patient!.id },
    });
    expect(dataAccess).toBeDefined();
  });
});
