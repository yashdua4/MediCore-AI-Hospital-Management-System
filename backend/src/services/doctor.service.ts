import prisma from '../config/prisma';
import { AuditService } from './audit.service';
import {
  DoctorCreateInput,
  DoctorUpdateInput,
  DoctorResponse,
  DoctorScheduleInput,
  DoctorAvailabilityInput,
  DoctorAvailabilityResponse,
  DoctorStatisticsResponse,
} from '../types/doctor.types';

export class DoctorService {
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
          resource: 'doctor',
          resourceId,
          action,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to log doctor data access:', error);
    }
  }

  /**
   * Helper to check time overlaps.
   */
  private static hasTimeOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    const [s1H, s1M] = start1.split(':').map(Number);
    const [e1H, e1M] = end1.split(':').map(Number);
    const [s2H, s2M] = start2.split(':').map(Number);
    const [e2H, e2M] = end2.split(':').map(Number);

    const start1Mins = s1H * 60 + s1M;
    const end1Mins = e1H * 60 + e1M;
    const start2Mins = s2H * 60 + s2M;
    const end2Mins = e2H * 60 + e2M;

    return start1Mins < end2Mins && start2Mins < end1Mins;
  }

  /**
   * Create a new doctor profile.
   */
  static async createDoctor(
    data: DoctorCreateInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<DoctorResponse> {
    // Unique check
    const existingPhone = await prisma.doctor.findUnique({ where: { phone: data.phone } });
    if (existingPhone) {
      throw new Error(`Doctor with phone number '${data.phone}' already exists`);
    }

    if (data.email) {
      const existingEmail = await prisma.doctor.findUnique({ where: { email: data.email } });
      if (existingEmail) {
        throw new Error(`Doctor with email '${data.email}' already exists`);
      }
    }

    const existingLicense = await prisma.doctor.findUnique({ where: { licenseNumber: data.licenseNumber } });
    if (existingLicense) {
      throw new Error(`Doctor with license number '${data.licenseNumber}' already exists`);
    }

    // Resolve department
    let finalDeptId = data.departmentId;
    if (!finalDeptId && data.departmentName) {
      const dept = await prisma.doctorDepartment.upsert({
        where: { name: data.departmentName },
        update: {},
        create: { name: data.departmentName },
      });
      finalDeptId = dept.id;
    }
    if (!finalDeptId) {
      throw new Error('Either departmentId or departmentName is required');
    }

    // Resolve specializations
    const specIds: string[] = [];
    if (data.specializationIds) {
      specIds.push(...data.specializationIds);
    }
    if (data.specializationNames) {
      for (const name of data.specializationNames) {
        const spec = await prisma.doctorSpecialization.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        specIds.push(spec.id);
      }
    }

    // Overlap checks for schedules if provided
    if (data.schedules && data.schedules.length > 0) {
      for (let i = 0; i < data.schedules.length; i++) {
        for (let j = i + 1; j < data.schedules.length; j++) {
          const s1 = data.schedules[i];
          const s2 = data.schedules[j];
          if (s1.dayOfWeek === s2.dayOfWeek) {
            if (this.hasTimeOverlap(s1.startTime, s1.endTime, s2.startTime, s2.endTime)) {
              throw new Error(`Overlapping schedules: ${s1.startTime}-${s1.endTime} and ${s2.startTime}-${s2.endTime} on day ${s1.dayOfWeek}`);
            }
          }
        }
      }
    }

    // Create doctor profile
    const doctor = await prisma.doctor.create({
      data: {
        userId: data.userId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        licenseNumber: data.licenseNumber,
        consultationFee: data.consultationFee,
        departmentId: finalDeptId,
        qualifications: data.qualifications
          ? { create: data.qualifications }
          : undefined,
        specializations: specIds.length > 0
          ? {
              create: specIds.map((id) => ({ specializationId: id })),
            }
          : undefined,
        schedules: data.schedules
          ? { create: data.schedules }
          : undefined,
      },
      include: {
        department: true,
        qualifications: true,
        specializations: {
          include: { specialization: true },
        },
        schedules: true,
      },
    });

    await AuditService.log(
      'DOCTOR_CREATE',
      'doctor',
      `Created doctor profile for '${doctor.firstName} ${doctor.lastName}' (${doctor.id})`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return doctor;
  }

  /**
   * Update doctor profile.
   */
  static async updateDoctor(
    id: string,
    data: DoctorUpdateInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<DoctorResponse> {
    const doctor = await prisma.doctor.findUnique({ where: { id } });
    if (!doctor || doctor.isDeleted) {
      throw new Error(`Doctor with ID '${id}' not found`);
    }

    // Unique checks
    if (data.phone && data.phone !== doctor.phone) {
      const existingPhone = await prisma.doctor.findUnique({ where: { phone: data.phone } });
      if (existingPhone) throw new Error('Phone number is already registered to another doctor');
    }
    if (data.email && data.email !== doctor.email) {
      const existingEmail = await prisma.doctor.findUnique({ where: { email: data.email } });
      if (existingEmail) throw new Error('Email is already registered to another doctor');
    }
    if (data.licenseNumber && data.licenseNumber !== doctor.licenseNumber) {
      const existingLicense = await prisma.doctor.findUnique({ where: { licenseNumber: data.licenseNumber } });
      if (existingLicense) throw new Error('License number is already registered to another doctor');
    }

    // Resolve department
    let finalDeptId = data.departmentId;
    if (!finalDeptId && data.departmentName) {
      const dept = await prisma.doctorDepartment.upsert({
        where: { name: data.departmentName },
        update: {},
        create: { name: data.departmentName },
      });
      finalDeptId = dept.id;
    }

    // Resolve specializations
    const specIds: string[] = [];
    if (data.specializationIds) {
      specIds.push(...data.specializationIds);
    }
    if (data.specializationNames) {
      for (const name of data.specializationNames) {
        const spec = await prisma.doctorSpecialization.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        specIds.push(spec.id);
      }
    }

    // Perform update in a transaction to safely update nested relations
    const updated = await prisma.$transaction(async (tx) => {
      // Qualifications replace if provided
      if (data.qualifications) {
        await tx.doctorQualification.deleteMany({ where: { doctorId: id } });
      }

      // Specializations replace if provided
      if (data.specializationIds || data.specializationNames) {
        await tx.doctorSpecializationMapping.deleteMany({ where: { doctorId: id } });
      }

      return tx.doctor.update({
        where: { id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          licenseNumber: data.licenseNumber,
          consultationFee: data.consultationFee,
          departmentId: finalDeptId,
          qualifications: data.qualifications
            ? { create: data.qualifications }
            : undefined,
          specializations: (data.specializationIds || data.specializationNames)
            ? {
                create: specIds.map((sid) => ({ specializationId: sid })),
              }
            : undefined,
        },
        include: {
          department: true,
          qualifications: true,
          specializations: {
            include: { specialization: true },
          },
          schedules: true,
        },
      });
    });

    await AuditService.log(
      'DOCTOR_UPDATE',
      'doctor',
      `Updated doctor profile for '${updated.firstName} ${updated.lastName}' (${updated.id})`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return updated;
  }

  /**
   * Soft delete a doctor profile.
   */
  static async softDeleteDoctor(
    id: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<DoctorResponse> {
    const doctor = await prisma.doctor.findUnique({ where: { id } });
    if (!doctor || doctor.isDeleted) {
      throw new Error(`Doctor with ID '${id}' not found`);
    }

    const updated = await prisma.doctor.update({
      where: { id },
      data: { isDeleted: true },
      include: {
        department: true,
        qualifications: true,
        specializations: {
          include: { specialization: true },
        },
        schedules: true,
      },
    });

    await AuditService.log(
      'DOCTOR_DELETE',
      'doctor',
      `Soft deleted doctor profile for '${updated.firstName} ${updated.lastName}' (${updated.id})`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return updated;
  }

  /**
   * Fetch doctor by ID.
   */
  static async getDoctorById(
    id: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<DoctorResponse> {
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        department: true,
        qualifications: true,
        specializations: {
          include: { specialization: true },
        },
        schedules: true,
        availabilities: true,
      },
    });

    if (!doctor || doctor.isDeleted) {
      throw new Error(`Doctor with ID '${id}' not found`);
    }

    // Access log compliance
    await AuditService.log(
      'DOCTOR_VIEW',
      'doctor',
      `Viewed doctor profile for '${doctor.firstName} ${doctor.lastName}' (${doctor.id})`,
      actorUserId,
      ipAddress,
      userAgent
    );

    await this.logDataAccess(actorUserId, id, 'READ', ipAddress, userAgent);

    return doctor;
  }

  /**
   * Search and filter doctors.
   */
  static async queryDoctors(options: {
    search?: string;
    departmentId?: string;
    specializationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ doctors: DoctorResponse[]; total: number }> {
    const { search, departmentId, specializationId, limit = 50, offset = 0 } = options;

    const where: any = {
      isDeleted: false,
    };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (specializationId) {
      where.specializations = {
        some: {
          specializationId,
        },
      };
    }

    if (search) {
      const searchLower = search.trim();
      where.OR = [
        { firstName: { contains: searchLower, mode: 'insensitive' } },
        { lastName: { contains: searchLower, mode: 'insensitive' } },
        { email: { contains: searchLower, mode: 'insensitive' } },
        { phone: { contains: searchLower } },
        { licenseNumber: { contains: searchLower, mode: 'insensitive' } },
        {
          department: {
            name: { contains: searchLower, mode: 'insensitive' },
          },
        },
        {
          specializations: {
            some: {
              specialization: {
                name: { contains: searchLower, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
        include: {
          department: true,
          qualifications: true,
          specializations: {
            include: { specialization: true },
          },
          schedules: true,
        },
      }),
      prisma.doctor.count({ where }),
    ]);

    return { doctors, total };
  }

  /**
   * Manage / set doctor's weekly schedules.
   */
  static async manageSchedules(
    doctorId: string,
    schedules: DoctorScheduleInput[],
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<DoctorScheduleInput[]> {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor || doctor.isDeleted) {
      throw new Error(`Doctor with ID '${doctorId}' not found`);
    }

    // Overlap checks within incoming payload
    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        const s1 = schedules[i];
        const s2 = schedules[j];
        if (s1.dayOfWeek === s2.dayOfWeek) {
          if (this.hasTimeOverlap(s1.startTime, s1.endTime, s2.startTime, s2.endTime)) {
            throw new Error(`Overlapping schedules: ${s1.startTime}-${s1.endTime} and ${s2.startTime}-${s2.endTime} on day ${s1.dayOfWeek}`);
          }
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      // Clear all existing schedules
      await tx.doctorSchedule.deleteMany({ where: { doctorId } });

      // Create new schedules
      if (schedules.length > 0) {
        await tx.doctorSchedule.createMany({
          data: schedules.map((s) => ({
            doctorId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        });
      }
    });

    await AuditService.log(
      'DOCTOR_SCHEDULE_UPDATE',
      'doctor_schedule',
      `Updated weekly schedules for doctor ID '${doctorId}'`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return schedules;
  }

  /**
   * Record a doctor's leave / unavailability date.
   */
  static async addLeave(
    doctorId: string,
    leave: DoctorAvailabilityInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<DoctorAvailabilityResponse> {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor || doctor.isDeleted) {
      throw new Error(`Doctor with ID '${doctorId}' not found`);
    }

    const leaveDate = new Date(leave.date);
    leaveDate.setHours(0, 0, 0, 0);

    // Overlap checks for leaves on the same day
    const existingLeaves = await prisma.doctorAvailability.findMany({
      where: { doctorId, date: leaveDate },
    });

    const newStart = leave.startTime || '00:00';
    const newEnd = leave.endTime || '23:59';

    for (const ex of existingLeaves) {
      const exStart = ex.startTime || '00:00';
      const exEnd = ex.endTime || '23:59';

      if (this.hasTimeOverlap(newStart, newEnd, exStart, exEnd)) {
        throw new Error(`An unavailability record already overlaps this time range on ${leave.date}`);
      }
    }

    const record = await prisma.doctorAvailability.create({
      data: {
        doctorId,
        date: leaveDate,
        startTime: leave.startTime || null,
        endTime: leave.endTime || null,
        reason: leave.reason || null,
      },
    });

    await AuditService.log(
      'DOCTOR_LEAVE_CREATE',
      'doctor_availability',
      `Added leave for doctor '${doctorId}' on ${leave.date} (${newStart}-${newEnd})`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return record;
  }

  /**
   * Delete a doctor's leave / unavailability record.
   */
  static async removeLeave(
    leaveId: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const leave = await prisma.doctorAvailability.findUnique({ where: { id: leaveId } });
    if (!leave) {
      throw new Error(`Leave record with ID '${leaveId}' not found`);
    }

    await prisma.doctorAvailability.delete({ where: { id: leaveId } });

    await AuditService.log(
      'DOCTOR_LEAVE_DELETE',
      'doctor_availability',
      `Removed leave ID '${leaveId}' for doctor '${leave.doctorId}'`,
      actorUserId,
      ipAddress,
      userAgent
    );
  }

  /**
   * Calculate doctor availability for a specific date.
   */
  static async getDoctorAvailability(
    doctorId: string,
    dateString: string
  ): Promise<{
    isAvailable: boolean;
    workingHours: { startTime: string; endTime: string }[];
    leaves: { startTime: string | null; endTime: string | null; reason: string | null }[];
  }> {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor || doctor.isDeleted) {
      throw new Error(`Doctor with ID '${doctorId}' not found`);
    }

    const targetDate = new Date(dateString);
    targetDate.setHours(0, 0, 0, 0);

    const dayOfWeek = targetDate.getDay();

    // Fetch recurring schedules and specific leaves
    const [schedules, leaves] = await Promise.all([
      prisma.doctorSchedule.findMany({
        where: { doctorId, dayOfWeek },
      }),
      prisma.doctorAvailability.findMany({
        where: { doctorId, date: targetDate },
      }),
    ]);

    // Check if there is a full-day leave
    const fullDayLeave = leaves.some((l) => l.startTime === null && l.endTime === null);
    if (fullDayLeave) {
      return {
        isAvailable: false,
        workingHours: [],
        leaves: leaves.map((l) => ({
          startTime: l.startTime,
          endTime: l.endTime,
          reason: l.reason,
        })),
      };
    }

    // Map scheduled working hours
    const workingHours = schedules.map((s) => ({
      startTime: s.startTime,
      endTime: s.endTime,
    }));

    return {
      isAvailable: workingHours.length > 0,
      workingHours,
      leaves: leaves.map((l) => ({
        startTime: l.startTime,
        endTime: l.endTime,
        reason: l.reason,
      })),
    };
  }

  /**
   * Compile doctor statistics.
   */
  static async getDoctorStatistics(
    doctorId: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<DoctorStatisticsResponse> {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { schedules: true },
    });
    if (!doctor || doctor.isDeleted) {
      throw new Error(`Doctor with ID '${doctorId}' not found`);
    }

    // Total appointments count
    const totalAppointments = await prisma.appointment.count({
      where: { doctorId },
    });

    // Grouped by status
    const statusGroups = await prisma.appointment.groupBy({
      by: ['status'],
      where: { doctorId },
      _count: {
        id: true,
      },
    });

    const appointmentsByStatus = statusGroups.map((g) => ({
      status: g.status,
      count: g._count.id,
    }));

    // Upcoming appointments count
    const upcomingAppointments = await prisma.appointment.count({
      where: {
        doctorId,
        date: {
          gte: new Date(),
        },
        status: {
          in: ['REQUESTED', 'CONFIRMED', 'CONSULTATION'],
        },
      },
    });

    // Calculate weekly working hours
    let totalMins = 0;
    doctor.schedules.forEach((s) => {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      totalMins += (eh * 60 + em) - (sh * 60 + sm);
    });
    const weeklyScheduleHours = Number((totalMins / 60).toFixed(1));

    // Audit compliance read logs
    await AuditService.log(
      'DOCTOR_VIEW',
      'doctor_statistics',
      `Accessed statistics for doctor '${doctor.firstName} ${doctor.lastName}' (${doctorId})`,
      actorUserId,
      ipAddress,
      userAgent
    );

    await this.logDataAccess(actorUserId, doctorId, 'READ', ipAddress, userAgent);

    return {
      doctorId,
      totalAppointments,
      appointmentsByStatus,
      upcomingAppointments,
      weeklyScheduleHours,
    };
  }
}
