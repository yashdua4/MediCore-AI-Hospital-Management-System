import { Router } from 'express';
import { IpdController } from '../controllers/ipd.controller';
import { requireAnyRole } from '../middlewares/rbac.middleware';
import { RoleType } from '@prisma/client';

const router = Router();

// Catalog configurations (Admins)
router.post(
  '/wards',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]),
  IpdController.createWard
);

router.post(
  '/rooms',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]),
  IpdController.createRoom
);

router.post(
  '/beds',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]),
  IpdController.createBed
);

// Patient Admissions
router.post(
  '/admissions',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.RECEPTIONIST]),
  IpdController.admitPatient
);

router.get(
  '/admissions/active',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR, RoleType.NURSE]),
  IpdController.getActiveAdmissions
);

// Individual Admission Actions
router.post(
  '/admissions/:id/transfers',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR, RoleType.NURSE]),
  IpdController.transferPatient
);

router.post(
  '/admissions/:id/charges',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.BILLING_EXEC]),
  IpdController.addCharge
);

router.post(
  '/admissions/:id/notes',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR, RoleType.NURSE]),
  IpdController.createNote
);

router.post(
  '/admissions/:id/nurses',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]),
  IpdController.assignNurse
);

router.post(
  '/admissions/:id/discharge',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR]),
  IpdController.dischargePatient
);

// Reports & dashboard
router.get(
  '/dashboard',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR]),
  IpdController.getDashboard
);

router.get(
  '/admissions/:id',
  requireAnyRole([
    RoleType.SUPER_ADMIN,
    RoleType.HOSPITAL_ADMIN,
    RoleType.DOCTOR,
    RoleType.NURSE,
    RoleType.PATIENT,
  ]),
  IpdController.getAdmission
);

export default router;

/**
 * @swagger
 * tags:
 *   name: Inpatient Admission (IPD)
 *   description: Inpatient admission management, wards, rooms, bed bookings, and telemetry
 */

/**
 * @swagger
 * /api/ipd/wards:
 *   post:
 *     summary: Create a new ward configuration
 *     tags: [Inpatient Admission (IPD)]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - capacity
 *             properties:
 *               name:
 *                 type: string
 *                 example: ICU-A
 *               type:
 *                 type: string
 *                 enum: [GENERAL, SEMI_PRIVATE, PRIVATE, ICU, NICU, EMERGENCY, RECOVERY]
 *               capacity:
 *                 type: integer
 *                 example: 10
 *     responses:
 *       201:
 *         description: Ward created successfully
 */

/**
 * @swagger
 * /api/ipd/rooms:
 *   post:
 *     summary: Create a new room in a ward
 *     tags: [Inpatient Admission (IPD)]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomNumber
 *               - wardId
 *               - roomType
 *               - chargesPerDay
 *             properties:
 *               roomNumber:
 *                 type: string
 *                 example: 301
 *               wardId:
 *                 type: string
 *                 format: uuid
 *               roomType:
 *                 type: string
 *                 enum: [GENERAL, SEMI_PRIVATE, PRIVATE, ICU, NICU, EMERGENCY, RECOVERY]
 *               chargesPerDay:
 *                 type: number
 *                 example: 1500
 *     responses:
 *       201:
 *         description: Room created successfully
 */

/**
 * @swagger
 * /api/ipd/beds:
 *   post:
 *     summary: Register a new bed in a room
 *     tags: [Inpatient Admission (IPD)]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bedNumber
 *               - roomId
 *             properties:
 *               bedNumber:
 *                 type: string
 *                 example: 301-B
 *               roomId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Bed created successfully
 */

/**
 * @swagger
 * /api/ipd/admissions:
 *   post:
 *     summary: Admit a patient to a bed
 *     tags: [Inpatient Admission (IPD)]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - doctorId
 *               - reason
 *               - bedId
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               doctorId:
 *                 type: string
 *                 format: uuid
 *               reason:
 *                 type: string
 *                 example: Acute myocardial infarction
 *               bedId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Patient admitted successfully
 */

/**
 * @swagger
 * /api/ipd/admissions/active:
 *   get:
 *     summary: List all active inpatient admissions
 *     tags: [Inpatient Admission (IPD)]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List retrieved successfully
 */

/**
 * @swagger
 * /api/ipd/admissions/{id}/transfers:
 *   post:
 *     summary: Transfer patient to a new bed
 *     tags: [Inpatient Admission (IPD)]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetBedId
 *               - reason
 *             properties:
 *               targetBedId:
 *                 type: string
 *                 format: uuid
 *               reason:
 *                 type: string
 *                 example: Transferred to ICU due to worsening conditions
 *     responses:
 *       201:
 *         description: Patient transferred successfully
 */

/**
 * @swagger
 * /api/ipd/admissions/{id}/charges:
 *   post:
 *     summary: Log inpatient care daily charges
 *     tags: [Inpatient Admission (IPD)]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chargeType
 *               - amount
 *               - description
 *             properties:
 *               chargeType:
 *                 type: string
 *                 enum: [ROOM, BED, NURSING, SPECIAL_CARE]
 *               amount:
 *                 type: number
 *               quantity:
 *                 type: integer
 *               description:
 *                 type: string
 *                 example: ICU intensive care charges
 *     responses:
 *       201:
 *         description: Charges logged successfully
 */

/**
 * @swagger
 * /api/ipd/admissions/{id}/notes:
 *   post:
 *     summary: Add daily clinical or nursing notes
 *     tags: [Inpatient Admission (IPD)]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - noteType
 *               - content
 *             properties:
 *               noteType:
 *                 type: string
 *                 enum: [CLINICAL, NURSING, GENERAL]
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Admission note added successfully
 */

/**
 * @swagger
 * /api/ipd/admissions/{id}/nurses:
 *   post:
 *     summary: Assign nurse to admission shift schedule
 *     tags: [Inpatient Admission (IPD)]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nurseId
 *               - wardId
 *               - shiftStart
 *               - shiftEnd
 *             properties:
 *               nurseId:
 *                 type: string
 *                 format: uuid
 *               wardId:
 *                 type: string
 *                 format: uuid
 *               shiftStart:
 *                 type: string
 *                 format: date-time
 *               shiftEnd:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Shift assigned successfully
 */

/**
 * @swagger
 * /api/ipd/admissions/{id}/discharge:
 *   post:
 *     summary: Complete patient discharge summary and release bed
 *     tags: [Inpatient Admission (IPD)]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - treatmentSummary
 *               - medicationInstructions
 *               - followUpInstructions
 *               - dischargeCondition
 *             properties:
 *               treatmentSummary:
 *                 type: string
 *               medicationInstructions:
 *                 type: string
 *               followUpInstructions:
 *                 type: string
 *               dischargeCondition:
 *                 type: string
 *                 example: Stable, fit for discharge
 *     responses:
 *       200:
 *         description: Patient discharged successfully
 */

/**
 * @swagger
 * /api/ipd/dashboard:
 *   get:
 *     summary: Fetch occupancy and ward utilizations analytics telemetry dashboard
 *     tags: [Inpatient Admission (IPD)]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully
 */

/**
 * @swagger
 * /api/ipd/admissions/{id}:
 *   get:
 *     summary: Fetch single admission full report details
 *     tags: [Inpatient Admission (IPD)]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Admission details retrieved successfully
 */
