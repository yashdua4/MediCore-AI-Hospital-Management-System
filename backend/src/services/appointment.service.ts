import prisma from '../config/prisma';
import { AuditService } from './audit.service';
import { AppointmentStatus, RoleType } from '@prisma/client';
import {
  AppointmentCreateInput,
  AppointmentRescheduleInput,
  AppointmentStatusUpdateInput,
  AppointmentResponse,
  AppointmentStatisticsResponse,
} from '../types/appointment.types';

class NotificationService {
  static logNotification(type: string, details: string) {
    console.log(`[NOTIFICATION MOCK] [${type}] - ${details}`);
  }
}

export class AppointmentService {
  /**
   * Helper to write to DataAccessLog.
   */
  private static async logDataAccess(
    userId: string | undefined,
    resourceId: string,
    action: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    if (!userId) return; // DataAccessLog requires valid user ID
    try {
      await prisma.dataAccessLog.create({
        data: {
          userId,
          resource: 'appointment',
          resourceId,
          action,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to log appointment data access:', error);
    }
  }

  /**
   * Helper to combine Date and Time string (HH:MM) into a single Date object.
   */
  private static combineDateAndTime(date: Date | string, timeStr: string): Date {
    const baseDate = new Date(date);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      hours,
      minutes,
      0,
      0
    );
  }

  /**
   * Helper to convert "HH:MM" string to minutes from midnight.
   */
  private static timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * Helper to get a YYYY-MM-DD local date string from a Date object.
   */
  private static toLocalDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Perform comprehensive slot validations:
   * 1. No past dates.
   * 2. Hospital operating hours (08:00 - 20:00).
   * 3. Doctor weekly schedule blocks.
   * 4. Doctor unavailability leaves.
   * 5. Overlapping doctor appointments (double booking).
   */
  private static async validateSlot(
    doctorId: string,
    date: Date | string,
    time: string,
    duration: number,
    excludeApptId?: string
  ): Promise<Date> {
    const start = this.combineDateAndTime(date, time);

    // 1. No Past Appointments
    if (start.getTime() <= Date.now()) {
      throw new Error('Appointment cannot be scheduled in the past');
    }

    // 2. Hospital Operating Hours (08:00 - 20:00)
    const apptStartMins = this.timeToMinutes(time);
    const apptEndMins = apptStartMins + duration;

    if (apptStartMins < 8 * 60 || apptEndMins > 20 * 60) {
      throw new Error('Appointment must fall within hospital operating hours (08:00 - 20:00)');
    }

    // Retrieve Doctor including schedules/leaves
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        schedules: true,
        availabilities: true,
      },
    });

    if (!doctor || doctor.isDeleted) {
      throw new Error('Doctor not found or is currently inactive');
    }

    // 3. Doctor Leave/Unavailability Checks
    const dateOnlyStr = this.toLocalDateString(start);
    const leaves = doctor.availabilities.filter(
      (l) => this.toLocalDateString(new Date(l.date)) === dateOnlyStr
    );

    for (const leave of leaves) {
      if (leave.startTime === null && leave.endTime === null) {
        throw new Error('Doctor is unavailable on this date (Full day leave)');
      }

      if (leave.startTime && leave.endTime) {
        const leaveStartMins = this.timeToMinutes(leave.startTime);
        const leaveEndMins = this.timeToMinutes(leave.endTime);

        // Overlap: start1 < end2 && start2 < end1
        if (apptStartMins < leaveEndMins && leaveStartMins < apptEndMins) {
          throw new Error('Doctor is unavailable during the requested time slot (Partial leave)');
        }
      }
    }

    // 4. Weekly Working Hours Validation
    const dayOfWeek = start.getDay();
    const workingDays = doctor.schedules.filter((s) => s.dayOfWeek === dayOfWeek);

    if (workingDays.length === 0) {
      throw new Error('Doctor is not scheduled to work on this day');
    }

    let fitsWorkingBlock = false;
    for (const block of workingDays) {
      const blockStartMins = this.timeToMinutes(block.startTime);
      const blockEndMins = this.timeToMinutes(block.endTime);

      if (apptStartMins >= blockStartMins && apptEndMins <= blockEndMins) {
        fitsWorkingBlock = true;
        break;
      }
    }

    if (!fitsWorkingBlock) {
      throw new Error('Appointment slot falls outside the doctor scheduled working hours');
    }

