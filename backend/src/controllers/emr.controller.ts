import { Response } from 'express';
import { CustomRequest } from '../types/auth.types';
import { EMRService } from '../services/emr.service';
import {
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
  restoreEMRSchema,
  vitalSchema,
  allergySchema,
  conditionSchema,
  documentSchema,
} from '../validators/emr.validator';

export class EMRController {
  static async createMedicalRecord(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createMedicalRecordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const actorUserId = req.user?.userId || 'System';
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];

      const record = await EMRService.createMedicalRecord(
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Medical record created successfully',
        data: record,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in createMedicalRecord:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create medical record' });
    }
  }

  static async updateMedicalRecord(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Medical record ID is required' });
      }

      const parsed = updateMedicalRecordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const actorUserId = req.user?.userId || 'System';
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];

      const record = await EMRService.updateMedicalRecord(
        id,
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        message: 'Medical record updated successfully',
        data: record,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in updateMedicalRecord:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update medical record' });
    }
  }

  static async getMedicalRecordById(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Medical record ID is required' });
      }

      const actorUserId = req.user?.userId || 'System';
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];

      const record = await EMRService.getMedicalRecordById(id, actorUserId, ipAddress, userAgent);
      return res.status(200).json({ data: record });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in getMedicalRecordById:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch medical record' });
    }
  }

  static async getMedicalRecords(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { patientId, doctorId, limit, offset } = req.query;
      const options = {
        patientId: patientId as string,
        doctorId: doctorId as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      };

      const result = await EMRService.getMedicalRecords(options);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getMedicalRecords:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch medical records' });
    }
  }

  static async deleteMedicalRecord(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Medical record ID is required' });
      }

      const actorUserId = req.user?.userId || 'System';
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];

      await EMRService.deleteMedicalRecord(id, actorUserId, ipAddress, userAgent);

      return res.status(200).json({ message: 'Medical record soft deleted successfully' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in deleteMedicalRecord:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete medical record' });
    }
  }

  static async restoreVersion(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Medical record ID is required' });
      }

      const parsed = restoreEMRSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const actorUserId = req.user?.userId || 'System';
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];

      const record = await EMRService.restoreVersion(
        id,
        parsed.data.version,
        parsed.data.changeReason,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        message: `Medical record restored to version ${parsed.data.version} successfully`,
        data: record,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in restoreVersion:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to restore version' });
    }
  }

  static async getVersionLogs(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Medical record ID is required' });
      }

      const versions = await EMRService.getVersionLogs(id);
      return res.status(200).json({ data: versions });
    } catch (error) {
      console.error('Error in getVersionLogs:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch version logs' });
    }
  }

  static async getVersionDetails(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id, version } = req.params;
      if (!id || !version) {
        return res.status(400).json({ error: 'Bad Request', message: 'Medical record ID and version are required' });
      }

      const details = await EMRService.getVersionDetails(id, parseInt(version, 10));
      return res.status(200).json({ data: details });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in getVersionDetails:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch version details' });
    }
  }

  static async addVital(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { patientId } = req.body;
      if (!patientId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Patient ID is required' });
      }

      const parsed = vitalSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const actorUserId = req.user?.userId || 'System';
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];

      const vital = await EMRService.addVital(
        patientId,
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Patient vitals recorded successfully',
        data: vital,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in addVital:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to record vitals' });
    }
  }

  static async addDocument(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Medical record ID is required' });
      }

      const parsed = documentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const actorUserId = req.user?.userId || 'System';
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];

      const doc = await EMRService.addDocument(
        id,
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Document uploaded and linked successfully',
        data: doc,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in addDocument:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to link document' });
    }
  }

  static async getPatientTimeline(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { patientId } = req.params;
      if (!patientId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Patient ID is required' });
      }

      const actorUserId = req.user?.userId;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];

      const events = await EMRService.getPatientTimeline(
        patientId,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({ data: events });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in getPatientTimeline:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch patient timeline' });
    }
  }

  static async getPatientVitals(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { patientId } = req.params;
      if (!patientId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Patient ID is required' });
      }

      const result = await EMRService.getPatientVitals(patientId);
      return res.status(200).json({ data: result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in getPatientVitals:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch vitals trends' });
    }
  }

  static async getDiagnosisHistory(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { patientId } = req.params;
      if (!patientId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Patient ID is required' });
      }

      const history = await EMRService.getDiagnosisHistory(patientId);
      return res.status(200).json({ data: history });
    } catch (error) {
      console.error('Error in getDiagnosisHistory:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch diagnosis history' });
    }
  }

  static async getPrescriptionHistory(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { patientId } = req.params;
      if (!patientId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Patient ID is required' });
      }

      const history = await EMRService.getPrescriptionHistory(patientId);
      return res.status(200).json({ data: history });
    } catch (error) {
      console.error('Error in getPrescriptionHistory:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch prescription history' });
    }
  }

  static async addAllergy(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { patientId } = req.params;
      if (!patientId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Patient ID is required' });
      }

      const parsed = allergySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const allergy = await EMRService.addAllergy(patientId, parsed.data);
      return res.status(201).json({
        message: 'Allergy recorded successfully',
        data: allergy,
      });
    } catch (error) {
      console.error('Error in addAllergy:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to add allergy' });
    }
  }

  static async addCondition(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { patientId } = req.params;
      if (!patientId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Patient ID is required' });
      }

      const parsed = conditionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const condition = await EMRService.addCondition(patientId, parsed.data);
      return res.status(201).json({
        message: 'Condition recorded successfully',
        data: condition,
      });
    } catch (error) {
      console.error('Error in addCondition:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to add condition' });
    }
  }
}
