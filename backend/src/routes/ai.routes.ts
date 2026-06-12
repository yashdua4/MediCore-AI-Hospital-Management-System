import { Router } from 'express';
import { AiController } from '../controllers/ai.controller';
import { requireAnyRole } from '../middlewares/rbac.middleware';
import { RoleType } from '@prisma/client';

const router = Router();

const ALL_AUTHENTICATED_ROLES = [
  RoleType.SUPER_ADMIN,
  RoleType.HOSPITAL_ADMIN,
  RoleType.DOCTOR,
  RoleType.NURSE,
  RoleType.RECEPTIONIST,
  RoleType.LAB_TECH,
  RoleType.PHARMACIST,
  RoleType.BILLING_EXEC,
  RoleType.ACCOUNTANT,
  RoleType.PATIENT,
  RoleType.EMERGENCY_DOCTOR,
  RoleType.TRAUMA_SURGEON,
];

/**
 * @swagger
 * /api/ai/conversations:
 *   get:
 *     summary: Retrieve AI conversations list
 *     tags: [AI]
 */
router.get(
  '/conversations',
  requireAnyRole(ALL_AUTHENTICATED_ROLES),
  AiController.getConversations
);

/**
 * @swagger
 * /api/ai/conversations/{id}:
 *   get:
 *     summary: Retrieve conversation details and message history
 *     tags: [AI]
 */
router.get(
  '/conversations/:id',
  requireAnyRole(ALL_AUTHENTICATED_ROLES),
  AiController.getConversationDetails
);

/**
 * @swagger
 * /api/ai/conversations:
 *   post:
 *     summary: Send message/prompt to clinical copilot
 *     tags: [AI]
 */
router.post(
  '/conversations',
  requireAnyRole(ALL_AUTHENTICATED_ROLES),
  AiController.sendMessage
);

/**
 * @swagger
 * /api/ai/conversations/{id}:
 *   delete:
 *     summary: Delete conversation history
 *     tags: [AI]
 */
router.delete(
  '/conversations/:id',
  requireAnyRole(ALL_AUTHENTICATED_ROLES),
  AiController.deleteConversation
);

/**
 * @swagger
 * /api/ai/conversations/{id}/feedback:
 *   post:
 *     summary: Submit accuracy feedback rating
 *     tags: [AI]
 */
router.post(
  '/conversations/:id/feedback',
  requireAnyRole(ALL_AUTHENTICATED_ROLES),
  AiController.submitFeedback
);

/**
 * @swagger
 * /api/ai/telemetry:
 *   get:
 *     summary: Retrieve AI Usage Dashboard telemetry
 *     tags: [AI]
 */
router.get(
  '/telemetry',
  requireAnyRole([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]),
  AiController.getTelemetry
);

export default router;
