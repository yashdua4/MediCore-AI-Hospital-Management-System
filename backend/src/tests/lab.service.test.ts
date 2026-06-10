import prisma from '../config/prisma';
import { LabService } from '../services/lab.service';
import { RoleType } from '@prisma/client';

async function cleanupDb() {
  await prisma.labReport.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.labTechnicianAssignment.deleteMany();
  await prisma.labSample.deleteMany();
  await prisma.labOrder.deleteMany();
  await prisma.labReferenceRange.deleteMany();
  await prisma.labTest.deleteMany();
  await prisma.labTestCategory.deleteMany();
  await prisma.labInventory.deleteMany();
  await prisma.labEquipment.deleteMany();
  await prisma.doctorSpecializationMapping.deleteMany();
  await prisma.doctorQualification.deleteMany();
  await prisma.doctorSchedule.deleteMany();
  await prisma.doctorAvailability.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.doctorDepartment.deleteMany();
  await prisma.patientMedicalHistory.deleteMany();
  await prisma.patientAddress.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.insuranceInformation.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.dataAccessLog.deleteMany();
  await prisma.securityEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
}

describe('LabService Unit Tests', () => {
  let docUser: any;
  let techUser: any;
  let patientUser: any;
  let otherUser: any;
  let doctor: any;
  let patient: any;
  let category: any;
  let labTest: any;
  let dept: any;
  let techRole: any;

  beforeAll(async () => {
    await cleanupDb();

    // Create system roles
    techRole = await prisma.role.create({
      data: { name: RoleType.LAB_TECH, description: 'Lab technician' },
    });
    await prisma.role.create({
      data: { name: RoleType.DOCTOR, description: 'Doctor' },
    });
    await prisma.role.create({
      data: { name: RoleType.PATIENT, description: 'Patient' },
    });

    // Create users
    docUser = await prisma.user.create({
      data: {
        id: 'doc-user-id',
        email: 'doc@medicore.com',
        passwordHash: 'dummy',
        roles: { create: { roleId: (await prisma.role.findUnique({ where: { name: RoleType.DOCTOR } }))!.id } },
      },
    });

    techUser = await prisma.user.create({
      data: {
        id: 'tech-user-id',
        email: 'tech@medicore.com',
        passwordHash: 'dummy',
        roles: { create: { roleId: techRole.id } },
      },
    });

    patientUser = await prisma.user.create({
      data: {
        id: 'patient-user-id',
        email: 'patient@gmail.com',
        passwordHash: 'dummy',
        roles: { create: { roleId: (await prisma.role.findUnique({ where: { name: RoleType.PATIENT } }))!.id } },
      },
    });

    otherUser = await prisma.user.create({
      data: {
        id: 'other-user-id',
        email: 'other@gmail.com',
        passwordHash: 'dummy',
        roles: { create: { roleId: (await prisma.role.findUnique({ where: { name: RoleType.PATIENT } }))!.id } },
      },
    });

    // Create doctor department
    dept = await prisma.doctorDepartment.create({
      data: { name: 'Pathology', description: 'Diagnostic lab services' },
    });

    // Create doctor profile
    doctor = await prisma.doctor.create({
      data: {
        userId: docUser.id,
        firstName: 'Doctor',
        lastName: 'Strange',
        email: docUser.email,
        phone: '1234567890',
        licenseNumber: 'DOC12345',
        consultationFee: 500.0,
        departmentId: dept.id,
      },
    });

    // Create patient profile
    patient = await prisma.patient.create({
      data: {
        userId: patientUser.id,
        firstName: 'Peter',
        lastName: 'Parker',
        dob: new Date('1995-10-10'),
        gender: 'MALE',
        email: patientUser.email,
        phone: '9876543210',
      },
    });

    // Create Lab Test category and test
    category = await LabService.createCategory('Hematology', 'Blood related tests');
    labTest = await LabService.createLabTest({
      categoryId: category.id,
      name: 'Complete Blood Count',
      code: 'CBC',
      price: 150.0,
      testType: 'BLOOD',
      description: 'Standard CBC test',
    });

    // Create reference ranges (Hemoglobin and WBC)
    // normal: 12.0 - 18.0. critical: < 9.6 (min * 0.8) or > 21.6 (max * 1.2)
    await LabService.createReferenceRange({
      labTestId: labTest.id,
      parameter: 'Hemoglobin',
      gender: 'ALL',
      rangeMin: 12.0,
      rangeMax: 18.0,
      unit: 'g/dL',
    });

    await LabService.createReferenceRange({
      labTestId: labTest.id,
      parameter: 'WBC',
      gender: 'MALE',
      rangeMin: 4.0,
      rangeMax: 11.0,
      unit: '10^3/uL',
    });
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  test('should create a lab order, assign technician, collect sample, enter results, verify reference ranges, and approve', async () => {
    // 1. Create Order
    const order = await LabService.createLabOrder(
      {
        patientId: patient.id,
        doctorId: doctor.id,
        labTestId: labTest.id,
        priority: 'NORMAL',
        clinicalNotes: 'Check for anemia',
      },
      docUser.id
    );

    expect(order.id).toBeDefined();
    expect(order.status).toBe('ORDERED');
    expect(order.priority).toBe('NORMAL');

    // Verify Audit Log
    const auditCreated = await prisma.auditLog.findFirst({
      where: { action: 'LAB_ORDER_CREATED' },
    });
    expect(auditCreated).toBeDefined();
    expect(auditCreated?.details).toContain('Complete Blood Count');

    // 2. Assign Technician
    const assignment = await LabService.assignTechnician(
      order.id,
      { technicianId: techUser.id },
      techUser.id
    );
    expect(assignment.technicianId).toBe(techUser.id);
    expect(assignment.status).toBe('ASSIGNED');

    // Verify order status updated to RECEIVED
    const orderReceived = await prisma.labOrder.findUnique({ where: { id: order.id } });
    expect(orderReceived?.status).toBe('RECEIVED');

    // 3. Collect Sample
    const sample = await LabService.collectSample(
      order.id,
      { sampleType: 'Whole Blood', storageLocation: 'Rack B1' },
      techUser.id
    );
    expect(sample.sampleType).toBe('Whole Blood');
    expect(sample.status).toBe('COLLECTED');

    const orderSampled = await prisma.labOrder.findUnique({
      where: { id: order.id },
      include: { samples: true },
    });
    expect(orderSampled?.status).toBe('SAMPLE_COLLECTED');

    // 4. Update sample status to TESTING
    await LabService.updateSampleStatus(sample.id, 'TESTING', undefined, techUser.id);
    const orderTesting = await prisma.labOrder.findUnique({ where: { id: order.id } });
    expect(orderTesting?.status).toBe('TESTING');

    // 5. Enter Results (Normal WBC, Low Hemoglobin, Critical Hemoglobin in next check)
    // Let's enter Hemoglobin = 10.0 (Low, since 10.0 < 12.0)
    // Let's enter WBC = 6.0 (Normal, since 4.0 <= 6.0 <= 11.0)
    const results = await LabService.enterResults(
      order.id,
      {
        results: [
          { parameter: 'Hemoglobin', value: '10.0', unit: 'g/dL' },
          { parameter: 'WBC', value: '6.0', unit: '10^3/uL' },
        ],
      },
      techUser.id
    );

    expect(results).toHaveLength(2);
    const hgbResult = results.find((r) => r.parameter === 'Hemoglobin');
    const wbcResult = results.find((r) => r.parameter === 'WBC');

    expect(hgbResult?.flag).toBe('LOW');
    expect(wbcResult?.flag).toBe('NORMAL');

    // Let's enter a Critical result for Hemoglobin = 8.0 (Critical, since 8.0 < 12.0 * 0.8 = 9.6)
    const results2 = await LabService.enterResults(
      order.id,
      {
        results: [
          { parameter: 'Hemoglobin', value: '8.0', unit: 'g/dL' },
          { parameter: 'WBC', value: '6.0', unit: '10^3/uL' },
        ],
      },
      techUser.id
    );

    const hgbResult2 = results2.find((r) => r.parameter === 'Hemoglobin');
    expect(hgbResult2?.flag).toBe('CRITICAL');

    // 6. Pathologist Approval & Report Generation
    const report = await LabService.approveResults(order.id, techUser.id);
    expect(report.id).toBeDefined();
    expect(report.status).toBe('FINAL');
    expect(report.isSensitive).toBe(true); // Since Hemoglobin is CRITICAL

    const completedOrder = await prisma.labOrder.findUnique({ where: { id: order.id } });
    expect(completedOrder?.status).toBe('COMPLETED');

    // 7. Get Report and test access authorization
    // Other unrelated user should be rejected
    await expect(LabService.getReport(report.id, otherUser.id)).rejects.toThrow('Access denied');

    // Patient owner should be allowed
    const patientReport = await LabService.getReport(report.id, patientUser.id);
    expect(patientReport.id).toBe(report.id);

    // Doctor should be allowed
    const docReport = await LabService.getReport(report.id, docUser.id);
    expect(docReport.id).toBe(report.id);
  });

  test('should manage inventory, track levels and return low stock warnings', async () => {
    // 1. Add item
    const item = await LabService.addInventoryItem({
      itemName: 'CBC Reagent Pack',
      category: 'REAGENT',
      quantity: 10,
      unit: 'packs',
      minStockLevel: 3,
      storageLocation: 'Fridge 1',
    });

    expect(item.itemName).toBe('CBC Reagent Pack');
    expect(item.quantity).toBe(10);

    // 2. Fetch list
    const list = await LabService.listInventory();
    expect(list.length).toBeGreaterThan(0);

    // 3. Update quantity below threshold
    const updated = await LabService.updateInventoryQuantity(item.id, 2);
    expect(updated.quantity).toBe(2);

    // 4. Metrics should contain low stock item
    const metrics = await LabService.getDashboardMetrics();
    expect(metrics.lowStockItems.some((i) => i.id === item.id)).toBe(true);
  });
});
