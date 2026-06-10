import { Response } from 'express';
import { CustomRequest } from '../types/auth.types';
import { DoctorService } from '../services/doctor.service';
import {
  createDoctorSchema,
  updateDoctorSchema,
  manageSchedulesSchema,
  createAvailabilitySchema,
} from '../validators/doctor.validator';

export class DoctorController {
  /**
   * Create a new doctor profile.
   */
  static async createDoctor(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createDoctorSchema.safeParse(req.body);
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

      const doctor = await DoctorService.createDoctor(
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Doctor profile created successfully',
        data: doctor,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('already exists')) {
        return res.status(409).json({ error: 'Conflict', message });
      }
      console.error('Error in createDoctor:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create doctor profile' });
    }
  }

  /**
   * Update an existing doctor profile.
   */
  static async updateDoctor(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Doctor ID is required' });
      }

      const parsed = updateDoctorSchema.safeParse(req.body);
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

      const doctor = await DoctorService.updateDoctor(
        id,
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        message: 'Doctor profile updated successfully',
        data: doctor,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('already registered')) {
        return res.status(409).json({ error: 'Conflict', message });
      }
      console.error('Error in updateDoctor:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update doctor profile' });
    }
  }

  /**
   * Soft delete a doctor profile.
   */
  static async softDeleteDoctor(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Doctor ID is required' });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      await DoctorService.softDeleteDoctor(id, actorUserId, ipAddress, userAgent);

      return res.status(200).json({
        message: 'Doctor profile soft deleted successfully',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in softDeleteDoctor:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete doctor profile' });
    }
  }

  /**
   * Retrieve a specific doctor profile.
   */
  static async getDoctorProfile(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Doctor ID is required' });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      const doctor = await DoctorService.getDoctorById(id, actorUserId, ipAddress, userAgent);

      return res.status(200).json({
        data: doctor,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in getDoctorProfile:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve doctor profile' });
    }
  }

  /**
   * Search doctors with pagination and filters.
   */
  static async searchDoctors(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { search, departmentId, specializationId, limit, offset } = req.query;

      const options = {
        search: search as string,
        departmentId: departmentId as string,
        specializationId: specializationId as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      };

      const result = await DoctorService.queryDoctors(options);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in searchDoctors:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to query doctors' });
    }
  }

  /**
   * Set weekly recurring schedules.
   */
  static async manageSchedules(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params; // doctor ID
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Doctor ID is required' });
      }

      const parsed = manageSchedulesSchema.safeParse(req.body);
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

      const updated = await DoctorService.manageSchedules(
        id,
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        message: 'Doctor schedules updated successfully',
        data: updated,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('Overlapping')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in manageSchedules:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update schedules' });
    }
  }

  /**
   * Add leave/unavailability.
   */
  static async addLeave(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params; // doctor ID
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Doctor ID is required' });
      }

      const parsed = createAvailabilitySchema.safeParse(req.body);
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

      const leave = await DoctorService.addLeave(
        id,
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Leave added successfully',
        data: leave,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('overlaps')) {
        return res.status(409).json({ error: 'Conflict', message });
      }
      console.error('Error in addLeave:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to add leave' });
    }
  }

  /**
   * Delete leave/unavailability.
   */
  static async removeLeave(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { leaveId } = req.params;
      if (!leaveId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Leave ID is required' });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      await DoctorService.removeLeave(leaveId, actorUserId, ipAddress, userAgent);

      return res.status(200).json({
        message: 'Leave removed successfully',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in removeLeave:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to remove leave' });
    }
  }

  /**
   * Retrieve availability for a given date.
   */
  static async getDoctorAvailability(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { date } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Doctor ID is required' });
      }
      if (!date) {
        return res.status(400).json({ error: 'Bad Request', message: 'Date query param is required (YYYY-MM-DD)' });
      }

      const availability = await DoctorService.getDoctorAvailability(id, date as string);

      return res.status(200).json({
        data: availability,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in getDoctorAvailability:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to query availability' });
    }
  }

  /**
   * Retrieve doctor statistics.
   */
  static async getDoctorStatistics(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Doctor ID is required' });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      const statistics = await DoctorService.getDoctorStatistics(
        id,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        data: statistics,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in getDoctorStatistics:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve statistics' });
    }
  }
}
