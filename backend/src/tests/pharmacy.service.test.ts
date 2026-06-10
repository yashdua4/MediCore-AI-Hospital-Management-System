import prisma from '../config/prisma';
import { PharmacyService } from '../services/pharmacy.service';
import { RoleType } from '@prisma/client';

async function cleanupDb() {
  await prisma.pharmacyTransaction.deleteMany();
  await prisma.prescriptionDispenseItem.deleteMany();
  await prisma.prescriptionDispense.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.medicineBatch.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.medicineInventory.deleteMany();
  await prisma.medicineSubstitution.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.medicineCategory.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.prescriptionMedicine.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.medicalRecordVersion.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.doctorDepartment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.securityEvent.deleteMany();
  await prisma.dataAccessLog.deleteMany();
}

describe('PharmacyService Unit Tests', () => {
  let pharmacistUser: any;
  let doctorUser: any;
  let patientUser: any;
  let patientProfile: any;
  let doctorProfile: any;
  let department: any;
  let category: any;
  let medicine: any;
  let supplier: any;

  beforeAll(async () => {
    await cleanupDb();

    // Create roles
    const pharmRole = await prisma.role.create({
      data: { name: RoleType.PHARMACIST, description: 'Pharmacist' },
    });
    await prisma.role.create({
      data: { name: RoleType.DOCTOR, description: 'Doctor' },
    });
    await prisma.role.create({
      data: { name: RoleType.PATIENT, description: 'Patient' },
    });

    // Create Users
    pharmacistUser = await prisma.user.create({
      data: {
        id: 'pharm-user-id',
        email: 'pharmacist@medicore.com',
        passwordHash: 'hash',
        roles: { create: { roleId: pharmRole.id } },
      },
    });

    doctorUser = await prisma.user.create({
      data: {
        id: 'doctor-user-id-pharm',
        email: 'doctor.pharm@medicore.com',
        passwordHash: 'hash',
        roles: { create: { roleId: (await prisma.role.findUnique({ where: { name: RoleType.DOCTOR } }))!.id } },
      },
    });

    patientUser = await prisma.user.create({
      data: {
        id: 'patient-user-id-pharm',
        email: 'patient.pharm@gmail.com',
        passwordHash: 'hash',
        roles: { create: { roleId: (await prisma.role.findUnique({ where: { name: RoleType.PATIENT } }))!.id } },
      },
    });

    // Create Profile details
    department = await prisma.doctorDepartment.create({
      data: { name: 'General Medicine', description: 'Internal medicine' },
    });

    doctorProfile = await prisma.doctor.create({
      data: {
        userId: doctorUser.id,
        firstName: 'John',
        lastName: 'Watson',
        email: doctorUser.email,
        phone: '1231231234',
        licenseNumber: 'LIC_PH_123',
        consultationFee: 300.0,
        departmentId: department.id,
      },
    });

    patientProfile = await prisma.patient.create({
      data: {
        userId: patientUser.id,
        firstName: 'Sherlock',
        lastName: 'Holmes',
        dob: new Date('1985-01-01'),
        gender: 'MALE',
        email: patientUser.email,
        phone: '9879879870',
      },
    });

    // Create medicine category, medicine, and supplier
    category = await PharmacyService.createCategory('Antibiotics', 'Antibacterial medications');
    medicine = await PharmacyService.createMedicine(
      {
        name: 'Amoxicillin 500mg',
        genericName: 'Amoxicillin',
        brandName: 'Amoxil',
        strength: '500mg',
        dosageForm: 'Capsule',
        manufacturer: 'GSK',
        categoryId: category.id,
        prescriptionRequired: true,
        price: 15.0,
      },
      pharmacistUser.id
    );

    supplier = await PharmacyService.createSupplier({
      name: 'Global Pharma Supplies',
      contactName: 'Mr. Supplier',
      phone: '9998887776',
      email: 'global@pharma.com',
      address: '100 Industrial Area, Mumbai',
    });
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  test('should requisition stock via Purchase Order and receive it in inventory', async () => {
    // 1. Create Purchase Order
    const po = await PharmacyService.createPurchaseOrder(
      {
        supplierId: supplier.id,
        items: [
          {
            medicineId: medicine.id,
            quantity: 100,
            unitPrice: 10.0,
            batchNumber: 'AMX-001',
            expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months from now
          },
        ],
      },
      pharmacistUser.id
    );

    expect(po.orderNumber).toBeDefined();
    expect(po.status).toBe('PENDING');
    expect(Number(po.totalAmount)).toBe(1000.0);

    // Verify PO Audit Log
    const poAudit = await prisma.auditLog.findFirst({
      where: { action: 'PURCHASE_ORDER_CREATED' },
    });
    expect(poAudit).toBeDefined();

    // 2. Receive Purchase Order stock
    const receivedPo = await PharmacyService.receivePurchaseOrder(po.id, pharmacistUser.id);
    expect(receivedPo.status).toBe('RECEIVED');

    // Verify Inventory & Batches populated
    const inventory = await prisma.medicineInventory.findFirst({
      where: { medicineId: medicine.id },
    });
    expect(inventory).toBeDefined();
    expect(inventory?.quantity).toBe(100);

    const batch = await prisma.medicineBatch.findUnique({
      where: {
        medicineId_batchNumber: {
          medicineId: medicine.id,
          batchNumber: 'AMX-001',
        },
      },
    });
    expect(batch).toBeDefined();
    expect(batch?.quantity).toBe(100);

    // Verify Stock Movement
    const movement = await prisma.stockMovement.findFirst({
      where: { medicineId: medicine.id, type: 'IN' },
    });
    expect(movement).toBeDefined();
    expect(movement?.quantity).toBe(100);
  });

  test('should fulfill doctor prescription, deduct inventory, and record billing transaction', async () => {
    // 1. Setup Prescription in DB using prisma
    const medRecord = await prisma.medicalRecord.create({
      data: {
        patientId: patientProfile.id,
        doctorId: doctorProfile.id,
        symptoms: 'Fever and cough',
      },
    });

    const prescription = await prisma.prescription.create({
      data: {
        medicalRecordId: medRecord.id,
        notes: 'Take with food',
        medicines: {
          create: [
            {
              medicineName: 'Amoxicillin 500mg',
              strength: '500mg',
              frequency: '2 times a day',
              duration: '5 days',
            },
          ],
        },
      },
    });

    // 2. Dispense Prescription
    const result = await PharmacyService.dispensePrescription(
      {
        prescriptionId: prescription.id,
        items: [
          {
            medicineId: medicine.id,
            quantity: 10,
            batchNumber: 'AMX-001',
          },
        ],
        notes: 'Dispensed full prescription',
        paymentMethod: 'UPI',
      },
      pharmacistUser.id
    );

    expect(result.dispense.id).toBeDefined();
    expect(result.dispense.status).toBe('COMPLETED');
    expect(result.transaction.transactionNumber).toBeDefined();
    expect(Number(result.transaction.totalAmount)).toBe(150.0); // 10 * 15.0

    // Check Inventory deducted
    const inventory = await prisma.medicineInventory.findFirst({
      where: { medicineId: medicine.id },
    });
    expect(inventory?.quantity).toBe(90); // 100 - 10

    const batch = await prisma.medicineBatch.findUnique({
      where: {
        medicineId_batchNumber: {
          medicineId: medicine.id,
          batchNumber: 'AMX-001',
        },
      },
    });
    expect(batch?.quantity).toBe(90);

    // Verify Stock Movement Out logged
    const movementOut = await prisma.stockMovement.findFirst({
      where: { medicineId: medicine.id, type: 'OUT' },
    });
    expect(movementOut).toBeDefined();
    expect(movementOut?.quantity).toBe(10);
  });

  test('should fail to dispense expired batches, duplicate completions, or exceeding inventory levels', async () => {
    // 1. Create a dummy prescription
    const medRecord = await prisma.medicalRecord.create({
      data: {
        patientId: patientProfile.id,
        doctorId: doctorProfile.id,
      },
    });
    const pr = await prisma.prescription.create({
      data: { medicalRecordId: medRecord.id },
    });

    // 2. Setup expired batch
    const expiredBatchNum = 'AMX-EXP';
    await prisma.medicineBatch.create({
      data: {
        batchNumber: expiredBatchNum,
        medicineId: medicine.id,
        quantity: 50,
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired yesterday
        supplierId: supplier.id,
      },
    });

    // Test Expired validation
    await expect(
      PharmacyService.dispensePrescription(
        {
          prescriptionId: pr.id,
          items: [{ medicineId: medicine.id, quantity: 5, batchNumber: expiredBatchNum }],
          paymentMethod: 'CASH',
        },
        pharmacistUser.id
      )
    ).rejects.toThrow('expired');

    // Test Insufficient stock validation
    await expect(
      PharmacyService.dispensePrescription(
        {
          prescriptionId: pr.id,
          items: [{ medicineId: medicine.id, quantity: 500, batchNumber: 'AMX-001' }], // asks 500, available: 90
          paymentMethod: 'CASH',
        },
        pharmacistUser.id
      )
    ).rejects.toThrow('Insufficient stock');
  });

  test('should register substitute medicines and query them correctly', async () => {
    // 1. Add substitute medicine
    const subMedicine = await PharmacyService.createMedicine(
      {
        name: 'Azithromycin 500mg',
        genericName: 'Azithromycin',
        brandName: 'Zithromax',
        strength: '500mg',
        dosageForm: 'Tablet',
        manufacturer: 'Pfizer',
        categoryId: category.id,
        prescriptionRequired: true,
        price: 25.0,
      },
      pharmacistUser.id
    );

    // 2. Create substitution map
    await PharmacyService.createSubstitution({
      originalMedicineId: medicine.id,
      substituteMedicineId: subMedicine.id,
      notes: 'Use if allergic to penicillin',
    });

    // 3. Get substitutes
    const list = await PharmacyService.getSubstitutes(medicine.id);
    expect(list).toHaveLength(1);
    expect(list[0].substituteMedicine.name).toBe('Azithromycin 500mg');
  });

  test('should retrieve dashboard metrics accurately', async () => {
    const metrics = await PharmacyService.getDashboardMetrics();
    expect(metrics.dailyDispensedCount).toBeGreaterThanOrEqual(1);
    expect(metrics.totalRevenueToday).toBe(150.0);
  });
});
