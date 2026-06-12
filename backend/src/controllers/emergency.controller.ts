import { Response } from 'express';
import { CustomRequest } from '../types/auth.types';
import { EmergencyService } from '../services/emergency.service';
import {
  createEmergencyCaseSchema,
  triageAssessmentSchema,
  assignDoctorSchema,
  respondAssignmentSchema,
  createTreatmentSchema,
  createProcedureSchema,
  createTraumaCaseSchema,
  initiateTransferSchema,
  approveTransferSchema,
  triggerAlertSchema,
  resolveAlertSchema,
  createDispositionSchema,
} from '../validators/emergency.validator';
import { EmergencyCaseStatus, TriageLevel } from '@prisma/client';

export class EmergencyController {
  /**
   * Create a new emergency case.
   */
  static async createEmergencyCase(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createEmergencyCaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      const emergencyCase = await EmergencyService.createEmergencyCase(
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Emergency case opened successfully',
        data: emergencyCase,
      });
    } catch (error: any) {
      console.error('Error in createEmergencyCase:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'Failed to open emergency case',
      });
    }
  }

  /**
   * Get an emergency case profile by ID.
   */
  static async getEmergencyCase(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Case ID is required' });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      const emergencyCase = await EmergencyService.getEmergencyCaseById(
        id,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        data: emergencyCase,
      });
    } catch (error: any) {
      console.error('Error in getEmergencyCase:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve emergency case' });
    }
  }

  /**
   * Search/list emergency cases.
   */
  static async listEmergencyCases(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { status, triageLevel } = req.query;

      const filters = {
        status: status ? (status as EmergencyCaseStatus) : undefined,
        triageLevel: triageLevel ? (triageLevel as TriageLevel) : undefined,
      };

      const cases = await EmergencyService.queryEmergencyCases(filters);

      return res.status(200).json({
        data: cases,
      });
    } catch (error: any) {
      console.error('Error in listEmergencyCases:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to query emergency cases' });
    }
  }

  /**
   * Add triage assessment to case.
   */
  static async addTriage(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Case ID is required' });
      }

      const parsed = triageAssessmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const nurseUserId = req.user?.userId;

      if (!nurseUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      }

      const triage = await EmergencyService.addTriageAssessment(
        id,
        parsed.data,
        nurseUserId,
        nurseUserId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Triage assessment recorded successfully',
        data: triage,
      });
    } catch (error: any) {
      console.error('Error in addTriage:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to save triage assessment' });
    }
  }

  /**
   * Assign a doctor to a case.
   */
  static async assignDoctor(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Case ID is required' });
      }

      const parsed = assignDoctorSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      const assignment = await EmergencyService.assignDoctor(
        id,
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Doctor assigned to emergency case successfully',
        data: assignment,
      });
    } catch (error: any) {
      console.error('Error in assignDoctor:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to assign doctor' });
    }
  }

  /**
   * Respond to a doctor assignment.
   */
  static async respondAssignment(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { assignmentId } = req.params;
      if (!assignmentId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Assignment ID is required' });
      }

      const parsed = respondAssignmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      const updated = await EmergencyService.respondAssignment(
        assignmentId,
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        message: 'Assignment response recorded successfully',
        data: updated,
      });
    } catch (error: any) {
      console.error('Error in respondAssignment:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to record response' });
    }
  }

  /**
   * Add treatment.
   */
  static async addTreatment(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Case ID is required' });
      }

      const parsed = createTreatmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const staffUserId = req.user?.userId;

      if (!staffUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      }

      const treatment = await EmergencyService.addTreatment(
        id,
        parsed.data,
        staffUserId,
        staffUserId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Treatment details recorded successfully',
        data: treatment,
      });
    } catch (error: any) {
      console.error('Error in addTreatment:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to record treatment' });
    }
  }

  /**
   * Add procedure.
   */
  static async addProcedure(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Case ID is required' });
      }

      const parsed = createProcedureSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const staffUserId = req.user?.userId;

      if (!staffUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      }

      const procedure = await EmergencyService.addProcedure(
        id,
        parsed.data,
        staffUserId,
        staffUserId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Procedure details recorded successfully',
        data: procedure,
      });
    } catch (error: any) {
      console.error('Error in addProcedure:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to record procedure' });
    }
  }

  /**
   * Create trauma case mapping.
   */
  static async createTrauma(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Case ID is required' });
      }

      const parsed = createTraumaCaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      const trauma = await EmergencyService.createTraumaCase(
        id,
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Trauma case profile logged successfully',
        data: trauma,
      });
    } catch (error: any) {
      console.error('Error in createTrauma:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create trauma profile' });
    }
  }

  /**
   * Propose a patient transfer.
   */
  static async proposeTransfer(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Case ID is required' });
      }

      const parsed = initiateTransferSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      }

      const transfer = await EmergencyService.initiateTransfer(
        id,
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Transfer request proposed successfully',
        data: transfer,
      });
    } catch (error: any) {
      console.error('Error in proposeTransfer:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to propose transfer' });
    }
  }

  /**
   * Approve a patient transfer.
   */
  static async resolveTransfer(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { transferId } = req.params;
      if (!transferId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Transfer ID is required' });
      }

      const parsed = approveTransferSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const approverUserId = req.user?.userId;

      if (!approverUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      }

      const updated = await EmergencyService.approveTransfer(
        transferId,
        parsed.data.status,
        approverUserId,
        approverUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        message: `Transfer request resolved as ${parsed.data.status}`,
        data: updated,
      });
    } catch (error: any) {
      console.error('Error in resolveTransfer:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to resolve transfer request' });
    }
  }

  /**
   * Trigger alert.
   */
  static async triggerAlert(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Case ID is required' });
      }

      const parsed = triggerAlertSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const triggeringUserId = req.user?.userId;

      if (!triggeringUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      }

      const alert = await EmergencyService.triggerAlert(
        id,
        parsed.data,
        triggeringUserId,
        triggeringUserId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Critical alert triggered successfully',
        data: alert,
      });
    } catch (error: any) {
      console.error('Error in triggerAlert:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to trigger critical alert' });
    }
  }

  /**
   * Resolve alert.
   */
  static async resolveAlert(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { alertId } = req.params;
      if (!alertId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Alert ID is required' });
      }

      const parsed = resolveAlertSchema.safeParse(req.body);
      const notes = parsed.success ? parsed.data.notes : undefined;

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      const updated = await EmergencyService.resolveAlert(
        alertId,
        notes,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        message: 'Critical alert resolved successfully',
        data: updated,
      });
    } catch (error: any) {
      console.error('Error in resolveAlert:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to resolve alert' });
    }
  }

  /**
   * Complete disposition.
   */
  static async completeDisposition(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Case ID is required' });
      }

      const parsed = createDispositionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const disposedById = req.user?.userId;

      if (!disposedById) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      }

      const disposition = await EmergencyService.createDisposition(
        id,
        parsed.data,
        disposedById,
        disposedById,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Emergency case disposition successfully recorded',
        data: disposition,
      });
    } catch (error: any) {
      console.error('Error in completeDisposition:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message: error.message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to submit case disposition' });
    }
  }

  /**
   * Get live dashboard.
   */
  static async getLiveDashboard(_req: CustomRequest, res: Response): Promise<Response> {
    try {
      const dashboard = await EmergencyService.getLiveDashboard();
      return res.status(200).json({
        data: dashboard,
      });
    } catch (error: any) {
      console.error('Error in getLiveDashboard:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch live dashboard telemetry' });
    }
  }

  /**
   * Get analytics.
   */
  static async getAnalytics(_req: CustomRequest, res: Response): Promise<Response> {
    try {
      const analytics = await EmergencyService.getAnalytics();
      return res.status(200).json({
        data: analytics,
      });
    } catch (error: any) {
      console.error('Error in getAnalytics:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch emergency analytics' });
    }
  }
}
