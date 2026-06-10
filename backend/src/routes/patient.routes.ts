import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller';
import {
  requireAnyRole,
  requireOwnershipOrRole,
} from '../middlewares/rbac.middleware';
import { RoleType } from '@prisma/client';
import { CustomRequest } from '../types/auth.types';
import prisma from '../config/prisma';

const router = Router();

/**
 * Helper callback to find the owner (User ID) of a patient profile.
 */
const getPatientOwnerId = async (req: CustomRequest): Promise<string | null> => {
  const patientId = req.params.id;
  if (!patientId) return null;
  
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { userId: true },
  });
  
  return patient?.userId || null;
};

/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Create a new patient profile
 *     description: Only SUPER_ADMIN, HOSPITAL_ADMIN, RECEPTIONIST, or DOCTOR can register a new patient.
 *     tags: [Patients]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/',
  requireAnyRole([
    RoleType.SUPER_ADMIN,
    RoleType.HOSPITAL_ADMIN,
    RoleType.RECEPTIONIST,
    RoleType.DOCTOR,
  ]),
  PatientController.createPatient
);

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Retrieve patient list with filters
 *     description: Query patients. Accessible to SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, NURSE, and RECEPTIONIST.
 *     tags: [Patients]
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
  ]),
  PatientController.searchPatients
);

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     summary: View specific patient profile
 *     description: Access granted to clinical staff, administrators, or the patient themselves.
 *     tags: [Patients]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/:id',
  requireOwnershipOrRole(
    [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR, RoleType.NURSE, RoleType.RECEPTIONIST],
    getPatientOwnerId
  ),
  PatientController.getPatientProfile
);

/**
 * @swagger
 * /api/patients/{id}:
 *   put:
 *     summary: Update patient profile
 *     description: Accessible to administrative/clinical staff or the patient who owns the profile.
 *     tags: [Patients]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/:id',
  requireOwnershipOrRole(
    [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.RECEPTIONIST, RoleType.DOCTOR],
    getPatientOwnerId
  ),
  PatientController.updatePatient
);

/**
 * @swagger
 * /api/patients/{id}:
 *   delete:
 *     summary: Soft delete patient profile
 *     description: Accessible to SUPER_ADMIN or HOSPITAL_ADMIN or RECEPTIONIST.
 *     tags: [Patients]
 *     security:
 *       - BearerAuth: []
 */
router.delete(
  '/:id',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.RECEPTIONIST]),
  PatientController.softDeletePatient
);

/**
 * @swagger
 * /api/patients/{id}/medical-history:
 *   get:
 *     summary: Retrieve patient medical history (EMR)
 *     description: Access granted to DOCTOR, NURSE, SUPER_ADMIN, HOSPITAL_ADMIN, or the owning PATIENT.
 *     tags: [Patients]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/:id/medical-history',
  requireOwnershipOrRole(
    [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR, RoleType.NURSE],
    getPatientOwnerId
  ),
  PatientController.getMedicalHistory
);

/**
 * @swagger
 * /api/patients/{id}/medical-history:
 *   post:
 *     summary: Add an entry to patient medical history
 *     description: Access restricted to DOCTOR, SUPER_ADMIN, or HOSPITAL_ADMIN.
 *     tags: [Patients]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/:id/medical-history',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR]),
  PatientController.addMedicalHistoryEntry
);

/**
 * @swagger
 * /api/patients/{id}/timeline:
 *   get:
 *     summary: Retrieve patient timeline of events
 *     description: Access granted to DOCTOR, NURSE, SUPER_ADMIN, HOSPITAL_ADMIN, or the owning PATIENT.
 *     tags: [Patients]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/:id/timeline',
  requireOwnershipOrRole(
    [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR, RoleType.NURSE],
    getPatientOwnerId
  ),
  PatientController.getPatientTimeline
);

export default router;
