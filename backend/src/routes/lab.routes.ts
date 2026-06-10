import { Router } from 'express';
import { LabController } from '../controllers/lab.controller';
import { requireAnyRole } from '../middlewares/rbac.middleware';
import { RoleType } from '@prisma/client';

const router = Router();

// --- CATALOG DEFINITIONS (Admin only) ---

/**
 * @swagger
 * /api/lab/categories:
 *   post:
 *     summary: Create a new laboratory test category
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/categories',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]),
  LabController.createCategory
);

/**
 * @swagger
 * /api/lab/tests:
 *   post:
 *     summary: Create a new laboratory test definition
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/tests',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]),
  LabController.createLabTest
);

/**
 * @swagger
 * /api/lab/reference-ranges:
 *   post:
 *     summary: Define a reference range for a lab test parameter
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/reference-ranges',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]),
  LabController.createReferenceRange
);

// --- LAB ORDERS WORKFLOW ---

/**
 * @swagger
 * /api/lab/orders:
 *   post:
 *     summary: Create/Order a lab test for a patient
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/orders',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR]),
  LabController.createLabOrder
);

/**
 * @swagger
 * /api/lab/orders/{id}/receive:
 *   put:
 *     summary: Mark lab order as received by the laboratory
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/orders/:id/receive',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.LAB_TECH]),
  LabController.receiveOrder
);

/**
 * @swagger
 * /api/lab/orders/{id}/assign:
 *   put:
 *     summary: Assign a lab technician to an order
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/orders/:id/assign',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.LAB_TECH]),
  LabController.assignTechnician
);

/**
 * @swagger
 * /api/lab/orders/{id}/samples:
 *   post:
 *     summary: Record collection of a sample for the lab order
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/orders/:id/samples',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.LAB_TECH, RoleType.NURSE]),
  LabController.collectSample
);

/**
 * @swagger
 * /api/lab/samples/{sampleId}/status:
 *   put:
 *     summary: Update sample processing status (PROCESSING, TESTING, etc.)
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/samples/:sampleId/status',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.LAB_TECH]),
  LabController.updateSampleStatus
);

/**
 * @swagger
 * /api/lab/orders/{id}/results:
 *   post:
 *     summary: Enter test parameter values for the lab order
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/orders/:id/results',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.LAB_TECH]),
  LabController.enterResults
);

/**
 * @swagger
 * /api/lab/orders/{id}/approve:
 *   put:
 *     summary: Approve lab results and generate the final report
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/orders/:id/approve',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.LAB_TECH]),
  LabController.approveResults
);

/**
 * @swagger
 * /api/lab/reports/{reportId}:
 *   get:
 *     summary: Retrieve generated lab report details
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/reports/:reportId',
  requireAnyRole([
    RoleType.SUPER_ADMIN,
    RoleType.HOSPITAL_ADMIN,
    RoleType.DOCTOR,
    RoleType.LAB_TECH,
    RoleType.PATIENT,
  ]),
  LabController.getReport
);

/**
 * @swagger
 * /api/lab/orders/{id}/cancel:
 *   put:
 *     summary: Cancel a lab order
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/orders/:id/cancel',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR]),
  LabController.cancelOrder
);

// --- DASHBOARD & QUEUES ---

/**
 * @swagger
 * /api/lab/dashboard:
 *   get:
 *     summary: Get dashboard metrics and alerts
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/dashboard',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.LAB_TECH]),
  LabController.getDashboardMetrics
);

/**
 * @swagger
 * /api/lab/alerts/critical:
 *   get:
 *     summary: Get list of critical laboratory result alerts
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/alerts/critical',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.LAB_TECH, RoleType.DOCTOR]),
  LabController.getCriticalAlerts
);

/**
 * @swagger
 * /api/lab/tasks/pending:
 *   get:
 *     summary: Get pending tasks/orders assigned to the logged-in technician
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/tasks/pending',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.LAB_TECH]),
  LabController.getTechnicianPendingTasks
);

// --- INVENTORY MANAGEMENT ---

/**
 * @swagger
 * /api/lab/inventory:
 *   get:
 *     summary: Retrieve laboratory inventory items
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/inventory',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.LAB_TECH]),
  LabController.listInventory
);

/**
 * @swagger
 * /api/lab/inventory:
 *   post:
 *     summary: Add a new inventory item
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/inventory',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.LAB_TECH]),
  LabController.addInventoryItem
);

/**
 * @swagger
 * /api/lab/inventory/{id}/quantity:
 *   put:
 *     summary: Update stock quantity of an inventory item
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/inventory/:id/quantity',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.LAB_TECH]),
  LabController.updateInventoryQuantity
);

// --- EQUIPMENT MANAGEMENT ---

/**
 * @swagger
 * /api/lab/equipment:
 *   get:
 *     summary: Retrieve laboratory equipment
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/equipment',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.LAB_TECH]),
  LabController.listEquipment
);

/**
 * @swagger
 * /api/lab/equipment:
 *   post:
 *     summary: Add a new laboratory equipment
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/equipment',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]),
  LabController.addEquipment
);

/**
 * @swagger
 * /api/lab/equipment/{id}/status:
 *   put:
 *     summary: Update laboratory equipment operational status
 *     tags: [Lab]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/equipment/:id/status',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.LAB_TECH]),
  LabController.updateEquipmentStatus
);

export default router;
