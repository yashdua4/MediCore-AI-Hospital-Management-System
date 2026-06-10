import prisma from '../config/prisma';
import { AppointmentService } from '../services/appointment.service';
import { DoctorService } from '../services/doctor.service';
import { PatientService } from '../services/patient.service';
import { AppointmentStatus } from '@prisma/client';

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
}

describe('AppointmentService Unit Tests', () => {
  let actorUserId: string;
  let doctor: any;
  let doctor2: any;
  let patient: any;
  let department: any;

  beforeAll(async () => {
    await cleanupDb();

    // Create staff user
    const staff = await prisma.user.create({
      data: {
        email: 'staff.appt@medicore.com',
        passwordHash: 'hash',
      },
    });
    actorUserId = staff.id;

    // Create department
    department = await prisma.doctorDepartment.create({
      data: {
        name: 'Pediatrics',
        description: 'Kids doctor',
      },
    });

    // Create Doctor 1 (Scheduled Monday 09:00 - 17:00)
    doctor = await DoctorService.createDoctor({
      firstName: 'Dr. John',
      lastName: 'Watson',
      phone: '9999999111',
      email: 'watson@medicore.com',
      licenseNumber: 'DOC111',
      consultationFee: 100,
      departmentId: department.id,
      schedules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
    });

    // Create Doctor 2 (Scheduled Monday 09:00 - 17:00)
    doctor2 = await DoctorService.createDoctor({
      firstName: 'Dr. Sherlock',
      lastName: 'Holmes',
      phone: '9999999112',
      email: 'holmes@medicore.com',
      licenseNumber: 'DOC112',
      consultationFee: 120,
      departmentId: department.id,
      schedules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
    });

    // Create Patient
    patient = await PatientService.createPatient({
      firstName: 'Sherlock',
      lastName: 'Holmes',
      dob: new Date('1990-01-01'),
      gender: 'male',
      phone: '8888888111',
    });
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  test('should successfully book a valid appointment', async () => {
    // July 6, 2026 is a Monday (1)
    const appt = await AppointmentService.bookAppointment(
      {
        patientId: patient.id,
        doctorId: doctor.id,
        date: '2026-07-06',
        time: '10:00',
        duration: 30,
        notes: 'Checkup',
      },
      actorUserId
    );

    expect(appt.id).toBeDefined();
    expect(appt.status).toBe(AppointmentStatus.REQUESTED);
    expect(appt.duration).toBe(30);

    // Verify status history was created
    const history = await prisma.appointmentStatusHistory.findFirst({
      where: { appointmentId: appt.id },
    });
    expect(history).not.toBeNull();
    expect(history?.status).toBe(AppointmentStatus.REQUESTED);
  });

  test('should block booking in the past', async () => {
    await expect(
      AppointmentService.bookAppointment(
        {
          patientId: patient.id,
          doctorId: doctor.id,
          date: '2020-01-01',
          time: '10:00',
        },
        actorUserId
      )
    ).rejects.toThrow('in the past');
  });

  test('should block booking outside hospital operating hours', async () => {
    await expect(
      AppointmentService.bookAppointment(
        {
          patientId: patient.id,
          doctorId: doctor.id,
          date: '2026-07-06',
          time: '21:00', // hospital closes at 20:00
        },
        actorUserId
      )
    ).rejects.toThrow('operating hours');
  });

  test('should block booking outside doctor weekly schedule', async () => {
    // July 5, 2026 is Sunday (0). Doctor is only working Monday.
    await expect(
      AppointmentService.bookAppointment(
        {
          patientId: patient.id,
          doctorId: doctor.id,
          date: '2026-07-05',
          time: '10:00',
        },
        actorUserId
      )
    ).rejects.toThrow('not scheduled to work');
  });

  test('should block double booking (overlapping appointments)', async () => {
    // There is an appt from 10:00-10:30 booked in the first test.
    // Try to book 10:15-10:45 (overlaps)
    await expect(
      AppointmentService.bookAppointment(
        {
          patientId: patient.id,
          doctorId: doctor.id,
          date: '2026-07-06',
          time: '10:15',
          duration: 30,
        },
        actorUserId
      )
    ).rejects.toThrow('overlapping');
  });

  test('should block booking during doctor leave/unavailability', async () => {
    // Add leave on July 6, 2026 from 14:00 to 16:00
    await DoctorService.addLeave(
      doctor.id,
      {
        date: '2026-07-06',
        startTime: '14:00',
        endTime: '16:00',
        reason: 'Personal',
      },
      actorUserId
    );

    // Book at 14:30 (should fail)
    await expect(
      AppointmentService.bookAppointment(
        {
          patientId: patient.id,
          doctorId: doctor.id,
          date: '2026-07-06',
          time: '14:30',
          duration: 30,
        },
        actorUserId
      )
    ).rejects.toThrow('unavailable');
  });

  test('should successfully reschedule appointment within valid slot', async () => {
    const existing = await prisma.appointment.findFirst({
      where: { doctorId: doctor.id, status: AppointmentStatus.REQUESTED },
    });
    expect(existing).not.toBeNull();

    const rescheduled = await AppointmentService.rescheduleAppointment(
      existing!.id,
      {
        date: '2026-07-06',
        time: '11:00',
        duration: 30,
        reason: 'Rescheduled by patient request',
      },
      actorUserId
    );

    expect(rescheduled.status).toBe(AppointmentStatus.RESCHEDULED);
    expect(rescheduled.time).toBe('11:00');
  });

  test('should enforce logical status transition rules', async () => {
    const appt = await prisma.appointment.findFirst({
      where: { doctorId: doctor.id },
    });
    expect(appt).not.toBeNull();

    // Current state is RESCHEDULED. Let's confirm it first.
    const confirmed = await AppointmentService.updateAppointmentStatus(
      appt!.id,
      { status: AppointmentStatus.CONFIRMED },
      actorUserId
    );
    expect(confirmed.status).toBe(AppointmentStatus.CONFIRMED);

    // CONFIRMED -> COMPLETED (Invalid, must check in first)
    await expect(
      AppointmentService.updateAppointmentStatus(
        appt!.id,
        { status: AppointmentStatus.COMPLETED },
        actorUserId
      )
    ).rejects.toThrow('Invalid status transition');

    // CONFIRMED -> CHECKED_IN (Valid)
    const checkedIn = await AppointmentService.updateAppointmentStatus(
      appt!.id,
      { status: AppointmentStatus.CHECKED_IN },
      actorUserId
    );
    expect(checkedIn.status).toBe(AppointmentStatus.CHECKED_IN);
  });

  test('should reassign doctor and validate new doctor schedule', async () => {
    const appt = await prisma.appointment.findFirst({
      where: { doctorId: doctor.id },
    });
    expect(appt).not.toBeNull();

    // Reassign from Doctor 1 to Doctor 2 (Doctor 2 works Monday too)
    const reassigned = await AppointmentService.reassignDoctor(
      appt!.id,
      doctor2.id,
      actorUserId
    );

    expect(reassigned.doctorId).toBe(doctor2.id);
  });
});
