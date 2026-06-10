import { Response } from 'express';
import { CustomRequest } from '../types/auth.types';
import { AppointmentService } from '../services/appointment.service';
import {
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  updateAppointmentStatusSchema,
  createAppointmentNoteSchema,
  createAppointmentAttachmentSchema,
} from '../validators/appointment.validator';
import { AppointmentStatus } from '@prisma/client';

export class AppointmentController {
  /**
   * Book a new appointment.
   */
  static async bookAppointment(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createAppointmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId || 'System';

      const appointment = await AppointmentService.bookAppointment(
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        message: 'Appointment booked successfully',
        data: appointment,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found') || message.includes('inactive')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('cannot be scheduled in the past') || message.includes('Operating Hours') || message.includes('falls outside') || message.includes('overlapping') || message.includes('Unauthorized')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in bookAppointment:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to book appointment' });
    }
  }

  /**
   * Reschedule an appointment.
   */
  static async rescheduleAppointment(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Appointment ID is required' });
      }

      const parsed = rescheduleAppointmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId || 'System';

      const appointment = await AppointmentService.rescheduleAppointment(
        id,
        parsed.data,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        message: 'Appointment rescheduled successfully',
        data: appointment,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('Cannot reschedule') || message.includes('falls outside') || message.includes('overlapping')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in rescheduleAppointment:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to reschedule appointment' });
    }
  }

  /**
   * Cancel an appointment.
   */
  static async cancelAppointment(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Appointment ID is required' });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId || 'System';

      const appointment = await AppointmentService.cancelAppointment(
        id,
        reason,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        message: 'Appointment cancelled successfully',
        data: appointment,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('Cannot cancel')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in cancelAppointment:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to cancel appointment' });
    }
  }

  /**
   * Update appointment status.
   */
  static async updateStatus(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Appointment ID is required' });
      }

      const parsed = updateAppointmentStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId || 'System';

      const appointment = await AppointmentService.updateAppointmentStatus(
        id,
        {
          status: parsed.data.status as AppointmentStatus,
          reason: parsed.data.reason,
        },
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        message: 'Appointment status updated successfully',
        data: appointment,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('Invalid status transition')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in updateStatus:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update status' });
    }
  }

  /**
   * Reassign doctor (Admin only).
   */
  static async reassignDoctor(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { doctorId } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Appointment ID is required' });
      }
      if (!doctorId) {
        return res.status(400).json({ error: 'Bad Request', message: 'New Doctor ID is required' });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId || 'System';

      const appointment = await AppointmentService.reassignDoctor(
        id,
        doctorId,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        message: 'Doctor reassigned successfully',
        data: appointment,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('Cannot reassign') || message.includes('overlapping') || message.includes('falls outside')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in reassignDoctor:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to reassign doctor' });
    }
  }

  /**
   * Query appointments.
   */
  static async getAppointments(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { patientId, doctorId, date, status, limit, offset } = req.query;

      const options = {
        patientId: patientId as string,
        doctorId: doctorId as string,
        date: date as string,
        status: status as AppointmentStatus,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      };

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      const result = await AppointmentService.getAppointments(
        options,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getAppointments:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch appointments' });
    }
  }

  /**
   * Retrieve specific appointment.
   */
  static async getAppointmentById(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Appointment ID is required' });
      }

      const list = await AppointmentService.getAppointments({ limit: 50 });
      const match = list.appointments.find((a) => a.id === id);

      if (!match) {
        return res.status(404).json({ error: 'Not Found', message: `Appointment with ID '${id}' not found` });
      }

      return res.status(200).json({ data: match });
    } catch (error) {
      console.error('Error in getAppointmentById:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch appointment details' });
    }
  }

  /**
   * Fetch daily schedule for doctor.
   */
  static async getDailySchedule(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { doctorId } = req.params;
      const { date } = req.query;
      if (!doctorId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Doctor ID is required' });
      }
      if (!date) {
        return res.status(400).json({ error: 'Bad Request', message: 'Date query param is required' });
      }

      const schedule = await AppointmentService.getDailySchedule(doctorId, date as string);
      return res.status(200).json({ data: schedule });
    } catch (error) {
      console.error('Error in getDailySchedule:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch schedule' });
    }
  }

  /**
   * Add note to appointment.
   */
  static async addNote(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Appointment ID is required' });
      }

      const parsed = createAppointmentNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const authorUserId = req.user?.userId || 'System';

      const note = await AppointmentService.addNote(id, parsed.data.content, authorUserId);
      return res.status(201).json({
        message: 'Note added successfully',
        data: note,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in addNote:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to add note' });
    }
  }

  /**
   * Add attachment to appointment.
   */
  static async addAttachment(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Appointment ID is required' });
      }

      const parsed = createAppointmentAttachmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const uploadedByUserId = req.user?.userId || 'System';

      const attachment = await AppointmentService.addAttachment(id, parsed.data, uploadedByUserId);
      return res.status(201).json({
        message: 'Attachment uploaded successfully',
        data: attachment,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in addAttachment:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to add attachment' });
    }
  }

  /**
   * Get appointment statistics.
   */
  static async getStatistics(_req: CustomRequest, res: Response): Promise<Response> {
    try {
      const stats = await AppointmentService.getStatistics();
      return res.status(200).json({ data: stats });
    } catch (error) {
      console.error('Error in getStatistics:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch statistics' });
    }
  }
}
