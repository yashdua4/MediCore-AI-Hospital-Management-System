import { Router } from 'express';
import { PermissionController } from '../controllers/permission.controller';
import { requireRole } from '../middlewares/rbac.middleware';
import { RoleType } from '@prisma/client';

const router = Router();

// Secure all permission management routes to SUPER_ADMIN only
router.use(requireRole([RoleType.SUPER_ADMIN]));

/**
 * @swagger
 * /api/permissions:
 *   post:
 *     summary: Create a new permission
 *     description: Creates a unique resource-action permission pairing. Only SUPER_ADMIN can create permissions.
 *     tags: [Permissions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resource
 *               - action
 *             properties:
 *               resource:
 *                 type: string
 *                 example: patient
 *                 description: Resource name in lowercase (letters and underscores only)
 *               action:
 *                 type: string
 *                 example: write
 *                 description: Action name in lowercase (letters and underscores only)
 *     responses:
 *       201:
 *         description: Permission created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     resource:
 *                       type: string
 *                     action:
 *                       type: string
 *       400:
 *         description: Bad request / validation failure
 *       401:
 *         description: Unauthorized (missing or invalid JWT)
 *       403:
 *         description: Forbidden (insufficient roles)
 *       409:
 *         description: Conflict (permission already exists)
 *       500:
 *         description: Internal server error
 */
router.post('/', PermissionController.createPermission);

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     summary: Retrieve all permissions
 *     description: Returns a sorted list of all permissions defined in the system. Only SUPER_ADMIN can view all permissions.
 *     tags: [Permissions]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       resource:
 *                         type: string
 *                       action:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get('/', PermissionController.getAllPermissions);

/**
 * @swagger
 * /api/permissions/{id}:
 *   delete:
 *     summary: Delete a permission
 *     description: Deletes a permission by its ID. Only SUPER_ADMIN can delete permissions.
 *     tags: [Permissions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The permission ID (UUID)
 *     responses:
 *       200:
 *         description: Permission deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Permission not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', PermissionController.deletePermission);

export default router;
