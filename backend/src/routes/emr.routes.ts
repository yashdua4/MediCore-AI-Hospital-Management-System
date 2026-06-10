import { Router } from 'express';
import { EMRController } from '../controllers/emr.controller';
import {
  requireAnyRole,
  requireOwnershipOrRole,
} from '../middlewares/rbac.middleware';
import { RoleType } from '@prisma/client';
import { CustomRequest } from '../types/auth.types';
import prisma from '../config/prisma';

const router = Router();

/**
 * Helper callback to check if the current user is the patient or the doctor of the EMR record.
 */
const getEMROwnerOrAssigneeId = async (req: CustomRequest): Promise<string | null> => {
  const { id } = req.params;
  if (!id) return null;

  const record = await prisma.medicalRecord.findUnique({
    where: { id },
    select: {
      patient: { select: { userId: true } },
      doctor: { select: { userId: true } },
    },
  });

  if (!record) return null;
  const actorUserId = req.user?.userId;

  if (record.patient?.userId === actorUserId) {
    return record.patient.userId;
  }
  if (record.doctor?.userId === actorUserId) {
    return record.doctor.userId;
  }
  return null;
};

/**
 * Helper callback to check if the current user is the doctor of the EMR record.
 */
const getEMRDoctorAssigneeId = async (req: CustomRequest): Promise<string | null> => {
  const { id } = req.params;
  if (!id) return null;

  const record = await prisma.medicalRecord.findUnique({
    where: { id },
    select: {
      doctor: { select: { userId: true } },
    },
  });

  return record?.doctor?.userId || null;
};

/**
 * Helper callback to check if the current user is the patient profile being queried.
 */
const getPatientTimelineOwnerId = async (req: CustomRequest): Promise<string | null> => {
  const { patientId } = req.params;
  if (!patientId) return null;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { userId: true },
  });

  return patient?.userId || null;
};

/**
 * @swagger
 * /api/emr:
 *   post:
 *     summary: Create a new EMR file
 *     description: Admins and Doctors can create medical records.
 *     tags: [EMR]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR]),
  EMRController.createMedicalRecord
);

/**
 * @swagger
 * /api/emr:
 *   get:
 *     summary: Query list of EMR records
 *     description: Staff and Patient owners can retrieve records.
 *     tags: [EMR]
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
    RoleType.PATIENT,
  ]),
  async (req: CustomRequest, res, next): Promise<void> => {
    // If patient is logged in, force filter to their own patient profile
    if (req.user?.roles.includes(RoleType.PATIENT)) {
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.userId },
      });
      if (patient) {
        req.query.patientId = patient.id;
      } else {
        res.status(200).json({ records: [], total: 0 });
        return;
      }
    }
    next();
  },
  EMRController.getMedicalRecords
);

/**
 * @swagger
 * /api/emr/vitals:
 *   post:
 *     summary: Record patient vitals
 *     description: Admins, Doctors, and Nurses can log patient vitals.
 *     tags: [EMR]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/vitals',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR, RoleType.NURSE]),
  EMRController.addVital
);

/**
 * @swagger
 * /api/emr/{id}:
 *   get:
 *     summary: Retrieve EMR details by ID
 *     description: Admins, Nurses, assigned Doctors, or Patient Owner.
 *     tags: [EMR]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/:id',
  requireOwnershipOrRole(
    [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.NURSE],
    getEMROwnerOrAssigneeId
  ),
  EMRController.getMedicalRecordById
);

/**
 * @swagger
 * /api/emr/{id}:
 *   put:
 *     summary: Update an EMR details and increment version
 *     description: Only the assigned Doctor can modify the EMR.
 *     tags: [EMR]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/:id',
  requireOwnershipOrRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN], getEMRDoctorAssigneeId),
  EMRController.updateMedicalRecord
);

/**
 * @swagger
 * /api/emr/{id}:
 *   delete:
 *     summary: Soft delete EMR record
 *     description: Admin and assigned Doctor.
 *     tags: [EMR]
 *     security:
 *       - BearerAuth: []
 */
