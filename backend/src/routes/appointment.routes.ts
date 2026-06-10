import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller';
import {
  requireAnyRole,
  requireOwnershipOrRole,
} from '../middlewares/rbac.middleware';
import { RoleType } from '@prisma/client';
import { CustomRequest } from '../types/auth.types';
import prisma from '../config/prisma';

const router = Router();

/**
 * Helper callback to check if the current user is the patient or the doctor of the appointment.
 */
const getAppointmentOwnerOrAssigneeId = async (req: CustomRequest): Promise<string | null> => {
  const { id } = req.params;
  if (!id) return null;

  const appt = await prisma.appointment.findUnique({
    where: { id },
    select: {
      patient: { select: { userId: true } },
      doctor: { select: { userId: true } },
    },
  });

  if (!appt) return null;
  const actorUserId = req.user?.userId;

  if (appt.patient?.userId === actorUserId) {
    return appt.patient.userId;
  }
  if (appt.doctor?.userId === actorUserId) {
    return appt.doctor.userId;
  }
  return null;
};

/**
 * Helper callback to check if the current user is the doctor assignee of the appointment.
 */
const getAppointmentDoctorAssigneeId = async (req: CustomRequest): Promise<string | null> => {
  const { id } = req.params;
  if (!id) return null;

  const appt = await prisma.appointment.findUnique({
    where: { id },
    select: {
      doctor: { select: { userId: true } },
    },
  });

  return appt?.doctor?.userId || null;
};

/**
 * Helper callback to check if the current user is the patient of the appointment.
 */
const getAppointmentPatientId = async (req: CustomRequest): Promise<string | null> => {
  const { id } = req.params;
  if (!id) return null;

  const appt = await prisma.appointment.findUnique({
    where: { id },
    select: {
      patient: { select: { userId: true } },
    },
  });

  return appt?.patient?.userId || null;
};

/**
 * Helper callback to check if the current user is the doctor of the daily schedule.
 */
const getDailyScheduleDoctorOwnerId = async (req: CustomRequest): Promise<string | null> => {
  const { doctorId } = req.params;
  if (!doctorId) return null;

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { userId: true },
  });

  return doctor?.userId || null;
};

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Book a new appointment
 *     description: Admins, Receptionists, and Patient owners can book.
 *     tags: [Appointments]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.RECEPTIONIST, RoleType.PATIENT]),
  AppointmentController.bookAppointment
);

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Retrieve appointments with filters
 *     description: Admins/Staff see all. Patients only see theirs. Doctors only see theirs.
 *     tags: [Appointments]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/',
  requireAnyRole([
    RoleType.SUPER_ADMIN,
    RoleType.HOSPITAL_ADMIN,
    RoleType.RECEPTIONIST,
    RoleType.DOCTOR,
    RoleType.NURSE,
    RoleType.PATIENT,
  ]),
  AppointmentController.getAppointments
);

/**
 * @swagger
 * /api/appointments/statistics:
 *   get:
 *     summary: Retrieve appointment metrics and analytics
 *     description: Only accessible to SUPER_ADMIN or HOSPITAL_ADMIN.
 *     tags: [Appointments]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/statistics',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]),
  AppointmentController.getStatistics
);

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     summary: Retrieve specific appointment details
 *     description: Staff or the patient/doctor linked to the appointment.
 *     tags: [Appointments]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/:id',
  requireOwnershipOrRole(
    [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.RECEPTIONIST, RoleType.NURSE],
    getAppointmentOwnerOrAssigneeId
  ),
  AppointmentController.getAppointmentById
);

/**
 * @swagger
 * /api/appointments/{id}/reschedule:
 *   put:
 *     summary: Reschedule an appointment
 *     description: Admins, Receptionists, or Patient Owner.
 *     tags: [Appointments]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/:id/reschedule',
  requireOwnershipOrRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.RECEPTIONIST], getAppointmentPatientId),
  AppointmentController.rescheduleAppointment
);

/**
 * @swagger
 * /api/appointments/{id}/cancel:
 *   put:
 *     summary: Cancel an appointment
 *     description: Admins, Receptionists, or Patient Owner.
 *     tags: [Appointments]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/:id/cancel',
  requireOwnershipOrRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.RECEPTIONIST], getAppointmentPatientId),
  AppointmentController.cancelAppointment
);

/**
 * @swagger
 * /api/appointments/{id}/status:
 *   put:
 *     summary: Update appointment status (CHECKED_IN, IN_CONSULTATION, etc.)
 *     description: Admins, Receptionists, and Doctors.
 *     tags: [Appointments]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/:id/status',
  requireOwnershipOrRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.RECEPTIONIST], getAppointmentDoctorAssigneeId),
  AppointmentController.updateStatus
);

/**
 * @swagger
 * /api/appointments/{id}/reassign:
 *   put:
 *     summary: Reassign appointment doctor
 *     description: Only SUPER_ADMIN or HOSPITAL_ADMIN can reassign doctors.
 *     tags: [Appointments]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/:id/reassign',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]),
  AppointmentController.reassignDoctor
);

/**
 * @swagger
 * /api/appointments/doctor/{doctorId}/schedule:
 *   get:
 *     summary: View daily working schedule for doctor
 *     description: Staff or the owning doctor.
 *     tags: [Appointments]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/doctor/:doctorId/schedule',
  requireOwnershipOrRole(
    [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.RECEPTIONIST, RoleType.NURSE],
    getDailyScheduleDoctorOwnerId
  ),
  AppointmentController.getDailySchedule
);

/**
 * @swagger
 * /api/appointments/{id}/notes:
 *   post:
 *     summary: Add clinical/reception note to appointment
 *     description: Staff or assigned doctor.
 *     tags: [Appointments]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/:id/notes',
  requireOwnershipOrRole(
    [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.RECEPTIONIST, RoleType.NURSE],
    getAppointmentDoctorAssigneeId
  ),
  AppointmentController.addNote
);

/**
 * @swagger
 * /api/appointments/{id}/attachments:
 *   post:
 *     summary: Upload file attachment to appointment
 *     description: Staff, assigned doctor, or patient owner.
 *     tags: [Appointments]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/:id/attachments',
  requireOwnershipOrRole(
    [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.RECEPTIONIST, RoleType.NURSE],
    getAppointmentOwnerOrAssigneeId
  ),
  AppointmentController.addAttachment
);

export default router;
