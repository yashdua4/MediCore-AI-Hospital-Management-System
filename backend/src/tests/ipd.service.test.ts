import prisma from '../config/prisma';
import { IpdService } from '../services/ipd.service';
import { RoleType } from '@prisma/client';

async function cleanupDb() {
  await prisma.nursingAssignment.deleteMany();
  await prisma.admissionNote.deleteMany();
  await prisma.dischargeSummary.deleteMany();
  await prisma.admissionCharge.deleteMany();
  await prisma.patientTransfer.deleteMany();
  await prisma.bedAssignment.deleteMany();
  await prisma.admission.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.ward.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.doctorDepartment.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.securityEvent.deleteMany();
  await prisma.dataAccessLog.deleteMany();
}

describe('IpdService Unit Tests', () => {
  let adminUser: any;
  let docUser: any;
  let nurseUser: any;
  let patientUser: any;
  let patientProfile: any;
  let doctorProfile: any;
  let department: any;
  let ward: any;
  let room: any;
  let bed1: any;
  let bed2: any;

  beforeAll(async () => {
    await cleanupDb();

    // Create Roles
    const adminRole = await prisma.role.create({
      data: { name: RoleType.SUPER_ADMIN, description: 'Admin' },
    });
    const nurseRole = await prisma.role.create({
      data: { name: RoleType.NURSE, description: 'Nurse' },
    });
    const docRole = await prisma.role.create({
      data: { name: RoleType.DOCTOR, description: 'Doctor' },
    });
    const patRole = await prisma.role.create({
      data: { name: RoleType.PATIENT, description: 'Patient' },
    });

    // Create Users
    adminUser = await prisma.user.create({
      data: { email: 'admin.ipd@medicore.com', passwordHash: 'hash', roles: { create: { roleId: adminRole.id } } },
    });

    docUser = await prisma.user.create({
      data: { email: 'doc.ipd@medicore.com', passwordHash: 'hash', roles: { create: { roleId: docRole.id } } },
    });

    nurseUser = await prisma.user.create({
      data: { email: 'nurse.ipd@medicore.com', passwordHash: 'hash', roles: { create: { roleId: nurseRole.id } } },
    });

    patientUser = await prisma.user.create({
      data: { email: 'pat.ipd@medicore.com', passwordHash: 'hash', roles: { create: { roleId: patRole.id } } },
    });

    // Create Profiles
    patientProfile = await prisma.patient.create({
      data: { userId: patientUser.id, firstName: 'John', lastName: 'Admission', dob: new Date('1995-10-10'), gender: 'MALE', phone: '9777777777', email: patientUser.email },
    });

    department = await prisma.doctorDepartment.create({
      data: { name: 'Emergency Medicine' },
    });

    doctorProfile = await prisma.doctor.create({
      data: { userId: docUser.id, firstName: 'Dr. Gregory', lastName: 'House', email: docUser.email, phone: '1115555555', licenseNumber: 'LIC_IPD_007', consultationFee: 500.0, departmentId: department.id },
    });

    // Set up Wards, Rooms, Beds
    ward = await IpdService.createWard({ name: 'ICU Block B', type: 'ICU', capacity: 10 });
    room = await IpdService.createRoom({ roomNumber: 'ICU-B01', wardId: ward.id, roomType: 'ICU', chargesPerDay: 5000.0 });
    bed1 = await IpdService.createBed({ bedNumber: 'B01-A', roomId: room.id });
    bed2 = await IpdService.createBed({ bedNumber: 'B01-B', roomId: room.id });
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  test('should admit a patient to a bed and lock bed status', async () => {
    const admission = await IpdService.admitPatient(
      {
        patientId: patientProfile.id,
        doctorId: doctorProfile.id,
        reason: 'Sepsis',
        bedId: bed1.id,
      },
      adminUser.id
    );

    expect(admission.admissionNumber).toBeDefined();
    expect(admission.status).toBe('ADMITTED');

    // Bed status should lock to OCCUPIED
    const updatedBed = await prisma.bed.findUnique({ where: { id: bed1.id } });
    expect(updatedBed?.status).toBe('OCCUPIED');

    // Ward occupancy should increment to 1
    const updatedWard = await prisma.ward.findUnique({ where: { id: ward.id } });
    expect(updatedWard?.occupancy).toBe(1);

    // active BedAssignment exists
    const assignment = await prisma.bedAssignment.findFirst({
      where: { admissionId: admission.id, status: 'ACTIVE' },
    });
    expect(assignment?.bedId).toBe(bed1.id);
  });

  test('should prevent double-allocation of an occupied bed', async () => {
    // Try to admit another patient onto bed1 (already occupied)
    const anotherPatUser = await prisma.user.create({
      data: { email: 'another.pat@medicore.com', passwordHash: 'hash' },
    });
    const anotherPatient = await prisma.patient.create({
      data: { userId: anotherPatUser.id, firstName: 'Alice', lastName: 'Double', dob: new Date('1998-02-02'), gender: 'FEMALE', phone: '9777777778', email: anotherPatUser.email },
    });

    await expect(
      IpdService.admitPatient(
        {
          patientId: anotherPatient.id,
          doctorId: doctorProfile.id,
          reason: 'Observation',
          bedId: bed1.id,
        },
        adminUser.id
      )
    ).rejects.toThrow('not available');
  });

  test('should transfer patient, freeing previous bed assignment', async () => {
    const activeAdmission = await prisma.admission.findFirst({
      where: { patientId: patientProfile.id, status: 'ADMITTED' },
    });
    expect(activeAdmission).toBeDefined();

    // Transfer from bed1 to bed2
    const transfer = await IpdService.transferPatient(
      activeAdmission!.id,
      {
        targetBedId: bed2.id,
        reason: 'Better oxygen setup',
      },
      adminUser.id
    );

    expect(transfer.fromBedId).toBe(bed1.id);
    expect(transfer.toBedId).toBe(bed2.id);

    // bed1 status returns to AVAILABLE, bed2 status locks to OCCUPIED
    const updatedBed1 = await prisma.bed.findUnique({ where: { id: bed1.id } });
    expect(updatedBed1?.status).toBe('AVAILABLE');

    const updatedBed2 = await prisma.bed.findUnique({ where: { id: bed2.id } });
    expect(updatedBed2?.status).toBe('OCCUPIED');

    // old bed assignment released
    const oldAssign = await prisma.bedAssignment.findFirst({
      where: { admissionId: activeAdmission!.id, bedId: bed1.id },
    });
    expect(oldAssign?.status).toBe('RELEASED');
    expect(oldAssign?.releasedAt).not.toBeNull();

    // new bed assignment active
    const newAssign = await prisma.bedAssignment.findFirst({
      where: { admissionId: activeAdmission!.id, bedId: bed2.id, status: 'ACTIVE' },
    });
    expect(newAssign).toBeDefined();
  });

  test('should log admission daily charges and integrate into patient draft billing invoice', async () => {
    const activeAdmission = await prisma.admission.findFirst({
      where: { patientId: patientProfile.id, status: 'ADMITTED' },
    });

    // Log charge
    const charge = await IpdService.logAdmissionCharge(activeAdmission!.id, {
      chargeType: 'ROOM',
      amount: 5000.0,
      description: 'Daily ICU room charges',
      quantity: 1,
    });

    expect(charge.id).toBeDefined();
    expect(Number(charge.amount)).toBe(5000.0);
    expect(charge.invoiceItemId).not.toBeNull();

    // Verify draft invoice exists and has correct item and subtotal
    const invoice = await prisma.invoice.findFirst({
      where: { patientId: patientProfile.id, status: 'DRAFT' },
      include: { items: true },
    });
    expect(invoice).toBeDefined();
    expect(invoice?.items).toHaveLength(1);
    expect(invoice?.items[0].id).toBe(charge.invoiceItemId);
    expect(Number(invoice?.subTotal)).toBe(5000.0);
    expect(Number(invoice?.taxAmount)).toBe(900.0); // 18% of 5000 = 900
    expect(Number(invoice?.totalAmount)).toBe(5900.0);
  });

  test('should assign nurse shifts and progressive care notes', async () => {
    const activeAdmission = await prisma.admission.findFirst({
      where: { patientId: patientProfile.id, status: 'ADMITTED' },
    });

    // Assign shift
    const shift = await IpdService.assignNurse(
      activeAdmission!.id,
      {
        nurseId: nurseUser.id,
        wardId: ward.id,
        shiftStart: new Date().toISOString(),
        shiftEnd: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        notes: 'Monitor vitals every hour',
      },
      adminUser.id
    );

    expect(shift.id).toBeDefined();
    expect(shift.notes).toBe('Monitor vitals every hour');

    // Create note
    const note = await IpdService.createAdmissionNote(activeAdmission!.id, nurseUser.id, {
      noteType: 'NURSING',
      content: 'Patient vitals stable. Temperature normal.',
    });

    expect(note.id).toBeDefined();
    expect(note.noteType).toBe('NURSING');
  });

  test('should discharge patient, generate summary, and release bed', async () => {
    const activeAdmission = await prisma.admission.findFirst({
      where: { patientId: patientProfile.id, status: 'ADMITTED' },
    });

    // Discharge
    const discharge = await IpdService.dischargePatient(
      activeAdmission!.id,
      {
        treatmentSummary: 'Sepsis cleared, vitals stable.',
        medicationInstructions: 'Paracetamol 650mg TDS.',
        followUpInstructions: 'Review in OPD after 1 week.',
        dischargeCondition: 'Cured',
      },
      docUser.id
    );

    expect(discharge.updatedAdmiss.status).toBe('DISCHARGED');
    expect(discharge.updatedAdmiss.dischargeDate).not.toBeNull();
    expect(discharge.summary.dischargeCondition).toBe('Cured');

    // Bed should release back to AVAILABLE
    const bed = await prisma.bed.findUnique({ where: { id: bed2.id } });
    expect(bed?.status).toBe('AVAILABLE');

    // Ward occupancy decrements back to 0
    const w = await prisma.ward.findUnique({ where: { id: ward.id } });
    expect(w?.occupancy).toBe(0);
  });

  test('should return IPD metrics dashboard', async () => {
    const dashboard = await IpdService.getDashboardTelemetry(adminUser.id);
    expect(dashboard.occupancy.totalBeds).toBeGreaterThanOrEqual(2);
    expect(dashboard.wardUtilization).toBeDefined();
    expect(dashboard.averageLengthOfStayDays).toBeGreaterThanOrEqual(0);
  });
});
