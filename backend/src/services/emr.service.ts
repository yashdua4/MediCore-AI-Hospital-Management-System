import prisma from '../config/prisma';
import { AuditService } from './audit.service';
import {
  EMRCreateInput,
  EMRUpdateInput,
  EMRJsonSnapshot,
  PatientTimelineEvent,
  VitalTrendData,
  EMRVitalInput,
  EMRDocumentInput,
  PatientAllergyInput,
  PatientConditionInput,
} from '../types/emr.types';

export class EMRService {
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
   * Helper to compute BMI.
   */
  private static calculateBMI(weightKg: number, heightCm: number): number {
    if (heightCm <= 0) return 0;
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    return Number(bmi.toFixed(2));
  }

  /**
   * Helper to check for sensitive keywords in symptoms, observations, and diagnoses.
   */
  private static isSensitiveRecord(
    symptoms?: string | null,
    observations?: string | null,
    diagnoses: { code: string; name: string }[] = []
  ): boolean {
    const sensitiveKeywords = [
      'hiv',
      'aids',
      'cancer',
      'psychiatric',
      'bipolar',
      'schizophrenia',
      'substance abuse',
      'depressive',
      'suicide',
      'oncology',
    ];
    const textToSearch = [
      symptoms || '',
      observations || '',
      ...diagnoses.map((d) => `${d.code} ${d.name}`),
    ].join(' ').toLowerCase();

    return sensitiveKeywords.some((keyword) => textToSearch.includes(keyword));
  }

  /**
   * Build complete EMR snapshot JSON.
   */
  private static buildSnapshot(
    record: any,
    diagnoses: any[],
    plans: any[],
    prescriptions: any[],
    vital?: any
  ): EMRJsonSnapshot {
    return {
      symptoms: record.symptoms,
      observations: record.observations,
      followUpInstructions: record.followUpInstructions,
      diagnoses: diagnoses.map((d) => ({
        code: d.code,
        name: d.name,
        severity: d.severity,
        notes: d.notes,
      })),
      treatmentPlans: plans.map((p) => ({
        description: p.description,
        goals: p.goals,
        duration: p.duration,
        status: p.status,
        notes: p.notes,
      })),
      prescriptions: prescriptions.map((pr) => ({
        notes: pr.notes,
        medicines: pr.medicines.map((m: any) => ({
          medicineName: m.medicineName,
          strength: m.strength,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions,
        })),
      })),
      vitals: vital
        ? {
            bloodPressure: vital.bloodPressure,
            heartRate: Number(vital.heartRate),
            respiratoryRate: Number(vital.respiratoryRate),
            temperature: Number(vital.temperature),
            oxygenSaturation: Number(vital.oxygenSaturation),
            height: Number(vital.height),
            weight: Number(vital.weight),
            bmi: Number(vital.bmi),
          }
        : null,
    };
  }

