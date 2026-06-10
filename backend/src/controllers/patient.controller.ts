import { Response } from 'express';
import { CustomRequest } from '../types/auth.types';
import { PatientService } from '../services/patient.service';
import {
  createPatientSchema,
  updatePatientSchema,
  createMedicalHistorySchema,
} from '../validators/patient.validator';

export class PatientController {
  /**
   * Create a new patient profile.
   */
  static async createPatient(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createPatientSchema.safeParse(req.body);
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

      const patient = await PatientService.createPatient(
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Patient profile created successfully',
        data: patient,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('already exists')) {
        return res.status(409).json({ error: 'Conflict', message });
      }
      console.error('Error in createPatient:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create patient profile' });
    }
  }

  /**
   * Update an existing patient profile.
   */
  static async updatePatient(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Patient ID is required' });
      }

      const parsed = updatePatientSchema.safeParse(req.body);
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

      const patient = await PatientService.updatePatient(
        id,
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        message: 'Patient profile updated successfully',
        data: patient,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('already registered')) {
        return res.status(409).json({ error: 'Conflict', message });
      }
      console.error('Error in updatePatient:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update patient profile' });
    }
  }

  /**
   * Soft delete a patient profile.
   */
  static async softDeletePatient(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Patient ID is required' });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      await PatientService.softDeletePatient(id, actorUserId, ipAddress, userAgent);

      return res.status(200).json({
        message: 'Patient profile soft deleted successfully',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in softDeletePatient:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete patient profile' });
    }
  }

  /**
   * Retrieve a specific patient profile.
   */
  static async getPatientProfile(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Patient ID is required' });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      const patient = await PatientService.getPatientById(id, actorUserId, ipAddress, userAgent);

      return res.status(200).json({
        data: patient,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in getPatientProfile:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve patient profile' });
    }
  }

  /**
   * Retrieve patient list with pagination, search, and filters.
   */
  static async searchPatients(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { search, gender, bloodGroup, limit, offset } = req.query;

      const options = {
        search: search as string,
        gender: gender as string,
        bloodGroup: bloodGroup as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      };

      const result = await PatientService.queryPatients(options);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in searchPatients:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to query patients' });
    }
  }

  /**
   * Retrieve patient medical history (EMR).
   */
  static async getMedicalHistory(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params; // patient ID
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Patient ID is required' });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      const history = await PatientService.getMedicalHistory(id, actorUserId, ipAddress, userAgent);

      return res.status(200).json({
        data: history,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in getMedicalHistory:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve medical history' });
    }
  }

  /**
   * Add a diagnostic entry to the EMR.
   */
  static async addMedicalHistoryEntry(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params; // patient ID
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Patient ID is required' });
      }

      const parsed = createMedicalHistorySchema.safeParse(req.body);
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

      const entry = await PatientService.addMedicalHistoryEntry(
        id,
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Medical history entry added successfully',
        data: entry,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in addMedicalHistoryEntry:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to add medical history entry' });
    }
  }

  /**
   * Retrieve a chronological timeline of patient events (appointments and medical history).
   */
  static async getPatientTimeline(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params; // patient ID
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Patient ID is required' });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      const timeline = await PatientService.getPatientTimeline(
        id,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        data: timeline,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in getPatientTimeline:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve patient timeline' });
    }
  }
}
