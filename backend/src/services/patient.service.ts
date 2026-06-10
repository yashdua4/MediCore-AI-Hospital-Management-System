import prisma from '../config/prisma';
import { AuditService } from './audit.service';
import {
  PatientCreateInput,
  PatientUpdateInput,
  PatientResponse,
  PatientMedicalHistoryResponse,
  PatientMedicalHistoryCreateInput,
} from '../types/patient.types';

export class PatientService {
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
          resource: 'EMR',
          resourceId,
          action,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to log EMR data access:', error);
    }
  }

  /**
   * Create a new patient profile.
   */
  static async createPatient(
    data: PatientCreateInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PatientResponse> {
    const { address, emergencyContact, insuranceInfo, ...patientData } = data;

    // Check unique constraints
    const existingPhone = await prisma.patient.findUnique({ where: { phone: patientData.phone } });
    if (existingPhone) {
      throw new Error(`Patient with phone number '${patientData.phone}' already exists`);
    }

    if (patientData.email) {
      const existingEmail = await prisma.patient.findUnique({ where: { email: patientData.email } });
      if (existingEmail) {
        throw new Error(`Patient with email '${patientData.email}' already exists`);
      }
    }

    if (patientData.aadhaar) {
      const existingAadhaar = await prisma.patient.findUnique({ where: { aadhaar: patientData.aadhaar } });
      if (existingAadhaar) {
        throw new Error(`Patient with Aadhaar '${patientData.aadhaar}' already exists`);
      }
    }

    // Save transaction
    const patient = await prisma.patient.create({
      data: {
        ...patientData,
        address: address ? { create: address } : undefined,
        emergencyContact: emergencyContact ? { create: emergencyContact } : undefined,
        insuranceInfo: insuranceInfo ? { create: insuranceInfo } : undefined,
      },
      include: {
        address: true,
        emergencyContact: true,
        insuranceInfo: true,
      },
    });

    // Logging
    await AuditService.log(
      'PATIENT_UPDATE',
      'patient',
      `Created patient profile for '${patient.firstName} ${patient.lastName}' (${patient.id})`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return patient;
  }

  /**
   * Update an existing patient profile.
   */
  static async updatePatient(
    id: string,
    data: PatientUpdateInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PatientResponse> {
    const { address, emergencyContact, insuranceInfo, ...patientData } = data;

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient || patient.isDeleted) {
      throw new Error(`Patient with ID '${id}' not found`);
    }

    // Verify email/phone constraints on modification
    if (patientData.phone && patientData.phone !== patient.phone) {
      const existingPhone = await prisma.patient.findUnique({ where: { phone: patientData.phone } });
      if (existingPhone) throw new Error('Phone number is already registered to another patient');
    }

    if (patientData.email && patientData.email !== patient.email) {
      const existingEmail = await prisma.patient.findUnique({ where: { email: patientData.email } });
      if (existingEmail) throw new Error('Email is already registered to another patient');
    }

    if (patientData.aadhaar && patientData.aadhaar !== patient.aadhaar) {
      const existingAadhaar = await prisma.patient.findUnique({ where: { aadhaar: patientData.aadhaar } });
      if (existingAadhaar) throw new Error('Aadhaar is already registered to another patient');
    }

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        ...patientData,
        address: address
          ? {
              upsert: {
                create: address,
                update: address,
              },
            }
          : undefined,
        emergencyContact: emergencyContact
          ? {
              upsert: {
                create: emergencyContact,
                update: emergencyContact,
              },
            }
          : undefined,
        insuranceInfo: insuranceInfo
          ? {
              upsert: {
                create: insuranceInfo,
                update: insuranceInfo,
              },
            }
          : undefined,
      },
      include: {
        address: true,
        emergencyContact: true,
        insuranceInfo: true,
      },
    });

    await AuditService.log(
      'PATIENT_UPDATE',
      'patient',
      `Updated patient profile for '${updated.firstName} ${updated.lastName}' (${updated.id})`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return updated;
  }

  /**
   * Soft delete a patient profile.
   */
  static async softDeletePatient(
    id: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PatientResponse> {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient || patient.isDeleted) {
      throw new Error(`Patient with ID '${id}' not found`);
    }

    const updated = await prisma.patient.update({
      where: { id },
      data: { isDeleted: true },
      include: {
        address: true,
        emergencyContact: true,
        insuranceInfo: true,
      },
    });

    await AuditService.log(
      'PATIENT_UPDATE',
      'patient',
      `Soft deleted patient profile for '${updated.firstName} ${updated.lastName}' (${updated.id})`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return updated;
  }

  /**
   * Retrieve patient profile by ID.
   * Logs view audit and compliance data access log.
   */
  static async getPatientById(
    id: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PatientResponse> {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        address: true,
        emergencyContact: true,
        insuranceInfo: true,
      },
    });

    if (!patient || patient.isDeleted) {
      throw new Error(`Patient with ID '${id}' not found`);
    }

    // Compliance Logging
    await AuditService.log(
      'PATIENT_VIEW',
      'patient',
      `Viewed patient profile for '${patient.firstName} ${patient.lastName}' (${patient.id})`,
      actorUserId,
      ipAddress,
      userAgent
    );

    await this.logDataAccess(actorUserId, id, 'READ', ipAddress, userAgent);

    return patient;
  }

  /**
   * Query patients with pagination, search, and filters.
   */
  static async queryPatients(options: {
    search?: string;
    gender?: string;
    bloodGroup?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ patients: PatientResponse[]; total: number }> {
    const { search, gender, bloodGroup, limit = 50, offset = 0 } = options;

    const where: any = {
      isDeleted: false,
    };

    if (gender) {
      where.gender = gender;
    }

    if (bloodGroup) {
      where.bloodGroup = bloodGroup;
    }

    if (search) {
      const searchLower = search.trim();
      where.OR = [
        { firstName: { contains: searchLower, mode: 'insensitive' } },
        { lastName: { contains: searchLower, mode: 'insensitive' } },
        { email: { contains: searchLower, mode: 'insensitive' } },
        { phone: { contains: searchLower } },
        { aadhaar: { contains: searchLower } },
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
        include: {
          address: true,
          emergencyContact: true,
          insuranceInfo: true,
        },
      }),
      prisma.patient.count({ where }),
    ]);

    return { patients, total };
  }

  /**
   * Retrieve patient's medical history (EMR).
   * Logs medical record access audit and compliance data access log.
   */
  static async getMedicalHistory(
    patientId: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PatientMedicalHistoryResponse[]> {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.isDeleted) {
      throw new Error(`Patient with ID '${patientId}' not found`);
    }

    const history = await prisma.patientMedicalHistory.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    // Logging EMR compliance reads
    await AuditService.log(
      'MEDICAL_RECORD_ACCESS',
      'medical_history',
      `Accessed medical history for patient '${patient.firstName} ${patient.lastName}' (${patientId})`,
      actorUserId,
      ipAddress,
      userAgent
    );

    await this.logDataAccess(actorUserId, patientId, 'READ', ipAddress, userAgent);

    return history;
  }

  /**
   * Add a new diagnostic entry to the patient's medical history.
   */
  static async addMedicalHistoryEntry(
    patientId: string,
    data: PatientMedicalHistoryCreateInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PatientMedicalHistoryResponse> {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.isDeleted) {
      throw new Error(`Patient with ID '${patientId}' not found`);
    }

    const entry = await prisma.patientMedicalHistory.create({
      data: {
        patientId,
        condition: data.condition,
        diagnosedDate: data.diagnosedDate,
        notes: data.notes,
        allergies: data.allergies,
        chronicConditions: data.chronicConditions,
      },
    });

    await AuditService.log(
      'MEDICAL_RECORD_ACCESS',
      'medical_history',
      `Added medical history entry for condition '${entry.condition}' to patient (${patientId})`,
      actorUserId,
      ipAddress,
      userAgent
    );

    await this.logDataAccess(actorUserId, patientId, 'READ', ipAddress, userAgent);

    return entry;
  }

  /**
   * Retrieve a chronological timeline of patient events (appointments and medical history).
   */
  static async getPatientTimeline(
    patientId: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any[]> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        appointments: {
          orderBy: { date: 'desc' },
        },
        medicalHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!patient || patient.isDeleted) {
      throw new Error(`Patient with ID '${patientId}' not found`);
    }

    const timeline: any[] = [];

    // Map medical history diagnostics to timeline events
    patient.medicalHistory.forEach((record) => {
      timeline.push({
        id: record.id,
        type: 'CLINICAL_RECORD',
        title: `Diagnosed: ${record.condition}`,
        date: record.diagnosedDate || record.createdAt,
        description: record.notes || 'No notes added.',
        metadata: {
          allergies: record.allergies,
          chronicConditions: record.chronicConditions,
        },
      });
    });

    // Map appointments to timeline events
    patient.appointments.forEach((appt) => {
      timeline.push({
        id: appt.id,
        type: 'APPOINTMENT',
        title: `Appointment scheduled`,
        date: appt.date,
        description: `Status: ${appt.status}. Time: ${appt.time}. Notes: ${appt.notes || 'No notes added.'}`,
        metadata: {
          doctorId: appt.doctorId,
          status: appt.status,
        },
      });
    });

    // Sort by date descending
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Logging
    await AuditService.log(
      'PATIENT_VIEW',
      'patient_timeline',
      `Accessed timeline history for patient '${patient.firstName} ${patient.lastName}' (${patientId})`,
      actorUserId,
      ipAddress,
      userAgent
    );

    await this.logDataAccess(actorUserId, patientId, 'READ', ipAddress, userAgent);

    return timeline;
  }
}
