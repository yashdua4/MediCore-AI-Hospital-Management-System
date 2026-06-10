import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller';
import { requireAnyRole } from '../middlewares/rbac.middleware';
import { RoleType } from '@prisma/client';

const router = Router();

// Providers & Policies Registration (Admins)
router.post(
  '/providers',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]),
  BillingController.createProvider
);

router.post(
  '/policies',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]),
  BillingController.createPolicy
);

// Invoices CRUD & Payments
router.post(
  '/invoices',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.BILLING_EXEC]),
  BillingController.createInvoice
);

router.put(
  '/invoices/:id/finalize',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.BILLING_EXEC]),
  BillingController.finalizeInvoice
);

router.put(
  '/invoices/:id/cancel',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.BILLING_EXEC]),
  BillingController.cancelInvoice
);

router.post(
  '/invoices/:id/payments',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.BILLING_EXEC]),
  BillingController.recordPayment
);

// Claims submission & processing
router.post(
  '/invoices/:id/claims',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.BILLING_EXEC]),
  BillingController.submitInsuranceClaim
);

router.put(
  '/claims/:claimId/process',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.ACCOUNTANT]),
  BillingController.processInsuranceClaim
);

// Refunds management
router.post(
  '/payments/:paymentId/refunds',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.ACCOUNTANT]),
  BillingController.requestRefund
);

router.put(
  '/refunds/:refundId/process',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.ACCOUNTANT]),
  BillingController.processRefund
);

// Dashboards & Analytics
router.get(
  '/dashboard/revenue',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.ACCOUNTANT]),
  BillingController.getRevenueDashboard
);

router.get(
  '/dashboard/insurance',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.ACCOUNTANT]),
  BillingController.getInsuranceDashboard
);

// Reading Invoices (Patient ownership checked inside controller)
router.get(
  '/invoices/:id',
  requireAnyRole([
    RoleType.SUPER_ADMIN,
    RoleType.HOSPITAL_ADMIN,
    RoleType.BILLING_EXEC,
    RoleType.ACCOUNTANT,
    RoleType.DOCTOR,
    RoleType.PATIENT,
  ]),
  BillingController.getInvoice
);

router.get(
  '/patients/:patientId/invoices',
  requireAnyRole([
    RoleType.SUPER_ADMIN,
    RoleType.HOSPITAL_ADMIN,
    RoleType.BILLING_EXEC,
    RoleType.ACCOUNTANT,
    RoleType.DOCTOR,
    RoleType.PATIENT,
  ]),
  BillingController.getPatientInvoices
);

export default router;

/**
 * @swagger
 * tags:
 *   name: Billing & Insurance
 *   description: Enterprise Revenue Cycle Management endpoints
 */

/**
 * @swagger
 * /api/billing/providers:
 *   post:
 *     summary: Register a new insurance provider
 *     tags: [Billing & Insurance]
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
 *               - contactNumber
 *             properties:
 *               name:
 *                 type: string
 *               contactNumber:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Provider registered successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Provider already exists
 */

/**
 * @swagger
 * /api/billing/policies:
 *   post:
 *     summary: Register a new patient insurance policy
 *     tags: [Billing & Insurance]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - policyNumber
 *               - providerId
 *               - patientId
 *               - coverageLimit
 *               - expiryDate
 *             properties:
 *               policyNumber:
 *                 type: string
 *               providerId:
 *                 type: string
 *                 format: uuid
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               coverageLimit:
 *                 type: number
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Policy registered successfully
 *       400:
 *         description: Validation failed
 */

/**
 * @swagger
 * /api/billing/invoices:
 *   post:
 *     summary: Create a draft invoice
 *     tags: [Billing & Insurance]
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
 *               - items
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               appointmentId:
 *                 type: string
 *                 format: uuid
 *               discountAmount:
 *                 type: number
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - description
 *                     - quantity
 *                     - unitPrice
 *                     - itemType
 *                   properties:
 *                     description:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     unitPrice:
 *                       type: number
 *                     itemType:
 *                       type: string
 *                       enum: [CONSULTATION, APPOINTMENT, LAB_TEST, MEDICINE, ADMISSION, EMERGENCY, ROOM, SURGERY]
 *                     referenceId:
 *                       type: string
 *     responses:
 *       201:
 *         description: Invoice draft created successfully
 */

