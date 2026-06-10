import { Router } from 'express';
import { SecurityController } from '../controllers/security.controller';
import { requireAnyRole } from '../middlewares/rbac.middleware';
import { RoleType } from '@prisma/client';

const router = Router();

// Secure all security management/metrics to SUPER_ADMIN or HOSPITAL_ADMIN
router.use(requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]));

/**
 * @swagger
 * /api/security/dashboard:
 *   get:
 *     summary: Fetch security dashboard compiled data
 *     description: Returns consolidated metrics, recent incidents, and recent compliance audits.
 *     tags: [Security Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Consolidated dashboard data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal Server Error
 */
router.get('/dashboard', SecurityController.getDashboardData);

/**
 * @swagger
 * /api/security/metrics:
 *   get:
 *     summary: Fetch real-time security telemetry
 *     description: Returns active session count, failed logins, unresolved warnings, and locked count.
 *     tags: [Security Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Telemetry data
 */
router.get('/metrics', SecurityController.getMetrics);

/**
 * @swagger
 * /api/security/events:
 *   get:
 *     summary: Retrieve threat/security incidents list
 *     description: Returns filtered list of security incidents (unauthorized access, concurrent logins, etc.).
 *     tags: [Security Dashboard]
 *     security:
 *       - BearerAuth: []
 */
router.get('/events', SecurityController.getEvents);

/**
 * @swagger
 * /api/security/events/{id}/resolve:
 *   put:
 *     summary: Mark a security event as resolved
 *     description: Resolves a security event using its UUID.
 *     tags: [Security Dashboard]
 *     security:
 *       - BearerAuth: []
 */
router.put('/events/:id/resolve', SecurityController.resolveEvent);

/**
 * @swagger
 * /api/security/audit-logs:
 *   get:
 *     summary: Retrieve compliance audit trail logs
 *     description: Returns filtered user action logs.
 *     tags: [Security Dashboard]
 *     security:
 *       - BearerAuth: []
 */
router.get('/audit-logs', SecurityController.getAuditLogs);

/**
 * @swagger
 * /api/security/lockouts:
 *   get:
 *     summary: Retrieve locked accounts and login fail metrics
 *     description: Lists accounts that are locked or have active failed login attempts.
 *     tags: [Security Dashboard]
 *     security:
 *       - BearerAuth: []
 */
router.get('/lockouts', SecurityController.getLockedAccounts);

export default router;