  /**
   * Create a new EMR file.
   */
  static async createMedicalRecord(
    data: EMRCreateInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
    if (!patient || patient.isDeleted) {
      throw new Error(`Patient with ID '${data.patientId}' not found`);
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } });
    if (!doctor || doctor.isDeleted) {
      throw new Error(`Doctor with ID '${data.doctorId}' not found`);
    }

    const record = await prisma.$transaction(async (tx) => {
      // 1. Create central record
      const createdRecord = await tx.medicalRecord.create({
        data: {
          patientId: data.patientId,
          doctorId: data.doctorId,
          appointmentId: data.appointmentId || null,
          symptoms: data.symptoms || null,
          observations: data.observations || null,
          followUpInstructions: data.followUpInstructions || null,
          version: 1,
        },
      });

      // 2. Create nested diagnoses
      const diagnoses = [];
      if (data.diagnoses && data.diagnoses.length > 0) {
        for (const diag of data.diagnoses) {
          const d = await tx.diagnosis.create({
            data: {
              medicalRecordId: createdRecord.id,
              ...diag,
            },
          });
          diagnoses.push(d);
        }
      }

      // 3. Create nested treatment plans
      const plans = [];
      if (data.treatmentPlans && data.treatmentPlans.length > 0) {
        for (const plan of data.treatmentPlans) {
          const p = await tx.treatmentPlan.create({
            data: {
              medicalRecordId: createdRecord.id,
              ...plan,
            },
          });
          plans.push(p);
        }
      }

      // 4. Create nested prescriptions and prescription medicines
      const prescriptions = [];
      if (data.prescriptions && data.prescriptions.length > 0) {
        for (const pres of data.prescriptions) {
          const p = await tx.prescription.create({
            data: {
              medicalRecordId: createdRecord.id,
              notes: pres.notes || null,
            },
          });

          const medicines = [];
          for (const med of pres.medicines) {
            const m = await tx.prescriptionMedicine.create({
              data: {
                prescriptionId: p.id,
                ...med,
              },
            });
            medicines.push(m);
          }
          prescriptions.push({ ...p, medicines });
        }
      }

      // 5. Create Vitals if provided
      let vital = null;
      if (data.vitals) {
        const bmi = this.calculateBMI(data.vitals.weight, data.vitals.height);
        vital = await tx.patientVital.create({
          data: {
            patientId: data.patientId,
            medicalRecordId: createdRecord.id,
            ...data.vitals,
            bmi,
            recordedById: actorUserId,
          },
        });
      }

      // 6. Create Clinical Notes if provided
      if (data.clinicalNotes && data.clinicalNotes.length > 0) {
        for (const note of data.clinicalNotes) {
          await tx.clinicalNote.create({
            data: {
              medicalRecordId: createdRecord.id,
              content: note.content,
              noteType: note.noteType,
              authorId: actorUserId,
            },
          });
        }
      }

      // 7. Serialize snapshot and save MedicalRecordVersion 1
      const snapshot = this.buildSnapshot(createdRecord, diagnoses, plans, prescriptions, vital);
      await tx.medicalRecordVersion.create({
        data: {
          medicalRecordId: createdRecord.id,
          version: 1,
          data: snapshot as any,
          changedBy: actorUserId,
          changeReason: 'Initial creation',
        },
      });

      return {
        ...createdRecord,
        diagnoses,
        treatmentPlans: plans,
        prescriptions,
        vitals: vital ? [vital] : [],
      };
    });

    // Logging & Compliance Auditing
    await AuditService.log(
      'MEDICAL_RECORD_CREATED',
      'EMR',
      `Created medical record ID '${record.id}' for patient ID '${data.patientId}'`,
      actorUserId,
      ipAddress,
      userAgent
    );

    if (data.prescriptions && data.prescriptions.length > 0) {
      await AuditService.log(
        'PRESCRIPTION_CREATED',
        'Prescription',
        `Created prescriptions for medical record ID '${record.id}'`,
        actorUserId,
        ipAddress,
        userAgent
      );
    }

    await this.logDataAccess(actorUserId, record.id, 'CREATE', ipAddress, userAgent);

    return record;
  }

  /**
   * Update an EMR and increment version with snapshotting.
   */
  static async updateMedicalRecord(
    id: string,
    data: EMRUpdateInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    const existingRecord = await prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        diagnoses: true,
        treatmentPlans: true,
        prescriptions: { include: { medicines: true } },
        vitals: { orderBy: { recordedAt: 'desc' } },
      },
    });

    if (!existingRecord || existingRecord.isDeleted) {
      throw new Error(`Medical record with ID '${id}' not found`);
    }

    const nextVersion = existingRecord.version + 1;

    const record = await prisma.$transaction(async (tx) => {
      // 1. Update text fields
      const updatedRecord = await tx.medicalRecord.update({
        where: { id },
        data: {
          symptoms: data.symptoms !== undefined ? data.symptoms : existingRecord.symptoms,
          observations: data.observations !== undefined ? data.observations : existingRecord.observations,
          followUpInstructions: data.followUpInstructions !== undefined ? data.followUpInstructions : existingRecord.followUpInstructions,
          version: nextVersion,
        },
      });

      // 2. Diagnoses Updates (Delete and Recreate)
      let diagnoses = existingRecord.diagnoses;
      if (data.diagnoses !== undefined) {
        await tx.diagnosis.deleteMany({ where: { medicalRecordId: id } });
        diagnoses = [];
        for (const diag of data.diagnoses) {
          const d = await tx.diagnosis.create({
            data: {
              medicalRecordId: id,
              ...diag,
            },
          });
          diagnoses.push(d);
        }
      }

      // 3. Treatment Plan Updates
      let plans = existingRecord.treatmentPlans;
      if (data.treatmentPlans !== undefined) {
        await tx.treatmentPlan.deleteMany({ where: { medicalRecordId: id } });
        plans = [];
        for (const plan of data.treatmentPlans) {
          const p = await tx.treatmentPlan.create({
            data: {
              medicalRecordId: id,
              ...plan,
            },
          });
          plans.push(p);
        }
      }

      // 4. Prescriptions Updates
      let prescriptions = existingRecord.prescriptions;
      if (data.prescriptions !== undefined) {
        await tx.prescription.deleteMany({ where: { medicalRecordId: id } });
        prescriptions = [];
        for (const pres of data.prescriptions) {
          const p = await tx.prescription.create({
            data: {
              medicalRecordId: id,
              notes: pres.notes || null,
            },
          });

          const medicines = [];
          for (const med of pres.medicines) {
            const m = await tx.prescriptionMedicine.create({
              data: {
                prescriptionId: p.id,
                ...med,
              },
            });
            medicines.push(m);
          }
          prescriptions.push({ ...p, medicines } as any);
        }
      }

      // 5. Vitals Updates
      let vital = existingRecord.vitals[0] || null;
      if (data.vitals !== undefined) {
        const bmi = this.calculateBMI(data.vitals.weight, data.vitals.height);
        vital = await tx.patientVital.create({
          data: {
            patientId: existingRecord.patientId,
            medicalRecordId: id,
            ...data.vitals,
            bmi,
            recordedById: actorUserId,
          },
        });
      }

      // 6. Serialize and save MedicalRecordVersion nextVersion
      const snapshot = this.buildSnapshot(updatedRecord, diagnoses, plans, prescriptions, vital);
      await tx.medicalRecordVersion.create({
        data: {
          medicalRecordId: id,
          version: nextVersion,
          data: snapshot as any,
          changedBy: actorUserId,
          changeReason: data.changeReason || 'Updated medical record details',
        },
      });

      return {
        ...updatedRecord,
        diagnoses,
        treatmentPlans: plans,
        prescriptions,
        vitals: vital ? [vital] : [],
      };
    });

    // Logging & Compliance Auditing
    await AuditService.log(
      'MEDICAL_RECORD_UPDATED',
      'EMR',
      `Updated medical record ID '${id}' to version ${nextVersion}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    if (data.diagnoses !== undefined) {
      await AuditService.log(
        'DIAGNOSIS_UPDATED',
        'Diagnosis',
        `Updated diagnoses for medical record ID '${id}'`,
        actorUserId,
        ipAddress,
        userAgent
      );
    }

    await this.logDataAccess(actorUserId, id, 'UPDATE', ipAddress, userAgent);

    return record;
  }

  /**
   * Restore an EMR file to a previous version from snapshot.
   */
  static async restoreVersion(
    id: string,
    versionNumber: number,
    changeReason: string | undefined,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    const record = await prisma.medicalRecord.findUnique({
      where: { id },
    });

    if (!record || record.isDeleted) {
      throw new Error(`Medical record with ID '${id}' not found`);
    }

    const versionRecord = await prisma.medicalRecordVersion.findFirst({
      where: { medicalRecordId: id, version: versionNumber },
    });

    if (!versionRecord) {
      throw new Error(`Version ${versionNumber} of medical record '${id}' not found`);
    }

    const snapshot = versionRecord.data as any as EMRJsonSnapshot;
    const nextVersion = record.version + 1;

    const restored = await prisma.$transaction(async (tx) => {
      // 1. Update text fields on primary record
      const updatedRecord = await tx.medicalRecord.update({
        where: { id },
        data: {
          symptoms: snapshot.symptoms,
          observations: snapshot.observations,
          followUpInstructions: snapshot.followUpInstructions,
          version: nextVersion,
        },
      });

      // 2. Replace diagnoses
      await tx.diagnosis.deleteMany({ where: { medicalRecordId: id } });
      const diagnoses = [];
      for (const diag of snapshot.diagnoses) {
        const d = await tx.diagnosis.create({
          data: {
            medicalRecordId: id,
            code: diag.code,
            name: diag.name,
            severity: diag.severity,
            notes: diag.notes || null,
          },
        });
        diagnoses.push(d);
      }

      // 3. Replace plans
      await tx.treatmentPlan.deleteMany({ where: { medicalRecordId: id } });
      const plans = [];
      for (const plan of snapshot.treatmentPlans) {
        const p = await tx.treatmentPlan.create({
          data: {
            medicalRecordId: id,
            description: plan.description,
            goals: plan.goals || null,
            duration: plan.duration || null,
            status: plan.status,
            notes: plan.notes || null,
          },
        });
        plans.push(p);
      }

      // 4. Replace prescriptions
      await tx.prescription.deleteMany({ where: { medicalRecordId: id } });
      const prescriptions = [];
      for (const pres of snapshot.prescriptions) {
        const p = await tx.prescription.create({
          data: {
            medicalRecordId: id,
            notes: pres.notes || null,
          },
        });

        const medicines = [];
        for (const med of pres.medicines) {
          const m = await tx.prescriptionMedicine.create({
            data: {
              prescriptionId: p.id,
              medicineName: med.medicineName,
              strength: med.strength,
              frequency: med.frequency,
              duration: med.duration,
              instructions: med.instructions || null,
            },
          });
          medicines.push(m);
        }
        prescriptions.push({ ...p, medicines });
      }

      // 5. Replace vital if snapshot had it
      let vital = null;
      if (snapshot.vitals) {
        vital = await tx.patientVital.create({
          data: {
            patientId: record.patientId,
            medicalRecordId: id,
            bloodPressure: snapshot.vitals.bloodPressure,
            heartRate: snapshot.vitals.heartRate,
            respiratoryRate: snapshot.vitals.respiratoryRate,
            temperature: snapshot.vitals.temperature,
            oxygenSaturation: snapshot.vitals.oxygenSaturation,
            height: snapshot.vitals.height,
            weight: snapshot.vitals.weight,
            bmi: snapshot.vitals.bmi,
            recordedById: actorUserId,
          },
        });
      }

      // 6. Write a new version record representing the restored snapshot
      await tx.medicalRecordVersion.create({
        data: {
          medicalRecordId: id,
          version: nextVersion,
          data: snapshot as any,
          changedBy: actorUserId,
          changeReason: changeReason || `Restored from version ${versionNumber}`,
        },
      });

      return {
        ...updatedRecord,
        diagnoses,
        treatmentPlans: plans,
        prescriptions,
        vitals: vital ? [vital] : [],
      };
    });

    // Logging & Compliance Auditing
    await AuditService.log(
      'MEDICAL_RECORD_UPDATED',
      'EMR',
      `Restored medical record ID '${id}' to version ${nextVersion} (from version ${versionNumber})`,
      actorUserId,
      ipAddress,
      userAgent
    );

    await this.logDataAccess(actorUserId, id, 'UPDATE', ipAddress, userAgent);

    return restored;
  }

  /**
   * Fetch EMR file by ID with HIPAA tracking and sensitive keyword event checks.
   */
  static async getMedicalRecordById(
    id: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    const record = await prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        diagnoses: true,
        treatmentPlans: true,
        prescriptions: { include: { medicines: true } },
        clinicalNotes: true,
        documents: { where: { isDeleted: false } },
        vitals: { orderBy: { recordedAt: 'desc' } },
      },
    });

    if (!record || record.isDeleted) {
      throw new Error(`Medical record with ID '${id}' not found`);
    }

    // HIPAA Sensitive Condition Record Access Monitoring
    const isSensitive = this.isSensitiveRecord(
      record.symptoms,
      record.observations,
      record.diagnoses
    );

    if (isSensitive) {
      const actorUser = await prisma.user.findUnique({ where: { id: actorUserId } });
      await prisma.securityEvent.create({
        data: {
          userId: actorUserId,
          eventType: 'SENSITIVE_RECORD_ACCESS',
          severity: 'HIGH',
          description: `Sensitive EMR Record Accessed: User '${actorUser?.email || actorUserId}' accessed sensitive medical record ID '${id}' for patient ID '${record.patientId}'.`,
          ipAddress: ipAddress || '127.0.0.1',
          userAgent: userAgent || 'System',
        },
      });
    }

    // Compliance audits
    await AuditService.log(
      'MEDICAL_RECORD_VIEWED',
      'EMR',
      `Viewed medical record ID '${id}'`,
      actorUserId,
      ipAddress,
      userAgent
    );

    await this.logDataAccess(actorUserId, id, 'READ', ipAddress, userAgent);

    return record;
  }

  /**
   * soft delete a medical record.
   */
  static async deleteMedicalRecord(
    id: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    const record = await prisma.medicalRecord.findUnique({ where: { id } });
    if (!record || record.isDeleted) {
      throw new Error(`Medical record with ID '${id}' not found`);
    }

    const deleted = await prisma.medicalRecord.update({
      where: { id },
      data: { isDeleted: true },
    });

    await AuditService.log(
      'MEDICAL_RECORD_UPDATED',
      'EMR',
      `Soft deleted medical record ID '${id}'`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return deleted;
  }

  /**
   * Add patient vitals.
   */
  static async addVital(
    patientId: string,
    data: EMRVitalInput & { medicalRecordId?: string },
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.isDeleted) {
      throw new Error(`Patient with ID '${patientId}' not found`);
    }

    const bmi = this.calculateBMI(data.weight, data.height);

    const vital = await prisma.patientVital.create({
      data: {
        patientId,
        medicalRecordId: data.medicalRecordId || null,
        bloodPressure: data.bloodPressure,
        heartRate: data.heartRate,
        respiratoryRate: data.respiratoryRate,
        temperature: data.temperature,
        oxygenSaturation: data.oxygenSaturation,
        height: data.height,
        weight: data.weight,
        bmi,
        recordedById: actorUserId,
      },
    });

    await AuditService.log(
      'MEDICAL_RECORD_ACCESS',
      'EMR',
      `Recorded vitals for patient ID '${patientId}'`,
      actorUserId,
      ipAddress,
      userAgent
    );

    await this.logDataAccess(actorUserId, vital.id, 'CREATE_VITAL', ipAddress, userAgent);

    return vital;
  }

  /**
   * Upload and attach a document.
   */
  static async addDocument(
    medicalRecordId: string,
    data: EMRDocumentInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    const record = await prisma.medicalRecord.findUnique({ where: { id: medicalRecordId } });
    if (!record || record.isDeleted) {
      throw new Error(`Medical record with ID '${medicalRecordId}' not found`);
    }

    const doc = await prisma.medicalDocument.create({
      data: {
        medicalRecordId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        uploadedById: actorUserId,
      },
    });

    await AuditService.log(
      'DOCUMENT_UPLOADED',
      'EMR',
      `Uploaded document '${data.fileName}' (${data.fileType}) for medical record ID '${medicalRecordId}'`,
      actorUserId,
      ipAddress,
      userAgent
    );

    await this.logDataAccess(actorUserId, doc.id, 'UPLOAD_DOC', ipAddress, userAgent);

    return doc;
  }

  /**
   * Retrieve version logs list.
   */
  static async getVersionLogs(medicalRecordId: string): Promise<any[]> {
    return prisma.medicalRecordVersion.findMany({
      where: { medicalRecordId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        changedBy: true,
        changeReason: true,
        createdAt: true,
      },
    });
  }

  /**
   * Retrieve details of a specific version snapshot.
   */
  static async getVersionDetails(medicalRecordId: string, versionNumber: number): Promise<any> {
    const version = await prisma.medicalRecordVersion.findFirst({
      where: { medicalRecordId, version: versionNumber },
    });
    if (!version) {
      throw new Error(`Version ${versionNumber} of medical record '${medicalRecordId}' not found`);
    }
    return version;
  }

  /**
   * Fetch EMR list with optional filters.
   */
  static async getMedicalRecords(options: {
    patientId?: string;
    doctorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ records: any[]; total: number }> {
    const { patientId, doctorId, limit = 50, offset = 0 } = options;
    const where: any = { isDeleted: false };
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;

    const [records, total] = await Promise.all([
      prisma.medicalRecord.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: true,
          doctor: true,
          diagnoses: true,
          treatmentPlans: true,
          prescriptions: { include: { medicines: true } },
          vitals: { orderBy: { recordedAt: 'desc' } },
        },
      }),
      prisma.medicalRecord.count({ where }),
    ]);

    return { records, total };
  }

  /**
   * Get EMR Patient Timeline.
   */
  static async getPatientTimeline(
    patientId: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PatientTimelineEvent[]> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        medicalRecords: {
          where: { isDeleted: false },
          include: { diagnoses: true, treatmentPlans: true, prescriptions: { include: { medicines: true } }, documents: { where: { isDeleted: false } } },
        },
        vitals: true,
        medicalHistory: true,
      },
    });

    if (!patient || patient.isDeleted) {
      throw new Error(`Patient with ID '${patientId}' not found`);
    }

    const allergies = await prisma.patientAllergy.findMany({ where: { patientId, isDeleted: false } });
    const conditions = await prisma.patientCondition.findMany({ where: { patientId, isDeleted: false } });

    const events: PatientTimelineEvent[] = [];

    // Add EMR visits
    for (const record of patient.medicalRecords) {
      events.push({
        id: record.id,
        type: 'VISIT',
        date: record.createdAt,
        title: `Clinical Visit with Doctor`,
        description: record.symptoms || 'Routine follow-up / general consultation',
        details: {
          observations: record.observations,
          followUpInstructions: record.followUpInstructions,
          version: record.version,
        },
      });

      // Add diagnoses from EMR
      for (const diag of record.diagnoses) {
        events.push({
          id: diag.id,
          type: 'DIAGNOSIS',
          date: diag.createdAt,
          title: `Diagnosed: ${diag.name} (${diag.code})`,
          description: `Severity: ${diag.severity}`,
          details: {
            notes: diag.notes,
            medicalRecordId: record.id,
          },
        });
      }

      // Add prescriptions
      for (const pres of record.prescriptions) {
        events.push({
          id: pres.id,
          type: 'PRESCRIPTION',
          date: pres.createdAt,
          title: 'Prescription Issued',
          description: pres.notes || 'Medicines prescribed by doctor',
          details: pres.medicines,
        });
      }

      // Add documents
      for (const doc of record.documents) {
        events.push({
          id: doc.id,
          type: 'DOCUMENT_UPLOAD',
          date: doc.createdAt,
          title: `Uploaded Document: ${doc.fileName}`,
          description: `Type: ${doc.fileType}`,
          details: {
            fileUrl: doc.fileUrl,
            fileSize: doc.fileSize,
          },
        });
      }
    }

    // Add standalone Vitals
    for (const vital of patient.vitals) {
      events.push({
        id: vital.id,
        type: 'VITAL_RECORD',
        date: vital.recordedAt,
        title: 'Vitals Recorded',
        description: `BP: ${vital.bloodPressure} | HR: ${vital.heartRate} bpm | Temp: ${vital.temperature} °C | SpO2: ${vital.oxygenSaturation}%`,
        details: {
          height: vital.height,
          weight: vital.weight,
          bmi: vital.bmi,
        },
      });
    }

    // Add allergies
    for (const allergy of allergies) {
      events.push({
        id: allergy.id,
        type: 'ALLERGY_RECORD',
        date: allergy.createdAt,
        title: `Allergy Recorded: ${allergenDisplayName(allergy.allergen)}`,
        description: `Reaction: ${allergy.reaction || 'None'} | Severity: ${allergy.severity}`,
        details: {
          diagnosedAt: allergy.diagnosedAt,
        },
      });
    }

    // Add conditions
    for (const condition of conditions) {
      events.push({
        id: condition.id,
        type: 'CONDITION_RECORD',
        date: condition.createdAt,
        title: `Condition Recorded: ${condition.name}`,
        description: `Status: ${condition.status} | Severity: ${condition.severity}`,
        details: {
          code: condition.code,
          diagnosedAt: condition.diagnosedAt,
        },
      });
    }

    // Sort descending by date
    events.sort((a, b) => b.date.getTime() - a.date.getTime());

    if (actorUserId) {
      await this.logDataAccess(actorUserId, patientId, 'READ_TIMELINE', ipAddress, userAgent);
    }

    return events;
  }

  /**
   * Fetch EMR Vitals history and trends.
   */
  static async getPatientVitals(patientId: string): Promise<{ trends: any; history: VitalTrendData[] }> {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient || patient.isDeleted) {
      throw new Error(`Patient with ID '${patientId}' not found`);
    }

    const vitals = await prisma.patientVital.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'asc' },
    });

    const history: VitalTrendData[] = vitals.map((v) => ({
      recordedAt: v.recordedAt,
      bloodPressure: v.bloodPressure,
      heartRate: Number(v.heartRate),
      respiratoryRate: Number(v.respiratoryRate),
      temperature: Number(v.temperature),
      oxygenSaturation: Number(v.oxygenSaturation),
      bmi: Number(v.bmi),
      weight: Number(v.weight),
    }));

    // Calculate aggregations for Trends
    if (vitals.length === 0) {
      return { trends: null, history: [] };
    }

    const hrValues = vitals.map((v) => v.heartRate);
    const tempValues = vitals.map((v) => Number(v.temperature));
    const spo2Values = vitals.map((v) => v.oxygenSaturation);
    const bmiValues = vitals.map((v) => Number(v.bmi));

    const trends = {
      heartRate: {
        min: Math.min(...hrValues),
        max: Math.max(...hrValues),
        avg: Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length),
      },
      temperature: {
        min: Math.min(...tempValues),
        max: Math.max(...tempValues),
        avg: Number((tempValues.reduce((a, b) => a + b, 0) / tempValues.length).toFixed(2)),
      },
      oxygenSaturation: {
        min: Math.min(...spo2Values),
        max: Math.max(...spo2Values),
        avg: Math.round(spo2Values.reduce((a, b) => a + b, 0) / spo2Values.length),
      },
      bmi: {
        min: Math.min(...bmiValues),
        max: Math.max(...bmiValues),
        avg: Number((bmiValues.reduce((a, b) => a + b, 0) / bmiValues.length).toFixed(2)),
      },
    };

    return { trends, history };
  }

  /**
   * Fetch EMR Diagnosis history.
   */
  static async getDiagnosisHistory(patientId: string): Promise<any[]> {
    return prisma.diagnosis.findMany({
      where: { medicalRecord: { patientId, isDeleted: false } },
      orderBy: { createdAt: 'desc' },
      include: {
        medicalRecord: {
          select: {
            doctorId: true,
            doctor: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  /**
   * Fetch EMR Prescription history.
   */
  static async getPrescriptionHistory(patientId: string): Promise<any[]> {
    return prisma.prescription.findMany({
      where: { medicalRecord: { patientId, isDeleted: false } },
      orderBy: { createdAt: 'desc' },
      include: {
        medicines: true,
        medicalRecord: {
          select: {
            doctorId: true,
            doctor: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  /**
   * Add Patient Allergy.
   */
  static async addAllergy(patientId: string, data: PatientAllergyInput): Promise<any> {
    return prisma.patientAllergy.create({
      data: {
        patientId,
        allergen: data.allergen,
        reaction: data.reaction || null,
        severity: data.severity,
        diagnosedAt: data.diagnosedAt ? new Date(data.diagnosedAt) : null,
      },
    });
  }

  /**
   * Add Patient Condition.
   */
  static async addCondition(patientId: string, data: PatientConditionInput): Promise<any> {
    return prisma.patientCondition.create({
      data: {
        patientId,
        code: data.code || null,
        name: data.name,
        status: data.status,
        severity: data.severity,
        diagnosedAt: data.diagnosedAt ? new Date(data.diagnosedAt) : null,
      },
    });
  }
}

function allergenDisplayName(allergen: string): string {
  return allergen.charAt(0).toUpperCase() + allergen.slice(1);
}
