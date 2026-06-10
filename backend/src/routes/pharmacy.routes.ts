import { Router } from 'express';
import { PharmacyController } from '../controllers/pharmacy.controller';
import { requireAnyRole } from '../middlewares/rbac.middleware';
import { RoleType } from '@prisma/client';

const router = Router();

// --- CATALOG DEFINITIONS ---

/**
 * @swagger
 * /api/pharmacy/categories:
 *   post:
 *     summary: Create a new medicine category
 *     tags: [Pharmacy]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/categories',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.PHARMACIST]),
  PharmacyController.createCategory
);

/**
 * @swagger
 * /api/pharmacy/medicines:
 *   post:
 *     summary: Register a new medicine in the catalog
 *     tags: [Pharmacy]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/medicines',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.PHARMACIST]),
  PharmacyController.createMedicine
);

/**
 * @swagger
 * /api/pharmacy/medicines/{id}:
 *   put:
 *     summary: Update an existing medicine catalog record
 *     tags: [Pharmacy]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/medicines/:id',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.PHARMACIST]),
  PharmacyController.updateMedicine
);

/**
 * @swagger
 * /api/pharmacy/medicines/search:
 *   get:
 *     summary: Search medicines by name, generic name, or brand name
 *     tags: [Pharmacy]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/medicines/search',
  requireAnyRole([
    RoleType.SUPER_ADMIN,
    RoleType.HOSPITAL_ADMIN,
    RoleType.PHARMACIST,
    RoleType.DOCTOR,
    RoleType.PATIENT,
  ]),
  PharmacyController.searchMedicines
);

// --- SUPPLIERS & PROCUREMENT ---

/**
 * @swagger
 * /api/pharmacy/suppliers:
 *   post:
 *     summary: Add a new suppliers profile
 *     tags: [Pharmacy]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/suppliers',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.PHARMACIST]),
  PharmacyController.createSupplier
);

/**
 * @swagger
 * /api/pharmacy/purchase-orders:
 *   post:
 *     summary: Requisition a new purchase order for medicine stock
 *     tags: [Pharmacy]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/purchase-orders',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.PHARMACIST]),
  PharmacyController.createPurchaseOrder
);

/**
 * @swagger
 * /api/pharmacy/purchase-orders/{id}/receive:
 *   put:
 *     summary: Receive stock items from a purchase order
 *     tags: [Pharmacy]
 *     security:
 *       - BearerAuth: []
 */
router.put(
  '/purchase-orders/:id/receive',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.PHARMACIST]),
  PharmacyController.receivePurchaseOrder
);

// --- PRESCRIPTION FULFILLMENT & DISPENSING ---

/**
 * @swagger
 * /api/pharmacy/dispense:
 *   post:
 *     summary: Dispense prescribed medicines to a patient
 *     tags: [Pharmacy]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/dispense',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.PHARMACIST]),
  PharmacyController.dispensePrescription
);

/**
 * @swagger
 * /api/pharmacy/dispense/history/{prescriptionId}:
 *   get:
 *     summary: Retrieve dispense history for a prescription
 *     tags: [Pharmacy]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/dispense/history/:prescriptionId',
  requireAnyRole([
    RoleType.SUPER_ADMIN,
    RoleType.HOSPITAL_ADMIN,
    RoleType.PHARMACIST,
    RoleType.DOCTOR,
    RoleType.PATIENT,
  ]),
  PharmacyController.getDispenseHistory
);

// --- SUBSTITUTIONS MAPPING ---

/**
 * @swagger
 * /api/pharmacy/substitutes:
 *   post:
 *     summary: Map a substitute medicine option
 *     tags: [Pharmacy]
 *     security:
 *       - BearerAuth: []
 */
router.post(
  '/substitutes',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.PHARMACIST]),
  PharmacyController.createSubstitution
);

/**
 * @swagger
 * /api/pharmacy/substitutes/{medicineId}:
 *   get:
 *     summary: Retrieve substitute alternatives for a medicine
 *     tags: [Pharmacy]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/substitutes/:medicineId',
  requireAnyRole([
    RoleType.SUPER_ADMIN,
    RoleType.HOSPITAL_ADMIN,
    RoleType.PHARMACIST,
    RoleType.DOCTOR,
    RoleType.PATIENT,
  ]),
  PharmacyController.getSubstitutes
);

// --- DASHBOARD & MOVEMENTS ---

/**
 * @swagger
 * /api/pharmacy/dashboard:
 *   get:
 *     summary: Get pharmacy revenue and stock metrics
 *     tags: [Pharmacy]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/dashboard',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.PHARMACIST]),
  PharmacyController.getDashboardMetrics
);

/**
 * @swagger
 * /api/pharmacy/medicines/{medicineId}/movements:
 *   get:
 *     summary: Get stock movement history for a specific medicine
 *     tags: [Pharmacy]
 *     security:
 *       - BearerAuth: []
 */
router.get(
  '/medicines/:medicineId/movements',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.PHARMACIST]),
  PharmacyController.getStockMovements
);

export default router;