    // 5. Double Booking Checks
    const startOfDay = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);

    const dayAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['REQUESTED', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION', 'RESCHEDULED'],
        },
        id: excludeApptId ? { not: excludeApptId } : undefined,
      },
    });

    for (const appt of dayAppointments) {
      const apptStartMs = appt.date.getTime();
      const apptEndMs = apptStartMs + appt.duration * 60 * 1000;

      const newStartMs = start.getTime();
      const newEndMs = newStartMs + duration * 60 * 1000;

      if (newStartMs < apptEndMs && apptStartMs < newEndMs) {
        throw new Error('Doctor already has an overlapping appointment during this time slot');
      }
    }

    return start;
  }

  /**
   * Book a new appointment.
   */
  static async bookAppointment(
    data: AppointmentCreateInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AppointmentResponse> {
    // Check Patient
    const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
    if (!patient || patient.isDeleted) {
      throw new Error('Patient not found or inactive');
    }

    // Enforce patient ownership for booking
    if (patient.userId && patient.userId !== actorUserId) {
      const actorRoles = await prisma.userRole.findMany({
        where: { userId: actorUserId },
        include: { role: true },
      });
      const isStaff = actorRoles.some((ur) =>
        ([RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.RECEPTIONIST] as RoleType[]).includes(ur.role.name)
      );
      if (!isStaff) {
        throw new Error('Unauthorized: Patient can only book appointments for themselves');
      }
    }

    const duration = data.duration || 30;

    // Validate slot
    const start = await this.validateSlot(data.doctorId, data.date, data.time, duration);

    // Create Appointment in transaction
    const appt = await prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          patientId: data.patientId,
          doctorId: data.doctorId,
          date: start,
          time: data.time,
          duration,
          status: AppointmentStatus.REQUESTED,
          notes: data.notes || null,
          statusHistory: {
            create: {
              status: AppointmentStatus.REQUESTED,
              changedBy: actorUserId,
              reason: 'Appointment booked initial request',
            },
          },
        },
        include: {
          patient: true,
          doctor: true,
        },
      });

      // Reminders scheduling (24h and 1h before trigger times)
      const nowMs = Date.now();
      const trigger24h = new Date(start.getTime() - 24 * 60 * 60 * 1000);
      const trigger1h = new Date(start.getTime() - 1 * 60 * 60 * 1000);

      if (trigger24h.getTime() > nowMs) {
        await tx.appointmentReminder.create({
          data: {
            appointmentId: created.id,
            type: 'EMAIL',
            triggerTime: trigger24h,
            status: 'PENDING',
          },
        });
      }

      if (trigger1h.getTime() > nowMs) {
        await tx.appointmentReminder.create({
          data: {
            appointmentId: created.id,
            type: 'SMS',
            triggerTime: trigger1h,
            status: 'PENDING',
          },
        });
      }

      return created;
    });

    await AuditService.log(
      'APPOINTMENT_CREATE',
      'appointment',
      `Booked appointment for patient ID '${data.patientId}' with doctor ID '${data.doctorId}' on ${start.toISOString()}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    NotificationService.logNotification(
      'APPOINTMENT_CREATED',
      `Notification sent to patient: Your appointment with Dr. ${appt.doctor.lastName} is requested for ${appt.date.toISOString()}.`
    );

    return appt;
  }

  /**
   * Reschedule an appointment.
   */
  static async rescheduleAppointment(
    id: string,
    data: AppointmentRescheduleInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AppointmentResponse> {
    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: { doctor: true, patient: true },
    });

    if (!appt) {
      throw new Error(`Appointment with ID '${id}' not found`);
    }

    if (appt.status === AppointmentStatus.COMPLETED || appt.status === AppointmentStatus.CANCELLED) {
      throw new Error(`Cannot reschedule an appointment in ${appt.status} status`);
    }

    const duration = data.duration || appt.duration;

    // Validate new slot
    const start = await this.validateSlot(appt.doctorId, data.date, data.time, duration, id);

    // Update appointment details and clear old reminders
    const updated = await prisma.$transaction(async (tx) => {
      // Clear old pending reminders
      await tx.appointmentReminder.deleteMany({
        where: { appointmentId: id, status: 'PENDING' },
      });

      const res = await tx.appointment.update({
        where: { id },
        data: {
          date: start,
          time: data.time,
          duration,
          status: AppointmentStatus.RESCHEDULED,
          statusHistory: {
            create: {
              status: AppointmentStatus.RESCHEDULED,
              changedBy: actorUserId,
              reason: data.reason || 'Appointment rescheduled by user',
            },
          },
        },
        include: {
          patient: true,
          doctor: true,
          statusHistory: true,
          reminders: true,
        },
      });

      // Schedule new reminders
      const nowMs = Date.now();
      const trigger24h = new Date(start.getTime() - 24 * 60 * 60 * 1000);
      const trigger1h = new Date(start.getTime() - 1 * 60 * 60 * 1000);

      if (trigger24h.getTime() > nowMs) {
        await tx.appointmentReminder.create({
          data: {
            appointmentId: id,
            type: 'EMAIL',
            triggerTime: trigger24h,
            status: 'PENDING',
          },
        });
      }

      if (trigger1h.getTime() > nowMs) {
        await tx.appointmentReminder.create({
          data: {
            appointmentId: id,
            type: 'SMS',
            triggerTime: trigger1h,
            status: 'PENDING',
          },
        });
      }

      return res;
    });

    await AuditService.log(
      'APPOINTMENT_RESCHEDULE',
      'appointment',
      `Rescheduled appointment ID '${id}' to ${start.toISOString()}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    NotificationService.logNotification(
      'APPOINTMENT_RESCHEDULED',
      `Notification sent to patient: Your appointment has been rescheduled to ${updated.date.toISOString()}.`
    );

    return updated as any;
  }

  /**
   * Cancel an appointment.
   */
  static async cancelAppointment(
    id: string,
    reason: string | undefined,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AppointmentResponse> {
    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: { doctor: true, patient: true },
    });

    if (!appt) {
      throw new Error(`Appointment with ID '${id}' not found`);
    }

    if (appt.status === AppointmentStatus.COMPLETED || appt.status === AppointmentStatus.CANCELLED) {
      throw new Error(`Cannot cancel a completed or already cancelled appointment`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Clear reminders
      await tx.appointmentReminder.deleteMany({
        where: { appointmentId: id, status: 'PENDING' },
      });

      return tx.appointment.update({
        where: { id },
        data: {
          status: AppointmentStatus.CANCELLED,
          statusHistory: {
            create: {
              status: AppointmentStatus.CANCELLED,
              changedBy: actorUserId,
              reason: reason || 'Cancelled by user',
            },
          },
        },
        include: {
          patient: true,
          doctor: true,
          statusHistory: true,
        },
      });
    });

    await AuditService.log(
      'APPOINTMENT_CANCEL',
      'appointment',
      `Cancelled appointment ID '${id}'`,
      actorUserId,
      ipAddress,
      userAgent
    );

    NotificationService.logNotification(
      'APPOINTMENT_CANCELLED',
      `Notification sent to patient: Your appointment on ${appt.date.toISOString()} has been cancelled.`
    );

    return updated as any;
  }

  /**
   * Update appointment status with flow validations.
   */
  static async updateAppointmentStatus(
    id: string,
    data: AppointmentStatusUpdateInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AppointmentResponse> {
    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: { doctor: true, patient: true },
    });

    if (!appt) {
      throw new Error(`Appointment with ID '${id}' not found`);
    }

    const currentStatus = appt.status;
    const newStatus = data.status;

    // Enforce transition rules
    const allowed: Record<AppointmentStatus, AppointmentStatus[]> = {
      [AppointmentStatus.REQUESTED]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
      [AppointmentStatus.CONFIRMED]: [
        AppointmentStatus.CHECKED_IN,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.RESCHEDULED,
        AppointmentStatus.NO_SHOW,
      ],
      [AppointmentStatus.CHECKED_IN]: [
        AppointmentStatus.IN_CONSULTATION,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      [AppointmentStatus.IN_CONSULTATION]: [AppointmentStatus.COMPLETED],
      [AppointmentStatus.RESCHEDULED]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
      [AppointmentStatus.CANCELLED]: [],
      [AppointmentStatus.NO_SHOW]: [],
      [AppointmentStatus.COMPLETED]: [],
    };

    if (!allowed[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: newStatus,
        statusHistory: {
          create: {
            status: newStatus,
            changedBy: actorUserId,
            reason: data.reason || `Status updated from ${currentStatus} to ${newStatus}`,
          },
        },
      },
      include: {
        patient: true,
        doctor: true,
        statusHistory: true,
      },
    });

    await AuditService.log(
      'APPOINTMENT_STATUS_CHANGE',
      'appointment',
      `Changed status of appointment ID '${id}' from ${currentStatus} to ${newStatus}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    if (newStatus === AppointmentStatus.CONFIRMED) {
      NotificationService.logNotification(
        'APPOINTMENT_CONFIRMED',
        `Notification sent to patient: Your appointment has been confirmed.`
      );
    }

    return updated as any;
  }

  /**
   * Reassign doctor to appointment (Admin only).
   */
  static async reassignDoctor(
    id: string,
    newDoctorId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AppointmentResponse> {
    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: { doctor: true, patient: true },
    });

    if (!appt) {
      throw new Error(`Appointment with ID '${id}' not found`);
    }

    if (appt.status === AppointmentStatus.COMPLETED || appt.status === AppointmentStatus.CANCELLED) {
      throw new Error(`Cannot reassign doctor for a completed or cancelled appointment`);
    }

    // Validate availability of new doctor for the existing time slot
    await this.validateSlot(newDoctorId, appt.date, appt.time, appt.duration, id);

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        doctorId: newDoctorId,
        statusHistory: {
          create: {
            status: appt.status,
            changedBy: actorUserId,
            reason: `Doctor reassigned from Dr. ${appt.doctor.lastName} to doctor ID '${newDoctorId}'`,
          },
        },
      },
      include: {
        patient: true,
        doctor: true,
        statusHistory: true,
      },
    });

    await AuditService.log(
      'APPOINTMENT_REASSIGN',
      'appointment',
      `Reassigned appointment ID '${id}' from doctor ID '${appt.doctorId}' to doctor ID '${newDoctorId}'`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return updated as any;
  }

  /**
   * Query appointments.
   */
  static async getAppointments(
    options: {
      patientId?: string;
      doctorId?: string;
      date?: string;
      status?: AppointmentStatus;
      limit?: number;
      offset?: number;
    },
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ appointments: AppointmentResponse[]; total: number }> {
    const { patientId, doctorId, date, status, limit = 50, offset = 0 } = options;

    const where: any = {};

    if (patientId) {
      where.patientId = patientId;
    }
    if (doctorId) {
      where.doctorId = doctorId;
    }
    if (status) {
      where.status = status;
    }
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { date: 'asc' },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, phone: true, email: true },
          },
          doctor: {
            select: { id: true, firstName: true, lastName: true, phone: true, licenseNumber: true },
          },
          statusHistory: true,
          reminders: true,
          appointmentNotes: true,
          attachments: true,
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    // DataAccessLog compliance logging for bulk fetches
    if (actorUserId) {
      await this.logDataAccess(actorUserId, 'BULK_QUERY', 'READ', ipAddress, userAgent);
    }

    return { appointments: appointments as any[], total };
  }

  /**
   * Retrieve doctor's daily schedule (appointments).
   */
  static async getDailySchedule(
    doctorId: string,
    dateString: string
  ): Promise<AppointmentResponse[]> {
    const targetDate = new Date(dateString);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: AppointmentStatus.CANCELLED,
        },
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        doctor: {
          select: { id: true, firstName: true, lastName: true, phone: true, licenseNumber: true },
        },
        appointmentNotes: true,
      },
      orderBy: { date: 'asc' },
    });

    return appointments as any[];
  }

  /**
   * Add a note to the appointment.
   */
  static async addNote(
    appointmentId: string,
    content: string,
    authorUserId: string
  ): Promise<any> {
    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt) {
      throw new Error(`Appointment with ID '${appointmentId}' not found`);
    }

    return prisma.appointmentNote.create({
      data: {
        appointmentId,
        authorId: authorUserId,
        content,
      },
    });
  }

  /**
   * Add attachment to appointment.
   */
  static async addAttachment(
    appointmentId: string,
    attachment: { fileName: string; fileUrl: string; fileType: string },
    uploadedByUserId: string
  ): Promise<any> {
    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt) {
      throw new Error(`Appointment with ID '${appointmentId}' not found`);
    }

    return prisma.appointmentAttachment.create({
      data: {
        appointmentId,
        uploadedById: uploadedByUserId,
        ...attachment,
      },
    });
  }

  /**
   * Fetch appointment stats.
   */
  static async getStatistics(): Promise<AppointmentStatisticsResponse> {
    const totalAppointments = await prisma.appointment.count();

    const statusGroups = await prisma.appointment.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    const byStatus = statusGroups.map((g) => ({
      status: g.status,
      count: g._count.id,
    }));

    const cancelledCount = byStatus.find((s) => s.status === AppointmentStatus.CANCELLED)?.count || 0;
    const noShowCount = byStatus.find((s) => s.status === AppointmentStatus.NO_SHOW)?.count || 0;

    const cancelledRate = totalAppointments > 0 ? Number(((cancelledCount / totalAppointments) * 100).toFixed(1)) : 0;
    const noShowRate = totalAppointments > 0 ? Number(((noShowCount / totalAppointments) * 100).toFixed(1)) : 0;

    // Count reassignments by parsing status history reasons containing "reassigned"
    const reassignmentCount = await prisma.appointmentStatusHistory.count({
      where: {
        reason: {
          contains: 'reassigned',
          mode: 'insensitive',
        },
      },
    });

    return {
      totalAppointments,
      byStatus,
      cancelledRate,
      noShowRate,
      reassignmentCount,
    };
  }
}
