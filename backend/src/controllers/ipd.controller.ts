import { Response } from 'express';
import { CustomRequest } from '../types/auth.types';
import { IpdService } from '../services/ipd.service';
import {
  createWardSchema,
  createRoomSchema,
  createBedSchema,
  admitPatientSchema,
  transferPatientSchema,
  assignNurseSchema,
  createNoteSchema,
  dischargePatientSchema,
  addChargeSchema,
} from '../validators/ipd.validator';

export class IpdController {
  /**
   * Create Ward (Catalog Setup).
   */
  static async createWard(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createWardSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ward = await IpdService.createWard(parsed.data);
      return res.status(201).json({
        message: 'Ward created successfully',
        data: ward,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('already exists')) {
        return res.status(409).json({ error: 'Conflict', message });
      }
      console.error('Error in createWard:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create ward' });
    }
  }

  /**
   * Create Room.
   */
  static async createRoom(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createRoomSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const room = await IpdService.createRoom(parsed.data);
      return res.status(201).json({
        message: 'Room created successfully',
        data: room,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('already exists')) {
        return res.status(409).json({ error: 'Conflict', message });
      }
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in createRoom:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create room' });
    }
  }

  /**
   * Create Bed.
   */
  static async createBed(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createBedSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const bed = await IpdService.createBed(parsed.data);
      return res.status(201).json({
        message: 'Bed created successfully',
        data: bed,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('already exists')) {
        return res.status(409).json({ error: 'Conflict', message });
      }
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in createBed:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create bed' });
    }
  }

  /**
   * Admit a Patient.
   */
  static async admitPatient(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = admitPatientSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User context missing' });
      }

      const admission = await IpdService.admitPatient(parsed.data, actorUserId, ipAddress, userAgent);
      return res.status(201).json({
        message: 'Patient admitted successfully',
        data: admission,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('not available') || message.includes('already admitted')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in admitPatient:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to admit patient' });
    }
  }

  /**
   * Transfer a Patient.
   */
  static async transferPatient(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params; // admissionId
      const parsed = transferPatientSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User context missing' });
      }

      const transfer = await IpdService.transferPatient(id, parsed.data, actorUserId, ipAddress, userAgent);
      return res.status(201).json({
        message: 'Patient transferred successfully',
        data: transfer,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('not available') || message.includes('Cannot transfer')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in transferPatient:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to transfer patient' });
    }
  }

  /**
   * Add Admission Charge.
   */
  static async addCharge(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params; // admissionId
      const parsed = addChargeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const charge = await IpdService.logAdmissionCharge(id, parsed.data);
      return res.status(201).json({
        message: 'Admission charge recorded successfully',
        data: charge,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in addCharge:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to record admission charge' });
    }
  }

  /**
   * Assign Nurse.
   */
  static async assignNurse(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params; // admissionId
      const parsed = assignNurseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User context missing' });
      }

      const assignment = await IpdService.assignNurse(id, parsed.data, actorUserId, ipAddress, userAgent);
      return res.status(201).json({
        message: 'Nurse assigned to admission shift successfully',
        data: assignment,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in assignNurse:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to assign nurse' });
    }
  }

  /**
   * Create Note.
   */
  static async createNote(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params; // admissionId
      const parsed = createNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const actorUserId = req.user?.userId;
      if (!actorUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User context missing' });
      }

      const note = await IpdService.createAdmissionNote(id, actorUserId, parsed.data);
      return res.status(201).json({
        message: 'Admission note created successfully',
        data: note,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in createNote:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create note' });
    }
  }

  /**
   * Discharge Patient.
   */
  static async dischargePatient(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params; // admissionId
      const parsed = dischargePatientSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User context missing' });
      }

      const result = await IpdService.dischargePatient(id, parsed.data, actorUserId, ipAddress, userAgent);
      return res.status(200).json({
        message: 'Patient discharged and summary completed successfully',
        data: result,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('already discharged')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in dischargePatient:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to discharge patient' });
    }
  }

  /**
   * Get Dashboard Telemetry.
   */
  static async getDashboard(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      const telemetry = await IpdService.getDashboardTelemetry(actorUserId, ipAddress, userAgent);
      return res.status(200).json({
        data: telemetry,
      });
    } catch (error: unknown) {
      console.error('Error in getDashboardTelemetry:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch telemetry metrics' });
    }
  }

  /**
   * Get Active Admissions list.
   */
  static async getActiveAdmissions(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      const admissions = await IpdService.getActiveAdmissions(actorUserId, ipAddress, userAgent);
      return res.status(200).json({
        data: admissions,
      });
    } catch (error: unknown) {
      console.error('Error in getActiveAdmissions:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch active admissions list' });
    }
  }

  /**
   * Get single admission report.
   */
  static async getAdmission(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      const admission = await IpdService.getAdmissionById(id, actorUserId, ipAddress, userAgent);
      if (!admission) {
        return res.status(404).json({ error: 'Not Found', message: `Admission with ID '${id}' not found` });
      }

      // Patient ownership check
      const isPatient = req.user?.roles.includes('PATIENT');
      if (isPatient && admission.patient.userId !== actorUserId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access Denied: You can only view your own admission record',
        });
      }

      return res.status(200).json({
        data: admission,
      });
    } catch (error: unknown) {
      console.error('Error in getAdmission:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch admission details' });
    }
  }
}
