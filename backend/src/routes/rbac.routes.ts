import { Router } from 'express';
import { RbacController } from '../controllers/rbac.controller';
import { requireRole } from '../middlewares/rbac.middleware';
import { RoleType } from '@prisma/client';

const router = Router();

// Secure all role management and mappings to SUPER_ADMIN
router.use(requireRole([RoleType.SUPER_ADMIN]));

/**
 * @swagger
 * /api/rbac/roles:
 *   post:
 *     summary: Create a new role
 *     description: Creates a unique system role. Only SUPER_ADMIN can create roles.
 *     tags: [RBAC]
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
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 enum: [SUPER_ADMIN, HOSPITAL_ADMIN, DOCTOR, NURSE, RECEPTIONIST, LAB_TECH, PHARMACIST, BILLING_EXEC, PATIENT]
 *                 description: System RoleType name
 *               description:
 *                 type: string
 *                 example: Medical doctor with diagnosis capabilities
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Conflict (role name already exists)
 *       500:
 *         description: Internal server error
 */
router.post('/roles', RbacController.createRole);

/**
 * @swagger
 * /api/rbac/roles:
 *   get:
 *     summary: Retrieve all roles
 *     description: Lists all roles available in the system. Only SUPER_ADMIN can retrieve all roles.
 *     tags: [RBAC]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get('/roles', RbacController.getAllRoles);

/**
 * @swagger
 * /api/rbac/roles/assign-permission:
 *   post:
 *     summary: Assign a permission to a role
 *     description: Maps a permission to a specific role. Only SUPER_ADMIN can execute this mapping.
 *     tags: [RBAC]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleId
 *               - permissionId
 *             properties:
 *               roleId:
 *                 type: string
 *                 format: uuid
 *               permissionId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Permission assigned successfully
 *       400:
 *         description: Validation failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role or Permission not found
 *       500:
 *         description: Internal server error
 */
router.post('/roles/assign-permission', RbacController.assignPermissionToRole);

/**
 * @swagger
 * /api/rbac/roles/remove-permission:
 *   post:
 *     summary: Remove a permission from a role
 *     description: Disconnects a permission mapping from a role. Only SUPER_ADMIN can remove permissions.
 *     tags: [RBAC]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleId
 *               - permissionId
 *             properties:
 *               roleId:
 *                 type: string
 *                 format: uuid
 *               permissionId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Permission removed successfully
 *       400:
 *         description: Mapping is not assigned or invalid payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role/Permission not found
 *       500:
 *         description: Internal server error
 */
router.post('/roles/remove-permission', RbacController.removePermissionFromRole);

/**
 * @swagger
 * /api/rbac/roles/{roleId}/permissions:
 *   get:
 *     summary: Retrieve permissions of a role
 *     description: Returns a list of permissions associated with a given role. Only SUPER_ADMIN can query role permissions directly.
 *     tags: [RBAC]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 *       500:
 *         description: Internal server error
 */
router.get('/roles/:roleId/permissions', RbacController.getRolePermissions);

/**
 * @swagger
 * /api/rbac/users/assign-role:
 *   post:
 *     summary: Assign a role to a user
 *     description: Maps a role to a specific user for multi-role membership. Only SUPER_ADMIN can assign user roles.
 *     tags: [RBAC]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - roleId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               roleId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Role assigned to user successfully
 *       400:
 *         description: Validation failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User or Role not found
 *       500:
 *         description: Internal server error
 */
router.post('/users/assign-role', RbacController.assignRoleToUser);

/**
 * @swagger
 * /api/rbac/users/remove-role:
 *   post:
 *     summary: Remove a role from a user
 *     description: Removes a role membership mapping from a user. Only SUPER_ADMIN can remove user roles.
 *     tags: [RBAC]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - roleId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               roleId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Role removed from user successfully
 *       400:
 *         description: User does not have the specified role or invalid payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User or Role not found
 *       500:
 *         description: Internal server error
 */
router.post('/users/remove-role', RbacController.removeRoleFromUser);

/**
 * @swagger
 * /api/rbac/users/{userId}/permissions:
 *   get:
 *     summary: Retrieve unique permissions of a user
 *     description: Returns the compiled set of unique permissions granted to a user across all their assigned roles. Only SUPER_ADMIN can query user permissions.
 *     tags: [RBAC]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/users/:userId/permissions', RbacController.getUserPermissions);

export default router;
