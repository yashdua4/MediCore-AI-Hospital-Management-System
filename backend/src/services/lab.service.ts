import prisma from '../config/prisma';
import { AuditService } from './audit.service';
import {
  LabOrderCreateInput,
  LabTechnicianAssignmentInput,
  LabSampleCollectInput,
  LabResultEntryInput,
  LabInventoryItemInput,
  LabOrderResponse,
  LabDashboardMetricsResponse,
  CriticalResultAlert,
} from '../types/lab.types';

export class LabService {
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
          resource: 'LAB_REPORT',
          resourceId,
          action,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to log Lab Report data access:', error);
    }
  }

  /**
   * Helper to check if a user is a Patient and owns the record, or is the ordering Doctor, or has admin/pathologist roles.
   */
  private static async checkReportAccess(
    userId: string,
    labOrderId: string
  ): Promise<boolean> {
    // Fetch user with roles
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) return false;

    // Admin and Pathologist roles have full access
    const hasPrivilegedRole = user.roles.some((ur) =>
      ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'LAB_TECH'].includes(ur.role.name)
    );
    if (hasPrivilegedRole) return true;

    // Fetch the order details to verify patient/doctor ownership
    const order = await prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!order) return false;

    // If doctor, check if they are the ordering doctor
    if (order.doctor.userId === userId) return true;

    // If patient, check if they are the patient owner
    if (order.patient.userId === userId) return true;

    return false;
  }

  // --- CATALOG MANAGEMENT ---

  static async createCategory(name: string, description?: string) {
    return prisma.labTestCategory.create({
      data: { name, description },
    });
  }

  static async createLabTest(data: {
    categoryId: string;
    name: string;
    code: string;
    price: number;
    testType: string;
    description?: string;
  }) {
    return prisma.labTest.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        code: data.code,
        price: data.price,
        testType: data.testType,
        description: data.description,
      },
    });
  }

  static async createReferenceRange(data: {
    labTestId: string;
    parameter: string;
    gender: string;
    ageMin?: number;
    ageMax?: number;
    rangeMin: number;
    rangeMax: number;
    unit: string;
  }) {
    return prisma.labReferenceRange.create({
      data: {
        labTestId: data.labTestId,
        parameter: data.parameter,
        gender: data.gender,
        ageMin: data.ageMin,
        ageMax: data.ageMax,
        rangeMin: data.rangeMin,
        rangeMax: data.rangeMax,
        unit: data.unit,
      },
    });
  }

  // --- LAB ORDER WORKFLOW ---

  /**
   * Create a new lab order
   */
  static async createLabOrder(
    data: LabOrderCreateInput,
    userId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ): Promise<LabOrderResponse> {
    // Verify entities exist
    const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
    if (!patient) throw new Error(`Patient with ID '${data.patientId}' not found`);

    const doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } });
    if (!doctor) throw new Error(`Doctor with ID '${data.doctorId}' not found`);

    const labTest = await prisma.labTest.findUnique({ where: { id: data.labTestId } });
    if (!labTest) throw new Error(`LabTest with ID '${data.labTestId}' not found`);

    if (data.appointmentId) {
      const appointment = await prisma.appointment.findUnique({ where: { id: data.appointmentId } });
      if (!appointment) throw new Error(`Appointment with ID '${data.appointmentId}' not found`);
    }

    const order = await prisma.labOrder.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        appointmentId: data.appointmentId || null,
        labTestId: data.labTestId,
        priority: data.priority,
        status: 'ORDERED',
        clinicalNotes: data.clinicalNotes || null,
      },
      include: {
        labTest: true,
        samples: true,
        results: true,
        reports: true,
      },
    });

    await AuditService.log(
      'LAB_ORDER_CREATED',
      'LAB_ORDER',
      `Lab order created for test: ${labTest.name} (${labTest.code}). Priority: ${data.priority}`,
      userId,
      ipAddress,
      userAgent
    );

    return order;
  }

  /**
   * Update order status to RECEIVED
   */
  static async receiveOrder(
    orderId: string,
    userId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const order = await prisma.labOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(`Lab order with ID '${orderId}' not found`);

    const updated = await prisma.labOrder.update({
      where: { id: orderId },
      data: { status: 'RECEIVED' },
    });

    await AuditService.log(
      'APPOINTMENT_STATUS_CHANGE', // Reusing an existing action type if needed, or keeping it generic
      'LAB_ORDER',
      `Lab order status updated to RECEIVED`,
      userId,
      ipAddress,
      userAgent
    );

    return updated;
  }

  /**
   * Assign a technician to a lab order
   */
  static async assignTechnician(
    orderId: string,
    data: LabTechnicianAssignmentInput,
    userId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const order = await prisma.labOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(`Lab order with ID '${orderId}' not found`);

    // Verify technician exists and has correct role
    const techUser = await prisma.user.findUnique({
      where: { id: data.technicianId },
      include: { roles: { include: { role: true } } },
    });
    if (!techUser) throw new Error(`Technician user with ID '${data.technicianId}' not found`);
    const isTech = techUser.roles.some((r) => r.role.name === 'LAB_TECH' || r.role.name === 'SUPER_ADMIN' || r.role.name === 'HOSPITAL_ADMIN');
    if (!isTech) throw new Error('User is not authorized as a lab technician');

    // Create assignment
    const assignment = await prisma.labTechnicianAssignment.create({
      data: {
        labOrderId: orderId,
        technicianId: data.technicianId,
        status: 'ASSIGNED',
      },
    });

    // Automatically transition to RECEIVED if currently ORDERED
    if (order.status === 'ORDERED') {
      await prisma.labOrder.update({
        where: { id: orderId },
        data: { status: 'RECEIVED' },
      });
    }

    await AuditService.log(
      'PERMISSION_CHANGE', // Generic update log action type representation
      'LAB_ORDER',
      `Technician ${techUser.email} assigned to lab order ${orderId}`,
      userId,
      ipAddress,
      userAgent
    );

    return assignment;
  }

  /**
   * Collect sample for a lab order
   */
  static async collectSample(
    orderId: string,
    data: LabSampleCollectInput,
    userId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const order = await prisma.labOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(`Lab order with ID '${orderId}' not found`);

    const sample = await prisma.labSample.create({
      data: {
        labOrderId: orderId,
        sampleType: data.sampleType,
        collectedById: userId,
        status: 'COLLECTED',
        storageLocation: data.storageLocation || null,
      },
    });

    await prisma.labOrder.update({
      where: { id: orderId },
      data: { status: 'SAMPLE_COLLECTED' },
    });

    await AuditService.log(
      'LAB_SAMPLE_COLLECTED',
      'LAB_SAMPLE',
      `Sample (${data.sampleType}) collected for lab order ${orderId}`,
      userId,
      ipAddress,
      userAgent
    );

    return sample;
  }

  /**
   * Update sample processing status
   */
  static async updateSampleStatus(
    sampleId: string,
    status: 'COLLECTED' | 'PROCESSING' | 'TESTING' | 'COMPLETED' | 'REJECTED',
    rejectionReason?: string,
    userId: string = 'System'
  ) {
    const sample = await prisma.labSample.findUnique({ where: { id: sampleId } });
    if (!sample) throw new Error(`Lab sample with ID '${sampleId}' not found`);

    const updatedSample = await prisma.labSample.update({
      where: { id: sampleId },
      data: {
        status,
        rejectionReason: rejectionReason || null,
      },
    });

    // Update the parent order's status accordingly
    let orderStatus = 'SAMPLE_COLLECTED';
    if (status === 'PROCESSING') orderStatus = 'PROCESSING';
    else if (status === 'TESTING') orderStatus = 'TESTING';
    else if (status === 'COMPLETED') orderStatus = 'RESULT_ENTERED'; // When result is entered, it transitions to completed later
    else if (status === 'REJECTED') orderStatus = 'RECEIVED'; // Back to received so sample can be recollected

    await prisma.labOrder.update({
      where: { id: sample.labOrderId },
      data: { status: orderStatus },
    });

    await AuditService.log(
      'APPOINTMENT_STATUS_CHANGE',
      'LAB_SAMPLE',
      `Sample ${sampleId} status updated to ${status}`,
      userId
    );

    return updatedSample;
  }

  /**
   * Enter results for a lab order
   */
  static async enterResults(
    orderId: string,
    data: LabResultEntryInput,
    userId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const order = await prisma.labOrder.findUnique({
      where: { id: orderId },
      include: {
        patient: true,
        labTest: {
          include: {
            referenceRanges: true,
          },
        },
      },
    });

    if (!order) throw new Error(`Lab order with ID '${orderId}' not found`);

    // Calculate age
    const dob = new Date(order.patient.dob);
    const age = new Date().getFullYear() - dob.getFullYear();
    const gender = order.patient.gender.toUpperCase();

    const resultsToInsert = [];

    for (const item of data.results) {
      // Find matching reference range
      const matchingRange = order.labTest.referenceRanges.find((range) => {
        const matchesParam = range.parameter.toLowerCase() === item.parameter.toLowerCase();
        const matchesGender = range.gender.toUpperCase() === 'ALL' || range.gender.toUpperCase() === gender;
        const matchesAgeMin = range.ageMin === null || age >= range.ageMin;
        const matchesAgeMax = range.ageMax === null || age <= range.ageMax;
        return matchesParam && matchesGender && matchesAgeMin && matchesAgeMax;
      });

      let flag = 'NORMAL';
      let refRangeStr = 'N/A';

      if (matchingRange) {
        refRangeStr = `${matchingRange.rangeMin} - ${matchingRange.rangeMax} ${matchingRange.unit}`;
        const valNum = parseFloat(item.value);
        if (!isNaN(valNum)) {
          const min = Number(matchingRange.rangeMin);
          const max = Number(matchingRange.rangeMax);

          if (valNum < min) {
            // Critical: 20% lower than min
            flag = valNum < min * 0.8 ? 'CRITICAL' : 'LOW';
          } else if (valNum > max) {
            // Critical: 20% higher than max
            flag = valNum > max * 1.2 ? 'CRITICAL' : 'HIGH';
          }
        }
      }

      resultsToInsert.push({
        labOrderId: orderId,
        parameter: item.parameter,
        value: item.value,
        unit: item.unit,
        referenceRange: refRangeStr,
        flag,
        notes: item.notes || null,
        enteredById: userId,
      });
    }

    // Clear any existing results for this order before inserting to allow updates
    await prisma.labResult.deleteMany({
      where: { labOrderId: orderId },
    });

    // Create new results
    const createdResults = await Promise.all(
      resultsToInsert.map((res) => prisma.labResult.create({ data: res }))
    );

    // Update order status to RESULT_ENTERED
    await prisma.labOrder.update({
      where: { id: orderId },
      data: { status: 'RESULT_ENTERED' },
    });

    // Also update any active samples status to completed testing
    await prisma.labSample.updateMany({
      where: { labOrderId: orderId, status: { in: ['COLLECTED', 'PROCESSING', 'TESTING'] } },
      data: { status: 'TESTING' },
    });

    await AuditService.log(
      'LAB_RESULT_ENTERED',
      'LAB_RESULT',
      `Entered results for lab order ${orderId}. Parameters count: ${data.results.length}`,
      userId,
      ipAddress,
      userAgent
    );

    // If any results are critical, trigger a warning in console/logs
    const criticals = createdResults.filter((r) => r.flag === 'CRITICAL');
    if (criticals.length > 0) {
      console.warn(`[CRITICAL LAB ALERT] Critical result values entered for order ${orderId}:`, criticals);
    }

    return createdResults;
  }

  /**
   * Pathologist verification & approval
   */
  static async approveResults(
    orderId: string,
    approverId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const order = await prisma.labOrder.findUnique({
      where: { id: orderId },
      include: {
        results: true,
        labTest: true,
      },
    });

    if (!order) throw new Error(`Lab order with ID '${orderId}' not found`);
    if (order.results.length === 0) {
      throw new Error(`Cannot approve results: No result records exist for order '${orderId}'`);
    }

    const timestamp = new Date();

    // Verify and approve all result records
    await prisma.labResult.updateMany({
      where: { labOrderId: orderId },
      data: {
        verifiedAt: timestamp,
        verifiedById: approverId,
        approvedAt: timestamp,
        approvedById: approverId,
      },
    });

    // Check if any results are critical or if test type is Biopsy
    const hasCritical = order.results.some((r) => r.flag === 'CRITICAL');
    const isSensitive = order.labTest.testType === 'BIOPSY' || hasCritical;

    // Generate LabReport
    const reportUrl = `/api/lab/orders/${orderId}/report`;
    const report = await prisma.labReport.create({
      data: {
        labOrderId: orderId,
        reportUrl,
        reportType: 'PDF',
        status: 'FINAL',
        isSensitive,
        generatedById: approverId,
        reviewedById: approverId,
        reviewedAt: timestamp,
        generatedAt: timestamp,
      },
    });

    // Complete the Lab Order
    await prisma.labOrder.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' },
    });

    // Complete sample testing
    await prisma.labSample.updateMany({
      where: { labOrderId: orderId },
      data: { status: 'COMPLETED' },
    });

    // Log Audits
    await AuditService.log(
      'LAB_RESULT_APPROVED',
      'LAB_RESULT',
      `Lab results approved for order ${orderId} by pathologist ${approverId}`,
      approverId,
      ipAddress,
      userAgent
    );

    await AuditService.log(
      'LAB_REPORT_GENERATED',
      'LAB_REPORT',
      `Lab report generated for order ${orderId}. Sensitive: ${isSensitive}`,
      approverId,
      ipAddress,
      userAgent
    );

    // --- AUTOMATED INVENTORY DEDUCTION ---
    // Deduct stock for reagents/chemicals matching test categories
    try {
      const itemsToDeduct = await prisma.labInventory.findMany({
        where: {
          itemName: {
            contains: order.labTest.name,
            mode: 'insensitive',
          },
        },
      });

      for (const item of itemsToDeduct) {
        if (item.quantity > 0) {
          const updatedQty = item.quantity - 1;
          await prisma.labInventory.update({
            where: { id: item.id },
            data: { quantity: updatedQty },
          });

          if (updatedQty <= item.minStockLevel) {
            console.warn(`[LMS INVENTORY ALERT] Item '${item.itemName}' fell below minimum stock level of ${item.minStockLevel}. Current stock: ${updatedQty}`);
          }
        }
      }
    } catch (invErr) {
      console.error('Failed to automatically deduct inventory items:', invErr);
    }

    return report;
  }

  /**
   * Retrieve Lab Report and log access for compliance
   */
  static async getReport(
    reportId: string,
    userId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const report = await prisma.labReport.findUnique({
      where: { id: reportId },
      include: {
        labOrder: {
          include: {
            labTest: true,
            patient: true,
            doctor: true,
            results: true,
          },
        },
      },
    });

    if (!report) throw new Error(`Lab report with ID '${reportId}' not found`);

    // Verify ownership and role-based access
    const isAuthorized = await this.checkReportAccess(userId, report.labOrderId);
    if (!isAuthorized) {
      // Log Security Event
      await prisma.securityEvent.create({
        data: {
          userId,
          eventType: 'UNAUTHORIZED_ACCESS',
          severity: report.isSensitive ? 'CRITICAL' : 'HIGH',
          description: `Unauthorized attempt to read lab report ${reportId} for order ${report.labOrderId}`,
          ipAddress,
          userAgent,
        },
      });
      throw new Error('Access denied: You do not have permission to view this lab report');
    }

    // Log HIPAA compliant Data Access
    await this.logDataAccess(userId, reportId, 'READ', ipAddress, userAgent);

    // Audit Log report view
    await AuditService.log(
      'LAB_REPORT_VIEWED',
      'LAB_REPORT',
      `Lab report ${reportId} viewed by user ${userId}`,
      userId,
      ipAddress,
      userAgent
    );

    return report;
  }

  /**
   * Cancel lab order
   */
  static async cancelOrder(
    orderId: string,
    userId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const order = await prisma.labOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(`Lab order with ID '${orderId}' not found`);
    if (order.status === 'COMPLETED') throw new Error('Cannot cancel a completed lab order');

    const updated = await prisma.labOrder.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    await AuditService.log(
      'APPOINTMENT_CANCEL',
      'LAB_ORDER',
      `Lab order ${orderId} was cancelled`,
      userId,
      ipAddress,
      userAgent
    );

    return updated;
  }

  // --- INVENTORY MANAGEMENT ---

  static async listInventory() {
    return prisma.labInventory.findMany({
      orderBy: { itemName: 'asc' },
    });
  }

  static async addInventoryItem(data: LabInventoryItemInput) {
    const expiry = data.expiryDate ? new Date(data.expiryDate) : null;
    return prisma.labInventory.create({
      data: {
        itemName: data.itemName,
        category: data.category,
        quantity: data.quantity,
        unit: data.unit,
        minStockLevel: data.minStockLevel,
        expiryDate: expiry,
        storageLocation: data.storageLocation || null,
      },
    });
  }

  static async updateInventoryQuantity(id: string, quantity: number) {
    const item = await prisma.labInventory.findUnique({ where: { id } });
    if (!item) throw new Error(`Inventory item with ID '${id}' not found`);

    const updated = await prisma.labInventory.update({
      where: { id },
      data: { quantity },
    });

    if (quantity <= item.minStockLevel) {
      console.warn(`[LMS INVENTORY WARNING] Item '${item.itemName}' is low in stock: ${quantity} units left.`);
    }

    return updated;
  }

  // --- EQUIPMENT MANAGEMENT ---

  static async listEquipment() {
    return prisma.labEquipment.findMany({
      orderBy: { name: 'asc' },
    });
  }

  static async addEquipment(data: {
    name: string;
    modelNumber?: string;
    serialNumber?: string;
    status: 'OPERATIONAL' | 'MAINTENANCE' | 'DOWN';
    lastCalibration?: Date;
    nextCalibration?: Date;
  }) {
    return prisma.labEquipment.create({
      data,
    });
  }

  static async updateEquipmentStatus(id: string, status: 'OPERATIONAL' | 'MAINTENANCE' | 'DOWN') {
    return prisma.labEquipment.update({
      where: { id },
      data: { status },
    });
  }

  // --- METRICS & DASHBOARD ---

  static async getDashboardMetrics(): Promise<LabDashboardMetricsResponse> {
    const [
      totalOrders,
      pendingSamplesCount,
      processingCount,
      completedCount,
      criticalAlertsCount,
      lowStockItems,
    ] = await Promise.all([
      prisma.labOrder.count(),
      prisma.labOrder.count({
        where: { status: { in: ['ORDERED', 'RECEIVED'] } },
      }),
      prisma.labOrder.count({
        where: { status: { in: ['SAMPLE_COLLECTED', 'PROCESSING', 'TESTING', 'RESULT_ENTERED'] } },
      }),
      prisma.labOrder.count({
        where: { status: 'COMPLETED' },
      }),
      prisma.labResult.count({
        where: { flag: 'CRITICAL' },
      }),
      prisma.labInventory.findMany({
        where: {
          quantity: {
            lte: prisma.labInventory.fields.minStockLevel,
          },
        },
      }),
    ]);

    // Workload of technicians based on active assignments
    const activeAssignments = await prisma.labTechnicianAssignment.findMany({
      where: {
        labOrder: {
          status: {
            notIn: ['COMPLETED', 'CANCELLED'],
          },
        },
      },
    });

    const workloadMap = new Map<string, number>();
    for (const assign of activeAssignments) {
      workloadMap.set(assign.technicianId, (workloadMap.get(assign.technicianId) || 0) + 1);
    }

    const technicianWorkload = [];
    for (const [techId, count] of workloadMap.entries()) {
      const techUser = await prisma.user.findUnique({ where: { id: techId } });
      technicianWorkload.push({
        technicianId: techId,
        technicianName: techUser ? `${techUser.email}` : 'Unknown Technician',
        assignedCount: count,
      });
    }

    // Average turnaround time in minutes for completed orders
    const completedOrders = await prisma.labOrder.findMany({
      where: { status: 'COMPLETED' },
      include: { reports: true },
    });

    let tatSumMinutes = 0;
    let tatCount = 0;

    for (const order of completedOrders) {
      if (order.reports && order.reports.length > 0) {
        const generatedAt = new Date(order.reports[0].generatedAt);
        const createdAt = new Date(order.createdAt);
        const diffMs = generatedAt.getTime() - createdAt.getTime();
        const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
        tatSumMinutes += diffMinutes;
        tatCount++;
      }
    }

    const averageTurnaroundTimeMinutes = tatCount > 0 ? Math.round(tatSumMinutes / tatCount) : 0;

    return {
      totalOrders,
      pendingSamplesCount,
      processingCount,
      completedCount,
      criticalAlertsCount,
      technicianWorkload,
      averageTurnaroundTimeMinutes,
      lowStockItems,
    };
  }

  /**
   * Fetch all critical alerts
   */
  static async getCriticalAlerts(): Promise<CriticalResultAlert[]> {
    const results = await prisma.labResult.findMany({
      where: { flag: 'CRITICAL' },
      include: {
        labOrder: {
          include: {
            patient: true,
          },
        },
      },
      orderBy: { enteredAt: 'desc' },
    });

    return results.map((r) => ({
      labOrderId: r.labOrderId,
      patientName: `${r.labOrder.patient.firstName} ${r.labOrder.patient.lastName}`,
      parameter: r.parameter,
      value: r.value,
      unit: r.unit,
      referenceRange: r.referenceRange,
      flag: 'CRITICAL',
      enteredAt: r.enteredAt,
    }));
  }

  /**
   * Fetch orders for technician
   */
  static async getTechnicianPendingTasks(technicianId: string) {
    return prisma.labOrder.findMany({
      where: {
        status: { in: ['RECEIVED', 'SAMPLE_COLLECTED', 'PROCESSING', 'TESTING'] },
        technicianAssignments: {
          some: {
            technicianId,
            status: 'ASSIGNED',
          },
        },
      },
      include: {
        labTest: true,
        patient: true,
        samples: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