/**
 * @swagger
 * /api/billing/invoices/{id}/finalize:
 *   put:
 *     summary: Finalize a draft invoice
 *     tags: [Billing & Insurance]
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
 *         description: Invoice finalized successfully
 */

/**
 * @swagger
 * /api/billing/invoices/{id}/cancel:
 *   put:
 *     summary: Cancel a draft/finalized invoice
 *     tags: [Billing & Insurance]
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
 *         description: Invoice cancelled successfully
 */

/**
 * @swagger
 * /api/billing/invoices/{id}/payments:
 *   post:
 *     summary: Record a payment against a finalized invoice
 *     tags: [Billing & Insurance]
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
 *               - amount
 *               - paymentMethodName
 *             properties:
 *               amount:
 *                 type: number
 *               paymentMethodName:
 *                 type: string
 *                 enum: [UPI, CREDIT_CARD, DEBIT_CARD, NET_BANKING, CASH, INSURANCE]
 *               transactionRef:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment recorded successfully
 */

/**
 * @swagger
 * /api/billing/invoices/{id}/claims:
 *   post:
 *     summary: Submit an insurance claim for an invoice
 *     tags: [Billing & Insurance]
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
 *               - policyId
 *               - items
 *             properties:
 *               policyId:
 *                 type: string
 *                 format: uuid
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - description
 *                     - claimedAmount
 *                   properties:
 *                     description:
 *                       type: string
 *                     claimedAmount:
 *                       type: number
 *     responses:
 *       201:
 *         description: Claim submitted successfully
 */

/**
 * @swagger
 * /api/billing/claims/{claimId}/process:
 *   put:
 *     summary: Process/approve/reject/partially approve a claim
 *     tags: [Billing & Insurance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: claimId
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
 *               - status
 *               - approvedAmount
 *               - itemApprovals
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED, PARTIALLY_APPROVED]
 *               approvedAmount:
 *                 type: number
 *               itemApprovals:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - itemId
 *                     - approvedAmount
 *                     - status
 *                   properties:
 *                     itemId:
 *                       type: string
 *                       format: uuid
 *                     approvedAmount:
 *                       type: number
 *                     status:
 *                       type: string
 *                       enum: [APPROVED, REJECTED]
 *     responses:
 *       200:
 *         description: Claim processed successfully
 */

/**
 * @swagger
 * /api/billing/payments/{paymentId}/refunds:
 *   post:
 *     summary: Request a refund for a payment
 *     tags: [Billing & Insurance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: paymentId
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
 *               - amount
 *               - reason
 *             properties:
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Refund requested successfully
 */

/**
 * @swagger
 * /api/billing/refunds/{refundId}/process:
 *   put:
 *     summary: Process (approve/reject) a refund request
 *     tags: [Billing & Insurance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: refundId
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *     responses:
 *       200:
 *         description: Refund processed successfully
 */

/**
 * @swagger
 * /api/billing/dashboard/revenue:
 *   get:
 *     summary: Aggregate revenue analytics dashboard metrics
 *     tags: [Billing & Insurance]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics aggregated successfully
 */

/**
 * @swagger
 * /api/billing/dashboard/insurance:
 *   get:
 *     summary: Aggregate insurance claims analytics dashboard metrics
 *     tags: [Billing & Insurance]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics aggregated successfully
 */

/**
 * @swagger
 * /api/billing/invoices/{id}:
 *   get:
 *     summary: Get a specific invoice report details
 *     tags: [Billing & Insurance]
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
 *         description: Invoice report retrieved successfully
 */

/**
 * @swagger
 * /api/billing/patients/{patientId}/invoices:
 *   get:
 *     summary: Get all invoices for a patient
 *     tags: [Billing & Insurance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: patientId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invoices retrieved successfully
 */
