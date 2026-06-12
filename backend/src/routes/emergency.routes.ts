import { Router } from 'express';
import { EmergencyController } from '../controllers/emergency.controller';
import { requireAnyRole } from '../middlewares/rbac.middleware';
import { RoleType } from '@prisma/client';

const router = Router();

// Secure all emergency operations to medical staff and admins
router.use(
  requireAnyRole([
    RoleType.SUPER_ADMIN,
    RoleType.HOSPITAL_ADMIN,
    RoleType.DOCTOR,
    RoleType.NURSE,
    RoleType.EMERGENCY_DOCTOR,
    RoleType.TRAUMA_SURGEON,
  ])
);

// Telemetry & Dashboard routes (Higher priority matching)
router.get('/dashboard', EmergencyController.getLiveDashboard);
router.get('/analytics', EmergencyController.getAnalytics);

// Case management routes
router.post('/', EmergencyController.createEmergencyCase);
router.get('/', EmergencyController.listEmergencyCases);
router.get('/:id', EmergencyController.getEmergencyCase);

// Sub-resource routes
router.post('/:id/triage', EmergencyController.addTriage);
router.post('/:id/assign', EmergencyController.assignDoctor);
router.put('/assignments/:assignmentId/respond', EmergencyController.respondAssignment);
router.post('/:id/treatments', EmergencyController.addTreatment);
router.post('/:id/procedures', EmergencyController.addProcedure);
router.post('/:id/trauma', EmergencyController.createTrauma);
router.post('/:id/transfers', EmergencyController.proposeTransfer);
router.put('/transfers/:transferId/approve', EmergencyController.resolveTransfer);
router.post('/:id/alerts', EmergencyController.triggerAlert);
router.put('/alerts/:alertId/resolve', EmergencyController.resolveAlert);
router.post('/:id/disposition', EmergencyController.completeDisposition);

export default router;
