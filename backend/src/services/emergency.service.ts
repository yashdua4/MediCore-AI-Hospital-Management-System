import prisma from '../config/prisma';
import { AuditService } from './audit.service';
import {
  EmergencyCaseStatus,
  DoctorAssignmentStatus,
  TransferStatus,
  AlertStatus,
} from '@prisma/client';
import {
  CreateEmergencyCaseInput,
  TriageAssessmentInput,
  AssignDoctorInput,
  RespondAssignmentInput,
  CreateTreatmentInput,
  CreateProcedureInput,
  CreateTraumaCaseInput,
  InitiateTransferInput,
  TriggerAlertInput,
  CreateDispositionInput,
  LiveEmergencyDashboard,
  EmergencyAnalytics,
} from '../types/emergency.types';

export class EmergencyService {
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
    if (!userId) return;
    try {
      await prisma.dataAccessLog.create({
        data: {
          userId,
          resource: 'EMERGENCY_CASE',
          resourceId,
          action,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to log emergency data access:', error);
    }
  }

  /**
   * Helper to append to the EmergencyTimeline.
   */
  private static async addTimelineEvent(
    emergencyCaseId: string,
    event: string,
    description: string,
    performedById?: string
  ) {
    try {
      await prisma.emergencyTimeline.create({
        data: {
          emergencyCaseId,
          event,
          description,
          performedById: performedById || null,
        },
      });
    } catch (error) {
      console.error('Failed to log timeline event:', error);
    }
  }

  /**
   * Create a new Emergency Case.
   */
  static async createEmergencyCase(
    data: CreateEmergencyCaseInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const { patientId, arrivalMode, chiefComplaint } = data;

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.isDeleted) {
      throw new Error(`Patient with ID '${patientId}' not found`);
    }

    const caseNumber = `ER-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const emergencyCase = await prisma.emergencyCase.create({
      data: {
        caseNumber,
        patientId,
        arrivalMode,
        chiefComplaint,
        status: EmergencyCaseStatus.ARRIVED,
      },
      include: {
        patient: true,
      },
    });

    await this.addTimelineEvent(
      emergencyCase.id,
      'CASE_CREATED',
      `Emergency case opened. Arrival Mode: ${arrivalMode}. Chief Complaint: ${chiefComplaint}`,
      actorUserId
    );

    await AuditService.log(
      'EMERGENCY_CASE_CREATED',
      'EmergencyCase',
      `Emergency case ${caseNumber} created for patient ${patientId}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return emergencyCase;
  }

  /**
   * Get emergency case details by ID.
   */
  static async getEmergencyCaseById(
    id: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const emergencyCase = await prisma.emergencyCase.findUnique({
      where: { id },
      include: {
        patient: true,
        triageAssessment: {
          include: {
            triageNurse: {
              select: { id: true, email: true },
            },
          },
        },
        doctorAssignments: {
          include: {
            doctor: true,
          },
        },
        treatments: {
          include: {
            administeredBy: {
              select: { id: true, email: true },
            },
          },
        },
        procedures: {
          include: {
            performedBy: {
              select: { id: true, email: true },
            },
          },
        },
        traumaCase: {
          include: {
            traumaSurgeon: true,
          },
        },
        transfers: {
          include: {
            approvedBy: {
              select: { id: true, email: true },
            },
          },
        },
        alerts: {
          include: {
            triggeredBy: {
              select: { id: true, email: true },
            },
          },
        },
        timeline: {
          include: {
            performedBy: {
              select: { id: true, email: true },
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
        },
        disposition: {
          include: {
            disposedBy: {
              select: { id: true, email: true },
            },
          },
        },
      },
    });

    if (!emergencyCase) {
      throw new Error(`Emergency Case with ID '${id}' not found`);
    }

    await this.logDataAccess(actorUserId, id, 'READ', ipAddress, userAgent);

    return emergencyCase;
  }

  /**
   * Query emergency cases with optional filters.
   */
  static async queryEmergencyCases(filters: {
    status?: EmergencyCaseStatus;
    triageLevel?: any;
  }) {
    const where: any = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.triageLevel) {
      where.triageLevel = filters.triageLevel;
    }

    return prisma.emergencyCase.findMany({
      where,
      include: {
        patient: true,
        triageAssessment: true,
        doctorAssignments: {
          include: {
            doctor: true,
          },
        },
      },
      orderBy: {
        arrivalTime: 'desc',
      },
    });
  }

  /**
   * Add a Triage Assessment to an emergency case.
   */
  static async addTriageAssessment(
    caseId: string,
    data: TriageAssessmentInput,
    nurseUserId: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const emergencyCase = await prisma.emergencyCase.findUnique({ where: { id: caseId } });
    if (!emergencyCase) {
      throw new Error(`Emergency Case with ID '${caseId}' not found`);
    }

    const triage = await prisma.triageAssessment.create({
      data: {
        emergencyCaseId: caseId,
        triageLevel: data.triageLevel,
        chiefComplaint: data.chiefComplaint,
        symptoms: data.symptoms,
        systolicBP: data.systolicBP || null,
        diastolicBP: data.diastolicBP || null,
        heartRate: data.heartRate || null,
        temperature: data.temperature || null,
        respiratoryRate: data.respiratoryRate || null,
        oxygenSaturation: data.oxygenSaturation || null,
        triageNotes: data.triageNotes || null,
        triageNurseId: nurseUserId,
      },
    });

    // Update emergency case status and triage level
    await prisma.emergencyCase.update({
      where: { id: caseId },
      data: {
        triageLevel: data.triageLevel,
        status: EmergencyCaseStatus.TRIAGED,
      },
    });

    await this.addTimelineEvent(
      caseId,
      'TRIAGE_COMPLETED',
      `Triage assessment completed by nurse. Triage Level: ${data.triageLevel}`,
      actorUserId
    );

    await AuditService.log(
      'TRIAGE_COMPLETED',
      'TriageAssessment',
      `Triage assessment recorded for emergency case ${emergencyCase.caseNumber}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return triage;
  }

  /**
   * Assign a doctor to an emergency case.
   */
  static async assignDoctor(
    caseId: string,
    data: AssignDoctorInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const emergencyCase = await prisma.emergencyCase.findUnique({ where: { id: caseId } });
    if (!emergencyCase) {
      throw new Error(`Emergency Case with ID '${caseId}' not found`);
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } });
    if (!doctor || doctor.isDeleted) {
      throw new Error(`Doctor with ID '${data.doctorId}' not found`);
    }

    const assignment = await prisma.emergencyDoctorAssignment.create({
      data: {
        emergencyCaseId: caseId,
        doctorId: data.doctorId,
        role: data.role,
        status: DoctorAssignmentStatus.PENDING,
      },
      include: {
        doctor: true,
      },
    });

    await this.addTimelineEvent(
      caseId,
      'DOCTOR_ASSIGNED',
      `Doctor ${doctor.firstName} ${doctor.lastName} assigned as ${data.role}`,
      actorUserId
    );

    await AuditService.log(
      'DOCTOR_ASSIGNED',
      'EmergencyDoctorAssignment',
      `Doctor ${data.doctorId} assigned to emergency case ${emergencyCase.caseNumber}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return assignment;
  }

  /**
   * Accept/Reject doctor assignment.
   */
  static async respondAssignment(
    assignmentId: string,
    data: RespondAssignmentInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const assignment = await prisma.emergencyDoctorAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        doctor: true,
        emergencyCase: true,
      },
    });

    if (!assignment) {
      throw new Error(`Doctor assignment with ID '${assignmentId}' not found`);
    }

    const updated = await prisma.emergencyDoctorAssignment.update({
      where: { id: assignmentId },
      data: {
        status: data.status === 'ACCEPTED' ? DoctorAssignmentStatus.ACCEPTED : DoctorAssignmentStatus.REJECTED,
        respondedAt: new Date(),
        acceptedAt: data.status === 'ACCEPTED' ? new Date() : null,
      },
    });

    const docName = `${assignment.doctor.firstName} ${assignment.doctor.lastName}`;

    if (data.status === 'ACCEPTED') {
      await prisma.emergencyCase.update({
        where: { id: assignment.emergencyCaseId },
        data: { status: EmergencyCaseStatus.UNDER_TREATMENT },
      });

      await this.addTimelineEvent(
        assignment.emergencyCaseId,
        'DOCTOR_ACCEPTED',
        `Doctor ${docName} accepted assignment and patient is under active treatment`,
        actorUserId
      );
    } else {
      await this.addTimelineEvent(
        assignment.emergencyCaseId,
        'DOCTOR_REJECTED',
        `Doctor ${docName} declined assignment`,
        actorUserId
      );
    }

    await AuditService.log(
      'APPOINTMENT_UPDATE',
      'EmergencyDoctorAssignment',
      `Doctor assignment ${assignmentId} responded with ${data.status}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return updated;
  }

  /**
   * Record emergency treatment.
   */
  static async addTreatment(
    caseId: string,
    data: CreateTreatmentInput,
    staffUserId: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const emergencyCase = await prisma.emergencyCase.findUnique({ where: { id: caseId } });
    if (!emergencyCase) {
      throw new Error(`Emergency Case with ID '${caseId}' not found`);
    }

    const treatment = await prisma.emergencyTreatment.create({
      data: {
        emergencyCaseId: caseId,
        treatmentDescription: data.treatmentDescription,
        notes: data.notes || null,
        administeredById: staffUserId,
      },
    });

    await prisma.emergencyCase.update({
      where: { id: caseId },
      data: { status: EmergencyCaseStatus.UNDER_TREATMENT },
    });

    await this.addTimelineEvent(
      caseId,
      'TREATMENT_ADMINISTERED',
      `Treatment administered: ${data.treatmentDescription}`,
      actorUserId
    );

    await AuditService.log(
      'MEDICAL_RECORD_UPDATED',
      'EmergencyTreatment',
      `Treatment added to emergency case ${emergencyCase.caseNumber}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return treatment;
  }

  /**
   * Record emergency procedure.
   */
  static async addProcedure(
    caseId: string,
    data: CreateProcedureInput,
    staffUserId: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const emergencyCase = await prisma.emergencyCase.findUnique({ where: { id: caseId } });
    if (!emergencyCase) {
      throw new Error(`Emergency Case with ID '${caseId}' not found`);
    }

    const procedure = await prisma.emergencyProcedure.create({
      data: {
        emergencyCaseId: caseId,
        procedureType: data.procedureType,
        notes: data.notes || null,
        performedById: staffUserId,
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : null,
        outcome: data.outcome,
      },
    });

    await prisma.emergencyCase.update({
      where: { id: caseId },
      data: { status: EmergencyCaseStatus.UNDER_TREATMENT },
    });

    await this.addTimelineEvent(
      caseId,
      'PROCEDURE_PERFORMED',
      `Procedure performed: ${data.procedureType}. Outcome: ${data.outcome}`,
      actorUserId
    );

    await AuditService.log(
      'EMERGENCY_PROCEDURE_PERFORMED',
      'EmergencyProcedure',
      `Procedure ${data.procedureType} recorded for case ${emergencyCase.caseNumber}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return procedure;
  }

  /**
   * Create a Trauma Case profile linked to the emergency case.
   */
  static async createTraumaCase(
    caseId: string,
    data: CreateTraumaCaseInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const emergencyCase = await prisma.emergencyCase.findUnique({ where: { id: caseId } });
    if (!emergencyCase) {
      throw new Error(`Emergency Case with ID '${caseId}' not found`);
    }

    const traumaCase = await prisma.traumaCase.create({
      data: {
        emergencyCaseId: caseId,
        injuryMechanism: data.injuryMechanism,
        severityScore: data.severityScore || null,
        gcsScore: data.gcsScore || null,
        isMultiTrauma: data.isMultiTrauma || false,
        surgicalConsultationRequired: data.surgicalConsultationRequired || false,
        traumaSurgeonId: data.traumaSurgeonId || null,
      },
    });

    await this.addTimelineEvent(
      caseId,
      'TRAUMA_CASE_CREATED',
      `Trauma profile created. Injury Mechanism: ${data.injuryMechanism}. GCS: ${data.gcsScore || 'N/A'}. ISS: ${data.severityScore || 'N/A'}`,
      actorUserId
    );

    await AuditService.log(
      'MEDICAL_RECORD_CREATED',
      'TraumaCase',
      `Trauma case logged for emergency case ${emergencyCase.caseNumber}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return traumaCase;
  }

  /**
   * Initiate a patient transfer (ICU, Ward, External).
   */
  static async initiateTransfer(
    caseId: string,
    data: InitiateTransferInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const emergencyCase = await prisma.emergencyCase.findUnique({ where: { id: caseId } });
    if (!emergencyCase) {
      throw new Error(`Emergency Case with ID '${caseId}' not found`);
    }

    const transfer = await prisma.emergencyTransfer.create({
      data: {
        emergencyCaseId: caseId,
        transferType: data.transferType,
        reason: data.reason,
        destination: data.destination,
        approvedById: actorUserId,
        status: TransferStatus.PENDING,
      },
    });

    await this.addTimelineEvent(
      caseId,
      'TRANSFER_INITIATED',
      `Transfer initiated: ${data.transferType} to ${data.destination}`,
      actorUserId
    );

    await AuditService.log(
      'EMERGENCY_TRANSFER_INITIATED',
      'EmergencyTransfer',
      `Transfer to ${data.destination} proposed for case ${emergencyCase.caseNumber}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return transfer;
  }

  /**
   * Approve/Reject a patient transfer.
   */
  static async approveTransfer(
    transferId: string,
    status: 'APPROVED' | 'REJECTED',
    _approverUserId: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const transfer = await prisma.emergencyTransfer.findUnique({
      where: { id: transferId },
      include: { emergencyCase: true },
    });

    if (!transfer) {
      throw new Error(`Emergency transfer with ID '${transferId}' not found`);
    }

    const updated = await prisma.emergencyTransfer.update({
      where: { id: transferId },
      data: {
        status: status === 'APPROVED' ? TransferStatus.APPROVED : TransferStatus.REJECTED,
        completedAt: status === 'APPROVED' ? new Date() : null,
      },
    });

    if (status === 'APPROVED') {
      await prisma.emergencyCase.update({
        where: { id: transfer.emergencyCaseId },
        data: { status: EmergencyCaseStatus.DISPOSED },
      });

      await this.addTimelineEvent(
        transfer.emergencyCaseId,
        'TRANSFER_APPROVED',
        `Transfer approved by administrator. Patient dispatched to ${transfer.destination}`,
        actorUserId
      );
    } else {
      await this.addTimelineEvent(
        transfer.emergencyCaseId,
        'TRANSFER_REJECTED',
        `Transfer proposal rejected by administrator`,
        actorUserId
      );
    }

    await AuditService.log(
      'PATIENT_TRANSFERRED',
      'EmergencyTransfer',
      `Transfer proposal ${transferId} resolved with ${status}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return updated;
  }

  /**
   * Trigger critical Code Red medical alerts.
   */
  static async triggerAlert(
    caseId: string,
    data: TriggerAlertInput,
    triggeringUserId: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const emergencyCase = await prisma.emergencyCase.findUnique({ where: { id: caseId } });
    if (!emergencyCase) {
      throw new Error(`Emergency Case with ID '${caseId}' not found`);
    }

    const alert = await prisma.criticalAlert.create({
      data: {
        emergencyCaseId: caseId,
        alertType: data.alertType,
        triggeredById: triggeringUserId,
        status: AlertStatus.ACTIVE,
        notes: data.notes || null,
      },
    });

    await this.addTimelineEvent(
      caseId,
      'CRITICAL_ALERT_TRIGGERED',
      `CRITICAL ALERT TRIGGERED: ${data.alertType}. Notes: ${data.notes || 'None'}`,
      actorUserId
    );

    await AuditService.log(
      'CRITICAL_ALERT_TRIGGERED',
      'CriticalAlert',
      `Critical alert ${data.alertType} triggered for case ${emergencyCase.caseNumber}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return alert;
  }

  /**
   * Resolve an active critical alert.
   */
  static async resolveAlert(
    alertId: string,
    notes?: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const alert = await prisma.criticalAlert.findUnique({
      where: { id: alertId },
      include: { emergencyCase: true },
    });

    if (!alert) {
      throw new Error(`Critical Alert with ID '${alertId}' not found`);
    }

    const updated = await prisma.criticalAlert.update({
      where: { id: alertId },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date(),
        notes: notes ? (alert.notes ? `${alert.notes} | Resolution: ${notes}` : notes) : alert.notes,
      },
    });

    await this.addTimelineEvent(
      alert.emergencyCaseId,
      'CRITICAL_ALERT_RESOLVED',
      `Critical alert resolved: ${alert.alertType}. Notes: ${notes || 'None'}`,
      actorUserId
    );

    await AuditService.log(
      'CRITICAL_ALERT_TRIGGERED',
      'CriticalAlert',
      `Critical alert ${alert.alertType} resolved for case ${alert.emergencyCase.caseNumber}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return updated;
  }

  /**
   * Create emergency case disposition (final discharge, admission, etc.).
   */
  static async createDisposition(
    caseId: string,
    data: CreateDispositionInput,
    disposedById: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const emergencyCase = await prisma.emergencyCase.findUnique({ where: { id: caseId } });
    if (!emergencyCase) {
      throw new Error(`Emergency Case with ID '${caseId}' not found`);
    }

    const disposition = await prisma.emergencyDisposition.create({
      data: {
        emergencyCaseId: caseId,
        outcome: data.outcome,
        notes: data.notes || null,
        disposedById,
      },
    });

    // Update case status to CLOSED
    await prisma.emergencyCase.update({
      where: { id: caseId },
      data: {
        status: EmergencyCaseStatus.CLOSED,
      },
    });

    await this.addTimelineEvent(
      caseId,
      'CASE_CLOSED',
      `Disposition completed: ${data.outcome}. Notes: ${data.notes || 'None'}`,
      actorUserId
    );

    await AuditService.log(
      'CASE_CLOSED',
      'EmergencyDisposition',
      `Disposition ${data.outcome} recorded for case ${emergencyCase.caseNumber}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return disposition;
  }

  /**
   * Fetch Live Emergency Dashboard Metrics.
   */
  static async getLiveDashboard(): Promise<LiveEmergencyDashboard> {
    const activeCases = await prisma.emergencyCase.findMany({
      where: {
        status: {
          notIn: [EmergencyCaseStatus.CLOSED, EmergencyCaseStatus.DISPOSED],
        },
      },
      include: {
        patient: true,
      },
      orderBy: {
        arrivalTime: 'desc',
      },
    });

    const activeCasesCount = activeCases.length;

    // Calculate cases by triage level
    const casesByTriage = {
      LEVEL_1_CRITICAL: 0,
      LEVEL_2_EMERGENCY: 0,
      LEVEL_3_URGENT: 0,
      LEVEL_4_SEMI_URGENT: 0,
      LEVEL_5_NON_URGENT: 0,
    };

    activeCases.forEach((c) => {
      if (c.triageLevel && c.triageLevel in casesByTriage) {
        casesByTriage[c.triageLevel as keyof typeof casesByTriage]++;
      }
    });

    // Triage queue mapper
    const triageQueue = activeCases.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      patientId: c.patientId,
      patientName: `${c.patient.firstName} ${c.patient.lastName}`,
      arrivalTime: c.arrivalTime,
      chiefComplaint: c.chiefComplaint,
      triageLevel: c.triageLevel as any,
      status: c.status,
    }));

    // Active critical alerts
    const alerts = await prisma.criticalAlert.findMany({
      where: {
        status: AlertStatus.ACTIVE,
      },
      include: {
        emergencyCase: {
          include: {
            patient: true,
          },
        },
      },
      orderBy: {
        triggeredAt: 'desc',
      },
    });

    const activeAlerts = alerts.map((a) => ({
      id: a.id,
      caseNumber: a.emergencyCase.caseNumber,
      patientName: `${a.emergencyCase.patient.firstName} ${a.emergencyCase.patient.lastName}`,
      alertType: a.alertType,
      triggeredAt: a.triggeredAt,
      notes: a.notes,
    }));

    return {
      activeCasesCount,
      casesByTriage,
      triageQueue,
      activeAlerts,
    };
  }

  /**
   * Fetch Emergency Analytics.
   */
  static async getAnalytics(): Promise<EmergencyAnalytics> {
    const traumaVolume = await prisma.traumaCase.count();

    const dispositions = await prisma.emergencyDisposition.findMany();
    const outcomeMetrics = {
      DISCHARGED: 0,
      ADMITTED: 0,
      TRANSFERRED: 0,
      DECEASED: 0,
      LEFT_AGAINST_MEDICAL_ADVICE: 0,
    };

    dispositions.forEach((d) => {
      if (d.outcome in outcomeMetrics) {
        outcomeMetrics[d.outcome as keyof typeof outcomeMetrics]++;
      }
    });

    const doctorAssignments = await prisma.emergencyDoctorAssignment.findMany({
      where: {
        respondedAt: { not: null },
      },
    });

    let totalResponseDiffMs = 0;
    let assignmentCount = 0;

    doctorAssignments.forEach((a) => {
      if (a.respondedAt) {
        totalResponseDiffMs += a.respondedAt.getTime() - a.assignedAt.getTime();
        assignmentCount++;
      }
    });

    const averageResponseTimeMinutes = assignmentCount > 0
      ? Number((totalResponseDiffMs / (1000 * 60 * assignmentCount)).toFixed(1))
      : 15;

    const closedCases = await prisma.emergencyCase.findMany({
      where: {
        status: EmergencyCaseStatus.CLOSED,
        disposition: { isNot: null },
      },
      include: {
        disposition: true,
      },
    });

    let totalThroughputDiffMs = 0;
    let closedCount = 0;

    closedCases.forEach((c) => {
      if (c.disposition) {
        totalThroughputDiffMs += c.disposition.disposedAt.getTime() - c.arrivalTime.getTime();
        closedCount++;
      }
    });

    const averageThroughputTimeMinutes = closedCount > 0
      ? Number((totalThroughputDiffMs / (1000 * 60 * closedCount)).toFixed(1))
      : 120;

    return {
      averageResponseTimeMinutes,
      averageThroughputTimeMinutes,
      outcomeMetrics,
      traumaVolume,
    };
  }
}