router.delete(
  '/:id',
  requireOwnershipOrRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN], getEMRDoctorAssigneeId),
  EMRController.deleteMedicalRecord
);

/**
 * @swagger
 * /api/emr/{id}/restore:
 *   post:
 *     summary: Restore a previous EMR version
 *     description: Only the assigned Doctor can restore previous versions.
 *     tags: [EMR]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/:id/restore',
  requireOwnershipOrRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN], getEMRDoctorAssigneeId),
  EMRController.restoreVersion
);

/**
 * @swagger
 * /api/emr/{id}/versions:
 *   get:
 *     summary: Fetch complete list of version logs for an EMR
 *     description: Doctors, Nurses, and Admins.
 *     tags: [EMR]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/:id/versions',
  requireOwnershipOrRole(
    [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.NURSE],
    getEMRDoctorAssigneeId
  ),
  EMRController.getVersionLogs
);

/**
 * @swagger
 * /api/emr/{id}/versions/{version}:
 *   get:
 *     summary: Get details of a specific EMR version snapshot
 *     description: Doctors, Nurses, and Admins.
 *     tags: [EMR]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/:id/versions/:version',
  requireOwnershipOrRole(
    [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.NURSE],
    getEMRDoctorAssigneeId
  ),
  EMRController.getVersionDetails
);

/**
 * @swagger
 * /api/emr/{id}/documents:
 *   post:
 *     summary: Upload and link document to EMR
 *     description: Admins and assigned Doctor.
 *     tags: [EMR]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/:id/documents',
  requireOwnershipOrRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN], getEMRDoctorAssigneeId),
  EMRController.addDocument
);

/**
 * @swagger
 * /api/emr/patient/{patientId}/timeline:
 *   get:
 *     summary: Retrieve EMR Patient Timeline
 *     description: Doctors, Nurses, Admins, and Patient Owner.
 *     tags: [EMR]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/patient/:patientId/timeline',
  requireOwnershipOrRole(
    [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR, RoleType.NURSE],
    getPatientTimelineOwnerId
  ),
  EMRController.getPatientTimeline
);

/**
 * @swagger
 * /api/emr/patient/:patientId/vitals:
 *   get:
 *     summary: Get vital history trends
 *     description: Doctors, Nurses, Admins, and Patient Owner.
 *     tags: [EMR]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/patient/:patientId/vitals',
  requireOwnershipOrRole(
    [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR, RoleType.NURSE],
    getPatientTimelineOwnerId
  ),
  EMRController.getPatientVitals
);

/**
 * @swagger
 * /api/emr/patient/:patientId/diagnoses:
 *   get:
 *     summary: Get diagnosis history
 *     description: Doctors, Nurses, Admins, and Patient Owner.
 *     tags: [EMR]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/patient/:patientId/diagnoses',
  requireOwnershipOrRole(
    [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR, RoleType.NURSE],
    getPatientTimelineOwnerId
  ),
  EMRController.getDiagnosisHistory
);

/**
 * @swagger
 * /api/emr/patient/:patientId/prescriptions:
 *   get:
 *     summary: Get prescription history
 *     description: Doctors, Nurses, Admins, and Patient Owner.
 *     tags: [EMR]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/patient/:patientId/prescriptions',
  requireOwnershipOrRole(
    [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR, RoleType.NURSE],
    getPatientTimelineOwnerId
  ),
  EMRController.getPrescriptionHistory
);

/**
 * @swagger
 * /api/emr/patient/{patientId}/allergies:
 *   post:
 *     summary: Record patient allergy
 *     description: Admins, Doctors, and Nurses.
 *     tags: [EMR]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/patient/:patientId/allergies',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR, RoleType.NURSE]),
  EMRController.addAllergy
);

/**
 * @swagger
 * /api/emr/patient/{patientId}/conditions:
 *   post:
 *     summary: Record patient condition
 *     description: Admins, Doctors, and Nurses.
 *     tags: [EMR]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/patient/:patientId/conditions',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR, RoleType.NURSE]),
  EMRController.addCondition
);

export default router;
