import { Router } from 'express';
import { SecurityController } from '../controllers/security.controller';

const router = Router();

// These endpoints require active authentication (JWT session)
// Since a user of any role should be able to view and manage their own sessions,
// we do not apply strict role checks here, but enforce ownership checks in the controller.

/**
 * @swagger
 * /api/sessions/active:
 *   get:
 *     summary: Retrieve active sessions for the logged-in user
 *     description: Returns a list of active logins associated with the current user.
 *     tags: [Sessions]
 *     security:
 *       - BearerAuth: []
 */
router.get('/active', SecurityController.getActiveSessions);

/**
 * @swagger
 * /api/sessions/{id}:
 *   delete:
 *     summary: Revoke a specific session
 *     description: Revokes an active session by its ID. Users can only revoke their own sessions unless they are SUPER_ADMIN.
 *     tags: [Sessions]
 *     security:
 *       - BearerAuth: []
 */
router.delete('/:id', SecurityController.revokeSession);

/**
 * @swagger
 * /api/sessions/active/all:
 *   delete:
 *     summary: Revoke all other active user sessions
 *     description: Invalidates all other active logins for the calling user.
 *     tags: [Sessions]
 *     security:
 *       - BearerAuth: []
 */
router.delete('/active/all', SecurityController.revokeAllOtherSessions);

export default router;
