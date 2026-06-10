import prisma from '../config/prisma';
import { AuditService } from './audit.service';
import {
  CreateWardInput,
  CreateRoomInput,
  CreateBedInput,
  AdmitPatientInput,
  TransferPatientInput,
  AssignNurseInput,
  CreateNoteInput,
  DischargePatientInput,
  AddChargeInput,
  IPDTelemetryDashboard,
} from '../types/ipd.types';
import { Prisma } from '@prisma/client';

export class IpdService {
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
          resource: 'IPD',
          resourceId,
          action,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to log IPD data access:', error);
    }
  }

  /**
   * Catalog creation Wards.
   */
  static async createWard(data: CreateWardInput) {
    const existing = await prisma.ward.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new Error(`Ward with name '${data.name}' already exists`);
    }

    return await prisma.ward.create({
      data,
    });
  }

  /**
   * Catalog creation Rooms.
   */
  static async createRoom(data: CreateRoomInput) {
    const existing = await prisma.room.findUnique({
      where: { roomNumber: data.roomNumber },
    });
    if (existing) {
      throw new Error(`Room with number '${data.roomNumber}' already exists`);
    }

    const ward = await prisma.ward.findUnique({
      where: { id: data.wardId },
    });
    if (!ward) {
      throw new Error(`Ward with ID '${data.wardId}' not found`);
    }

    return await prisma.room.create({
      data: {
        roomNumber: data.roomNumber,
        wardId: data.wardId,
        roomType: data.roomType,
        chargesPerDay: new Prisma.Decimal(data.chargesPerDay),
        status: 'AVAILABLE',
      },
    });
  }

  /**
   * Catalog creation Beds.
   */
  static async createBed(data: CreateBedInput) {
    const existing = await prisma.bed.findUnique({
      where: { bedNumber: data.bedNumber },
    });
    if (existing) {
      throw new Error(`Bed with number '${data.bedNumber}' already exists`);
    }

    const room = await prisma.room.findUnique({
      where: { id: data.roomId },
    });
    if (!room) {
      throw new Error(`Room with ID '${data.roomId}' not found`);
    }

    return await prisma.bed.create({
      data: {
        bedNumber: data.bedNumber,
        roomId: data.roomId,
        status: 'AVAILABLE',
      },
    });
  }

  /**
   * Admit a Patient.
   */
  static async admitPatient(
    data: AdmitPatientInput,
    actorUserId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    // 1. Verify Patient & Doctor exist
    const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
    if (!patient) throw new Error(`Patient with ID '${data.patientId}' not found`);

    const doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } });
    if (!doctor) throw new Error(`Doctor with ID '${data.doctorId}' not found`);

    // 2. Check active admission
    const activeAdmiss = await prisma.admission.findFirst({
      where: { patientId: data.patientId, status: 'ADMITTED' },
    });
    if (activeAdmiss) {
      throw new Error(`Patient is already admitted under active admission '${activeAdmiss.admissionNumber}'`);
    }

    // 3. Verify Bed is available
    const bed = await prisma.bed.findUnique({
      where: { id: data.bedId },
      include: { room: true },
    });
    if (!bed) throw new Error(`Bed with ID '${data.bedId}' not found`);
    if (bed.status !== 'AVAILABLE') {
      throw new Error(`Bed with number '${bed.bedNumber}' is not available (Current status: ${bed.status})`);
    }

    const admissionNumber = `ADM-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await prisma.$transaction(async (tx) => {
      // Create admission
      const admission = await tx.admission.create({
        data: {
          admissionNumber,
          patientId: data.patientId,
          doctorId: data.doctorId,
          status: 'ADMITTED',
          reason: data.reason,
        },
      });

      // Create bed assignment
      await tx.bedAssignment.create({
        data: {
          admissionId: admission.id,
          bedId: data.bedId,
          status: 'ACTIVE',
        },
      });

      // Mark bed occupied
      await tx.bed.update({
        where: { id: data.bedId },
        data: { status: 'OCCUPIED' },
      });

      // Increment ward occupancy
      await tx.ward.update({
        where: { id: bed.room.wardId },
        data: { occupancy: { increment: 1 } },
      });

      return admission;
    });

    await AuditService.log(
      'PATIENT_ADMITTED',
      'Admission',
      `Patient ${patient.firstName} ${patient.lastName} admitted under ADM ${result.admissionNumber}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    await AuditService.log(
      'BED_ASSIGNED',
      'Bed',
      `Assigned bed ${bed.bedNumber} to admission ${result.admissionNumber}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return result;
  }

  /**
   * Transfer a Patient.
   */
  static async transferPatient(
    admissionId: string,
    data: TransferPatientInput,
    actorUserId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
    });
    if (!admission) throw new Error(`Admission with ID '${admissionId}' not found`);
    if (admission.status !== 'ADMITTED') {
      throw new Error(`Cannot transfer patient in a ${admission.status} admission status`);
    }

    // Target bed
    const targetBed = await prisma.bed.findUnique({
      where: { id: data.targetBedId },
      include: { room: true },
    });
    if (!targetBed) throw new Error(`Target bed with ID '${data.targetBedId}' not found`);
    if (targetBed.status !== 'AVAILABLE') {
      throw new Error(`Target bed ${targetBed.bedNumber} is not available`);
    }

    // Active assignment
    const activeAssignment = await prisma.bedAssignment.findFirst({
      where: { admissionId, status: 'ACTIVE' },
      include: { bed: { include: { room: true } } },
    });
    if (!activeAssignment) {
      throw new Error(`Active bed assignment not found for admission ${admissionId}`);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Release current assignment
      await tx.bedAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          releasedAt: new Date(),
          status: 'RELEASED',
        },
      });

      await tx.bed.update({
        where: { id: activeAssignment.bedId },
        data: { status: 'AVAILABLE' },
      });

      // 2. Assign new bed
      await tx.bedAssignment.create({
        data: {
          admissionId,
          bedId: data.targetBedId,
          status: 'ACTIVE',
        },
      });

      await tx.bed.update({
        where: { id: data.targetBedId },
        data: { status: 'OCCUPIED' },
      });

      // 3. Log Transfer
      const transfer = await tx.patientTransfer.create({
        data: {
          admissionId,
          fromBedId: activeAssignment.bedId,
          toBedId: data.targetBedId,
          transferReason: data.reason,
          approvedById: actorUserId,
        },
      });

      // 4. Update Ward Occupancies if wards are different
      if (activeAssignment.bed.room.wardId !== targetBed.room.wardId) {
        await tx.ward.update({
          where: { id: activeAssignment.bed.room.wardId },
          data: { occupancy: { decrement: 1 } },
        });

        await tx.ward.update({
          where: { id: targetBed.room.wardId },
          data: { occupancy: { increment: 1 } },
        });
      }

      return transfer;
    });

    await AuditService.log(
      'PATIENT_TRANSFERRED',
      'PatientTransfer',
      `Patient transferred from bed ${activeAssignment.bed.bedNumber} to bed ${targetBed.bedNumber}. Reason: ${data.reason}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return result;
  }

  /**
   * Log Daily care charge (auto registers onto Patient Draft Invoice).
   */
  static async logAdmissionCharge(admissionId: string, data: AddChargeInput) {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
    });
    if (!admission) throw new Error(`Admission with ID '${admissionId}' not found`);

    const amount = new Prisma.Decimal(data.amount);
    const qty = data.quantity || 1;
    const total = Number(data.amount) * qty;

    const result = await prisma.$transaction(async (tx) => {
      // Check for an active DRAFT invoice
      let invoice = await tx.invoice.findFirst({
        where: { patientId: admission.patientId, status: 'DRAFT' },
      });

      if (!invoice) {
        // Create a new DRAFT invoice
        const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            patientId: admission.patientId,
            status: 'DRAFT',
            subTotal: new Prisma.Decimal(0),
            taxAmount: new Prisma.Decimal(0),
            totalAmount: new Prisma.Decimal(0),
            outstandingAmount: new Prisma.Decimal(0),
          },
        });
      }

      const itemType = data.chargeType === 'ROOM' ? 'ROOM' : data.chargeType === 'BED' ? 'ROOM' : 'ADMISSION';
      const invoiceItem = await tx.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          description: `${data.description} (${data.chargeType})`,
          quantity: qty,
          unitPrice: amount,
          totalPrice: new Prisma.Decimal(total),
          itemType,
        },
      });

      // Update invoice totals
      const allItems = await tx.invoiceItem.findMany({
        where: { invoiceId: invoice.id },
      });

      const subTotal = allItems.reduce((sum, item) => sum + item.totalPrice.toNumber(), 0);
      const taxAmount = parseFloat((subTotal * 0.18).toFixed(2));
      const totalAmount = parseFloat((subTotal + taxAmount).toFixed(2));

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          subTotal: new Prisma.Decimal(subTotal),
          taxAmount: new Prisma.Decimal(taxAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          outstandingAmount: new Prisma.Decimal(totalAmount),
        },
      });

      // Create admission charge
      const charge = await tx.admissionCharge.create({
        data: {
          admissionId,
          chargeType: data.chargeType,
          amount,
          quantity: qty,
          description: data.description,
          invoiceItemId: invoiceItem.id,
        },
      });

      return charge;
    });

    return result;
  }

  /**
   * Assign Nurse.
   */
  static async assignNurse(
    admissionId: string,
    data: AssignNurseInput,
    actorUserId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const admission = await prisma.admission.findUnique({ where: { id: admissionId } });
    if (!admission) throw new Error(`Admission with ID '${admissionId}' not found`);

    const ward = await prisma.ward.findUnique({ where: { id: data.wardId } });
    if (!ward) throw new Error(`Ward with ID '${data.wardId}' not found`);

    const nurse = await prisma.user.findUnique({
      where: { id: data.nurseId },
      include: { roles: { include: { role: true } } },
    });
    if (!nurse) throw new Error(`Nurse with user ID '${data.nurseId}' not found`);

    const assignment = await prisma.nursingAssignment.create({
      data: {
        admissionId,
        nurseId: data.nurseId,
        wardId: data.wardId,
        shiftStart: new Date(data.shiftStart),
        shiftEnd: new Date(data.shiftEnd),
        notes: data.notes || null,
      },
    });

    await AuditService.log(
      'NURSE_ASSIGNED',
      'NursingAssignment',
      `Nurse assigned to patient admission shift`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return assignment;
  }

  /**
   * Add Admission Note.
   */
  static async createAdmissionNote(admissionId: string, authorId: string, data: CreateNoteInput) {
    const admission = await prisma.admission.findUnique({ where: { id: admissionId } });
    if (!admission) throw new Error(`Admission with ID '${admissionId}' not found`);

    return await prisma.admissionNote.create({
      data: {
        admissionId,
        authorId,
        noteType: data.noteType,
        content: data.content,
      },
    });
  }

  /**
   * Discharge Patient & release bed locks.
   */
  static async dischargePatient(
    admissionId: string,
    data: DischargePatientInput,
    actorUserId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
    });
    if (!admission) throw new Error(`Admission with ID '${admissionId}' not found`);
    if (admission.status === 'DISCHARGED') {
      throw new Error(`Patient is already discharged from admission ${admission.admissionNumber}`);
    }

    // Active bed assignment
    const activeAssignment = await prisma.bedAssignment.findFirst({
      where: { admissionId, status: 'ACTIVE' },
      include: { bed: { include: { room: true } } },
    });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Release bed assignment
      if (activeAssignment) {
        await tx.bedAssignment.update({
          where: { id: activeAssignment.id },
          data: {
            releasedAt: new Date(),
            status: 'RELEASED',
          },
        });

        await tx.bed.update({
          where: { id: activeAssignment.bedId },
          data: { status: 'AVAILABLE' },
        });

        // Decrement ward occupancy
        await tx.ward.update({
          where: { id: activeAssignment.bed.room.wardId },
          data: { occupancy: { decrement: 1 } },
        });
      }

      // 2. Create Discharge Summary
      const summary = await tx.dischargeSummary.create({
        data: {
          admissionId,
          treatmentSummary: data.treatmentSummary,
          medicationInstructions: data.medicationInstructions,
          followUpInstructions: data.followUpInstructions,
          dischargeCondition: data.dischargeCondition,
          preparedById: actorUserId,
        },
      });

      // 3. Update Admission status
      const updatedAdmiss = await tx.admission.update({
        where: { id: admissionId },
        data: {
          status: 'DISCHARGED',
          dischargeDate: new Date(),
        },
      });

      return { updatedAdmiss, summary };
    });

    await AuditService.log('DISCHARGE_INITIATED', 'Admission', `Discharge summary logged for ADM ${admission.admissionNumber}`, actorUserId, ipAddress, userAgent);
    await AuditService.log('PATIENT_DISCHARGED', 'Admission', `Patient discharged from ADM ${admission.admissionNumber}`, actorUserId, ipAddress, userAgent);

    return result;
  }

  /**
   * Get telemetry dashboard.
   */
  static async getDashboardTelemetry(actorUserId?: string, ipAddress?: string, userAgent?: string): Promise<IPDTelemetryDashboard> {
    const [totalBeds, occupiedBeds, maintenanceBeds, availableBeds] = await Promise.all([
      prisma.bed.count(),
      prisma.bed.count({ where: { status: 'OCCUPIED' } }),
      prisma.bed.count({ where: { status: 'MAINTENANCE' } }),
      prisma.bed.count({ where: { status: 'AVAILABLE' } }),
    ]);

    const occupancyRate = totalBeds > 0 ? parseFloat(((occupiedBeds / totalBeds) * 100).toFixed(2)) : 0;

    const wards = await prisma.ward.findMany();
    const wardUtilization = wards.map((w) => ({
      wardId: w.id,
      wardName: w.name,
      wardType: w.type,
      capacity: w.capacity,
      occupancy: w.occupancy,
      utilizationRate: w.capacity > 0 ? parseFloat(((w.occupancy / w.capacity) * 100).toFixed(2)) : 0,
    }));

    const activeAdmissionsCount = await prisma.admission.count({
      where: { status: 'ADMITTED' },
    });

    // Daily admissions and discharges
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const dailyAdmissionsCount = await prisma.admission.count({
      where: { admissionDate: { gte: startOfToday } },
    });

    const dailyDischargesCount = await prisma.admission.count({
      where: { dischargeDate: { gte: startOfToday }, status: 'DISCHARGED' },
    });

    // Length of stay metrics (discharged admissions)
    const discharged = await prisma.admission.findMany({
      where: { status: 'DISCHARGED', dischargeDate: { not: null } },
      select: { admissionDate: true, dischargeDate: true },
    });

    let totalStayMs = 0;
    for (const d of discharged) {
      if (d.dischargeDate) {
        totalStayMs += d.dischargeDate.getTime() - d.admissionDate.getTime();
      }
    }
    const averageLengthOfStayDays =
      discharged.length > 0 ? parseFloat((totalStayMs / discharged.length / (24 * 60 * 60 * 1000)).toFixed(2)) : 0;

    // Readmission rate 30 days
    // Logic: Of the patients discharged in the last 60 days, how many were readmitted within 30 days of their discharge?
    const pastSixtyDays = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const recentDischarges = await prisma.admission.findMany({
      where: {
        status: 'DISCHARGED',
        dischargeDate: { gte: pastSixtyDays },
      },
      include: { patient: { include: { admissions: true } } },
    });

    let readmissionsCount = 0;
    for (const dis of recentDischarges) {
      if (!dis.dischargeDate) continue;
      const readmit = dis.patient.admissions.some(
        (adm) =>
          adm.id !== dis.id &&
          adm.admissionDate > dis.dischargeDate! &&
          adm.admissionDate.getTime() - dis.dischargeDate!.getTime() <= 30 * 24 * 60 * 60 * 1000
      );
      if (readmit) readmissionsCount++;
    }

    const readmissionRate30Days =
      recentDischarges.length > 0 ? parseFloat(((readmissionsCount / recentDischarges.length) * 100).toFixed(2)) : 0;

    if (actorUserId) {
      await this.logDataAccess(actorUserId, 'IPD_DASHBOARD', 'READ_TELEMETRY', ipAddress, userAgent);
    }

    return {
      occupancy: {
        totalBeds,
        occupiedBeds,
        availableBeds,
        maintenanceBeds,
        occupancyRate,
      },
      wardUtilization,
      activeAdmissionsCount,
      dailyAdmissionsCount,
      dailyDischargesCount,
      averageLengthOfStayDays,
      readmissionRate30Days,
    };
  }

  /**
   * Fetch active admissions (with patient and bed information).
   */
  static async getActiveAdmissions(actorUserId?: string, ipAddress?: string, userAgent?: string) {
    const admissions = await prisma.admission.findMany({
      where: { status: 'ADMITTED' },
      include: {
        patient: true,
        doctor: true,
        bedAssignments: {
          where: { status: 'ACTIVE' },
          include: { bed: { include: { room: { include: { ward: true } } } } },
        },
      },
      orderBy: { admissionDate: 'desc' },
    });

    if (actorUserId) {
      await this.logDataAccess(actorUserId, 'ACTIVE_ADMISSIONS', 'READ_LIST', ipAddress, userAgent);
    }

    return admissions;
  }

  /**
   * Fetch admission by ID.
   */
  static async getAdmissionById(id: string, actorUserId?: string, ipAddress?: string, userAgent?: string) {
    const admission = await prisma.admission.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        bedAssignments: { include: { bed: { include: { room: { include: { ward: true } } } } } },
        transfers: true,
        dischargeSummary: true,
        charges: true,
        nursingAssignments: { include: { nurse: true } },
        notes: { include: { author: true } },
      },
    });

    if (admission && actorUserId) {
      await this.logDataAccess(actorUserId, id, 'READ', ipAddress, userAgent);
    }

    return admission;
  }
}
