import prisma from '../config/prisma';
import { DoctorService } from '../services/doctor.service';

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
}

describe('DoctorService Unit Tests', () => {
  let actorUser: any;
  let department: any;

  beforeAll(async () => {
    await cleanupDb();
    actorUser = await prisma.user.create({
      data: {
        id: 'actor-doctor-test',
        email: 'admin-staff@medicore.com',
        passwordHash: 'dummy',
      },
    });

    department = await prisma.doctorDepartment.create({
      data: {
        name: 'Cardiology',
        description: 'Heart Specialists',
      },
    });
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  test('should create a doctor profile with nested details', async () => {
    const doctor = await DoctorService.createDoctor(
      {
        firstName: 'Marcus',
        lastName: 'Welby',
        phone: '9876543220',
        email: 'marcus.welby@medicore.com',
        licenseNumber: 'DOC12345',
        consultationFee: 150.0,
        departmentId: department.id,
        specializationNames: ['Cardiology', 'Internal Medicine'],
        qualifications: [
          { degree: 'MD', institution: 'Harvard Medical School', year: 2010 },
          { degree: 'FACC', institution: 'American College of Cardiology', year: 2015 },
        ],
        schedules: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
          { dayOfWeek: 1, startTime: '14:00', endTime: '17:00' },
        ],
      },
      actorUser.id
    );

    expect(doctor.id).toBeDefined();
    expect(doctor.firstName).toBe('Marcus');
    expect(doctor.department?.name).toBe('Cardiology');
    expect(doctor.qualifications).toHaveLength(2);
    expect(doctor.specializations).toHaveLength(2);
    expect(doctor.schedules).toHaveLength(2);

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'DOCTOR_CREATE' },
    });
    expect(audit).toBeDefined();
  });

  test('should fail to create duplicate phone, email, or license number', async () => {
    // Duplicate Phone
    await expect(
      DoctorService.createDoctor({
        firstName: 'Duplicate',
        lastName: 'Phone',
        phone: '9876543220',
        email: 'other@medicore.com',
        licenseNumber: 'DOC00001',
        consultationFee: 100,
        departmentId: department.id,
      })
    ).rejects.toThrow('already exists');

    // Duplicate Email
    await expect(
      DoctorService.createDoctor({
        firstName: 'Duplicate',
        lastName: 'Email',
        phone: '9876543221',
        email: 'marcus.welby@medicore.com',
        licenseNumber: 'DOC00002',
        consultationFee: 100,
        departmentId: department.id,
      })
    ).rejects.toThrow('already exists');

    // Duplicate License
    await expect(
      DoctorService.createDoctor({
        firstName: 'Duplicate',
        lastName: 'License',
        phone: '9876543222',
        email: 'another@medicore.com',
        licenseNumber: 'DOC12345',
        consultationFee: 100,
        departmentId: department.id,
      })
    ).rejects.toThrow('already exists');
  });

  test('should fail to create doctor with overlapping schedule blocks', async () => {
    await expect(
      DoctorService.createDoctor({
        firstName: 'Overlap',
        lastName: 'Doctor',
        phone: '9876543229',
        email: 'overlap@medicore.com',
        licenseNumber: 'DOC99999',
        consultationFee: 100,
        departmentId: department.id,
        schedules: [
          { dayOfWeek: 2, startTime: '09:00', endTime: '12:00' },
          { dayOfWeek: 2, startTime: '11:00', endTime: '14:00' }, // Overlaps
        ],
      })
    ).rejects.toThrow('Overlapping schedules');
  });

  test('should update doctor profile and replace qualifications/specializations', async () => {
    const doc = await prisma.doctor.findFirst({ where: { phone: '9876543220' } });
    expect(doc).not.toBeNull();

    const updated = await DoctorService.updateDoctor(
      doc!.id,
      {
        firstName: 'Marcus Updated',
        consultationFee: 200.0,
        qualifications: [
          { degree: 'PhD', institution: 'Johns Hopkins', year: 2018 },
        ],
      },
      actorUser.id
    );

    expect(updated.firstName).toBe('Marcus Updated');
    // Note: ConsultationFee might be dynamic Decimal object, convert to string/number if checking
    expect(Number(updated.consultationFee)).toBe(200.0);
    expect(updated.qualifications).toHaveLength(1);
    expect(updated.qualifications![0].degree).toBe('PhD');
  });

  test('should retrieve doctor by ID and log data access compliance', async () => {
    const doc = await prisma.doctor.findFirst({ where: { phone: '9876543220' } });
    expect(doc).not.toBeNull();

    const result = await DoctorService.getDoctorById(doc!.id, actorUser.id, '127.0.0.1', 'chrome');
    expect(result.id).toBe(doc!.id);

    const dataAccess = await prisma.dataAccessLog.findFirst({
      where: { userId: actorUser.id, resourceId: doc!.id },
    });
    expect(dataAccess).toBeDefined();
    expect(dataAccess?.resource).toBe('doctor');
  });

  test('should query doctors with search terms', async () => {
    const result = await DoctorService.queryDoctors({ search: 'Marcus' });
    expect(result.doctors.length).toBeGreaterThanOrEqual(1);
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  test('should add leaves and check leave overlap validations', async () => {
    const doc = await prisma.doctor.findFirst({ where: { phone: '9876543220' } });
    expect(doc).not.toBeNull();

    // Add normal leave
    const leave = await DoctorService.addLeave(
      doc!.id,
      {
        date: '2026-07-04',
        startTime: '10:00',
        endTime: '12:00',
        reason: 'Dentist appointment',
      },
      actorUser.id
    );

    expect(leave.id).toBeDefined();

    // Fail if adding overlapping leave on same day/time
    await expect(
      DoctorService.addLeave(
        doc!.id,
        {
          date: '2026-07-04',
          startTime: '11:00',
          endTime: '13:00',
          reason: 'Duplicate check',
        },
        actorUser.id
      )
    ).rejects.toThrow('overlaps');
  });

  test('should fetch correct doctor availability for date including leaves', async () => {
    const doc = await prisma.doctor.findFirst({ where: { phone: '9876543220' } });
    expect(doc).not.toBeNull();

    // 2026-07-04 is Saturday (6). Doctor schedules in beforeAll were dayOfWeek: 1 (Monday).
    // Let's add schedule for Saturday (6) or Monday (2026-07-06 is Monday) to verify leaves.
    // Let's check availability on Monday, July 6, 2026
    const resNoLeaves = await DoctorService.getDoctorAvailability(doc!.id, '2026-07-06');
    expect(resNoLeaves.workingHours.length).toBe(2); // schedules 09:00-13:00 and 14:00-17:00
    expect(resNoLeaves.leaves.length).toBe(0);

    // Let's add a full day leave on Monday, July 6, 2026
    await DoctorService.addLeave(
      doc!.id,
      {
        date: '2026-07-06',
        reason: 'Family event',
      },
      actorUser.id
    );

    const resWithLeaves = await DoctorService.getDoctorAvailability(doc!.id, '2026-07-06');
    expect(resWithLeaves.workingHours.length).toBe(0); // full day leave blocks schedules
    expect(resWithLeaves.leaves.length).toBe(1);
    expect(resWithLeaves.leaves[0].reason).toBe('Family event');
  });

  test('should calculate statistics and hours correctly', async () => {
    const doc = await prisma.doctor.findFirst({ where: { phone: '9876543220' } });
    expect(doc).not.toBeNull();

    // Get statistics
    const stats = await DoctorService.getDoctorStatistics(doc!.id, actorUser.id);
    expect(stats.totalAppointments).toBe(0);
    // Weekly hours: 09:00-13:00 (4 hours) + 14:00-17:00 (3 hours) = 7 hours
    expect(stats.weeklyScheduleHours).toBe(7.0);
  });

  test('should soft delete and exclude from queries', async () => {
    const doc = await prisma.doctor.findFirst({ where: { phone: '9876543220' } });
    expect(doc).not.toBeNull();

    // Soft delete
    await DoctorService.softDeleteDoctor(doc!.id, actorUser.id);

    // Block direct fetch
    await expect(DoctorService.getDoctorById(doc!.id)).rejects.toThrow('not found');

    // Excluded from query
    const result = await DoctorService.queryDoctors({ search: 'Marcus' });
    expect(result.doctors.length).toBe(0);
  });
});
