import { Router } from 'express';
import { DoctorController } from '../controllers/doctor.controller';
import {
  requireAnyRole,
  requireOwnershipOrRole,
} from '../middlewares/rbac.middleware';
import { RoleType } from '@prisma/client';
import { CustomRequest } from '../types/auth.types';
import prisma from '../config/prisma';

const router = Router();

/**
 * Helper callback to find the owner (User ID) of a doctor profile.
 */
const getDoctorOwnerId = async (req: CustomRequest): Promise<string | null> => {
  const doctorId = req.params.id;
  if (!doctorId) return null;

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { userId: true },
  });

  return doctor?.userId || null;
};

/**
 * Helper callback to find the owner of a leave record.
 */
const getLeaveOwnerId = async (req: CustomRequest): Promise<string | null> => {
  const leaveId = req.params.leaveId;
  if (!leaveId) return null;

  const leave = await prisma.doctorAvailability.findUnique({
    where: { id: leaveId },
    select: {
      doctor: {
        select: { userId: true },
      },
    },
  });

  return leave?.doctor?.userId || null;
};

/**
 * @swagger
 * /api/doctors:
 *   post:
 *     summary: Create a new doctor profile
 *     description: Only SUPER_ADMIN or HOSPITAL_ADMIN can register a new doctor profile.
 *     tags: [Doctors]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]),
  DoctorController.createDoctor
);

/**
 * @swagger
 * /api/doctors:
 *   get:
 *     summary: Retrieve doctor list with filters
 *     description: Query doctors. Accessible to all roles.
 *     tags: [Doctors]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/',
  requireAnyRole([
    RoleType.SUPER_ADMIN,
    RoleType.HOSPITAL_ADMIN,
    RoleType.DOCTOR,
    RoleType.NURSE,
    RoleType.RECEPTIONIST,
    RoleType.PATIENT,
  ]),
  DoctorController.searchDoctors
);

/**
 * @swagger
 * /api/doctors/{id}:
 *   get:
 *     summary: View specific doctor profile
 *     description: Accessible to all roles.
 *     tags: [Doctors]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/:id',
  requireAnyRole([
    RoleType.SUPER_ADMIN,
    RoleType.HOSPITAL_ADMIN,
    RoleType.DOCTOR,
    RoleType.NURSE,
    RoleType.RECEPTIONIST,
    RoleType.PATIENT,
  ]),
  DoctorController.getDoctorProfile
);

/**
 * @swagger
 * /api/doctors/{id}:
 *   put:
 *     summary: Update doctor profile
 *     description: Accessible to administrators or the doctor who owns the profile.
 *     tags: [Doctors]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/:id',
  requireOwnershipOrRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN], getDoctorOwnerId),
  DoctorController.updateDoctor
);

/**
 * @swagger
 * /api/doctors/{id}:
 *   delete:
 *     summary: Soft delete doctor profile
 *     description: Only SUPER_ADMIN or HOSPITAL_ADMIN can soft delete a doctor profile.
 *     tags: [Doctors]
 *     security:
 *       - BearerAuth: []
 */
router.delete(
  '/:id',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]),
  DoctorController.softDeleteDoctor
);

/**
 * @swagger
 * /api/doctors/{id}/schedules:
 *   post:
 *     summary: Update doctor weekly recurring schedules
 *     description: Accessible to administrators or the owning doctor.
 *     tags: [Doctors]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/:id/schedules',
  requireOwnershipOrRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN], getDoctorOwnerId),
  DoctorController.manageSchedules
);

/**
 * @swagger
 * /api/doctors/{id}/leaves:
 *   post:
 *     summary: Record doctor leave / unavailability
 *     description: Accessible to administrators or the owning doctor.
 *     tags: [Doctors]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/:id/leaves',
  requireOwnershipOrRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN], getDoctorOwnerId),
  DoctorController.addLeave
);

/**
 * @swagger
 * /api/doctors/leaves/{leaveId}:
 *   delete:
 *     summary: Remove doctor leave / unavailability record
 *     description: Accessible to administrators or the owning doctor.
 *     tags: [Doctors]
 *     security:
 *       - BearerAuth: []
 */
router.delete(
  '/leaves/:leaveId',
  requireOwnershipOrRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN], getLeaveOwnerId),
  DoctorController.removeLeave
);

/**
 * @swagger
 * /api/doctors/{id}/availability:
 *   get:
 *     summary: Retrieve availability working hours and leaves for a specific date
 *     description: Accessible to all roles.
 *     tags: [Doctors]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/:id/availability',
  requireAnyRole([
    RoleType.SUPER_ADMIN,
    RoleType.HOSPITAL_ADMIN,
    RoleType.DOCTOR,
    RoleType.NURSE,
    RoleType.RECEPTIONIST,
    RoleType.PATIENT,
  ]),
  DoctorController.getDoctorAvailability
);

/**
 * @swagger
 * /api/doctors/{id}/statistics:
 *   get:
 *     summary: Retrieve doctor clinical and schedule statistics
 *     description: Accessible to administrators or the owning doctor.
 *     tags: [Doctors]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/:id/statistics',
  requireOwnershipOrRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN], getDoctorOwnerId),
  DoctorController.getDoctorStatistics
);

export default router;
