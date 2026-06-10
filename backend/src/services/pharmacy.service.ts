import prisma from '../config/prisma';
import { AuditService } from './audit.service';
import {
  MedicineCreateInput,
  SupplierCreateInput,
  PurchaseOrderCreateInput,
  PrescriptionDispenseInput,
  MedicineSubstitutionInput,
  PharmacyDashboardMetricsResponse
} from '../types/pharmacy.types';

export class PharmacyService {
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
          resource: 'EMR', // Prescriptions belong to EMR
          resourceId,
          action,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to log Pharmacy data access:', error);
    }
  }

  // --- MEDICINE CATALOG MANAGEMENT ---

  static async createCategory(name: string, description?: string) {
    return prisma.medicineCategory.create({
      data: { name, description },
    });
  }

  static async createMedicine(
    data: MedicineCreateInput,
    userId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const medicine = await prisma.medicine.create({
      data: {
        name: data.name,
        genericName: data.genericName,
        brandName: data.brandName,
        strength: data.strength,
        dosageForm: data.dosageForm,
        manufacturer: data.manufacturer,
        categoryId: data.categoryId,
        prescriptionRequired: data.prescriptionRequired ?? true,
        price: data.price,
      },
    });

    await AuditService.log(
      'MEDICINE_CREATED',
      'MEDICINE',
      `Medicine registered: ${data.name} (${data.brandName}) - Strength: ${data.strength}`,
      userId,
      ipAddress,
      userAgent
    );

    return medicine;
  }

  static async updateMedicine(
    id: string,
    data: Partial<MedicineCreateInput>,
    userId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const updated = await prisma.medicine.update({
      where: { id },
      data: {
        name: data.name,
        genericName: data.genericName,
        brandName: data.brandName,
        strength: data.strength,
        dosageForm: data.dosageForm,
        manufacturer: data.manufacturer,
        categoryId: data.categoryId,
        prescriptionRequired: data.prescriptionRequired,
        price: data.price,
      },
    });

    await AuditService.log(
      'MEDICINE_UPDATED',
      'MEDICINE',
      `Medicine updated: ${updated.name}`,
      userId,
      ipAddress,
      userAgent
    );

    return updated;
  }

  static async searchMedicines(query: string) {
    return prisma.medicine.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { genericName: { contains: query, mode: 'insensitive' } },
          { brandName: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        category: true,
        inventories: true,
        batches: {
          where: {
            expiryDate: {
              gt: new Date(),
            },
            quantity: {
              gt: 0,
            },
          },
        },
      },
    });
  }

  // --- SUPPLIER & PROCUREMENT ---

  static async createSupplier(data: SupplierCreateInput) {
    return prisma.supplier.create({
      data: {
        name: data.name,
        contactName: data.contactName || null,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        performanceScore: data.performanceScore || 5.0,
      },
    });
  }

  static async createPurchaseOrder(
    data: PurchaseOrderCreateInput,
    userId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const orderNumber = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Calculate total amount
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const po = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: data.supplierId,
        status: 'PENDING',
        totalAmount,
        items: {
          create: data.items.map((item) => ({
            medicineId: item.medicineId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            batchNumber: item.batchNumber || null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    await AuditService.log(
      'PURCHASE_ORDER_CREATED',
      'PURCHASE_ORDER',
      `Purchase order created: ${orderNumber} for supplier ${data.supplierId}. Total: ${totalAmount}`,
      userId,
      ipAddress,
      userAgent
    );

    return po;
  }

  static async receivePurchaseOrder(
    poId: string,
    userId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    });

    if (!po) throw new Error(`Purchase order with ID '${poId}' not found`);
    if (po.status === 'RECEIVED') throw new Error('Purchase order is already received');

    // Update PO status to RECEIVED
    const updatedPo = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: 'RECEIVED' },
    });

    // Populate batches and inventory levels
    for (const item of po.items) {
      const batchNum = item.batchNumber || `BATCH-${Date.now()}`;
      const expiry = item.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year default

      // Create/Update Batch
      await prisma.medicineBatch.upsert({
        where: {
          medicineId_batchNumber: {
            medicineId: item.medicineId,
            batchNumber: batchNum,
          },
        },
        update: {
          quantity: {
            increment: item.quantity,
          },
        },
        create: {
          batchNumber: batchNum,
          medicineId: item.medicineId,
          quantity: item.quantity,
          expiryDate: expiry,
          supplierId: po.supplierId,
          purchaseOrderId: poId,
        },
      });

      // Update Inventory
      const existingInventory = await prisma.medicineInventory.findFirst({
        where: {
          medicineId: item.medicineId,
          supplierId: po.supplierId,
        },
      });

      if (existingInventory) {
        await prisma.medicineInventory.update({
          where: { id: existingInventory.id },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        });
      } else {
        await prisma.medicineInventory.create({
          data: {
            medicineId: item.medicineId,
            quantity: item.quantity,
            minStockLevel: 20, // Default minimum level
            supplierId: po.supplierId,
          },
        });
      }

      // Record Stock Movement
      await prisma.stockMovement.create({
        data: {
          medicineId: item.medicineId,
          batchNumber: batchNum,
          type: 'IN',
          quantity: item.quantity,
          reason: `Procured stock from PO ${po.orderNumber}`,
          userId,
        },
      });
    }

    await AuditService.log(
      'INVENTORY_UPDATED',
      'INVENTORY',
      `Inventory updated from received purchase order: ${po.orderNumber}`,
      userId,
      ipAddress,
      userAgent
    );

    return updatedPo;
  }

  // --- PRESCRIPTION FULFILLMENT & DISPENSING ---

  static async dispensePrescription(
    data: PrescriptionDispenseInput,
    userId: string,
    ipAddress: string = '127.0.0.1',
    userAgent: string = 'System'
  ) {
    const prescription = await prisma.prescription.findUnique({
      where: { id: data.prescriptionId },
      include: { medicines: true },
    });

    if (!prescription) throw new Error(`Prescription with ID '${data.prescriptionId}' not found`);

    // Verify if prescription has already been completed
    const existingDispenses = await prisma.prescriptionDispense.findMany({
      where: { prescriptionId: data.prescriptionId },
    });
    const isAlreadyCompleted = existingDispenses.some((d) => d.status === 'COMPLETED');
    if (isAlreadyCompleted) {
      throw new Error('Prescription has already been fully completed and dispensed');
    }

    let totalDispensedCost = 0;
    const dispenseItemsDetails = [];

    // Fulfill each requested medicine item
    for (const item of data.items) {
      // 1. Fetch medicine
      const medicine = await prisma.medicine.findUnique({ where: { id: item.medicineId } });
      if (!medicine) throw new Error(`Medicine with ID '${item.medicineId}' not found`);

      // 2. Fetch selected batch and check expiry
      const batch = await prisma.medicineBatch.findUnique({
        where: {
          medicineId_batchNumber: {
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
          },
        },
      });

      if (!batch) {
        throw new Error(`Batch '${item.batchNumber}' for medicine '${medicine.name}' not found`);
      }

      const isExpired = new Date(batch.expiryDate).getTime() < Date.now();
      if (isExpired) {
        // Trigger Security Event for expired dispensing attempt
        await prisma.securityEvent.create({
          data: {
            userId,
            eventType: 'SUSPICIOUS_ACTIVITY',
            severity: 'HIGH',
            description: `Attempted to dispense expired medicine batch: ${medicine.name} (Batch: ${item.batchNumber}, Expired At: ${batch.expiryDate.toISOString()})`,
            ipAddress,
            userAgent,
          },
        });

        // Trigger Audit EXPIRY_ALERT
        await AuditService.log(
          'EXPIRY_ALERT',
          'MEDICINE',
          `EXPIRED DISPENSING PREVENTED: ${medicine.name} (Batch: ${item.batchNumber})`,
          userId,
          ipAddress,
          userAgent
        );

        throw new Error(`Cannot dispense medicine: Selected batch '${item.batchNumber}' is expired!`);
      }

      // 3. Check inventory stock levels
      const inventory = await prisma.medicineInventory.findFirst({
        where: { medicineId: item.medicineId },
      });

      if (!inventory || inventory.quantity < item.quantity) {
        throw new Error(`Insufficient stock for medicine '${medicine.name}'. Available: ${inventory?.quantity || 0}, Requested: ${item.quantity}`);
      }

      // 4. Update Inventory Quantity & Batch levels
      const finalInventoryQuantity = inventory.quantity - item.quantity;
      await prisma.medicineInventory.update({
        where: { id: inventory.id },
        data: {
          quantity: finalInventoryQuantity,
        },
      });

      await prisma.medicineBatch.update({
        where: { id: batch.id },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });

      // 5. Create Stock Movement
      await prisma.stockMovement.create({
        data: {
          medicineId: item.medicineId,
          batchNumber: item.batchNumber,
          type: 'OUT',
          quantity: item.quantity,
          reason: `Dispensed for prescription ${data.prescriptionId}`,
          userId,
        },
      });

      // 6. Raise alerts if inventory falls below reorder limits
      if (finalInventoryQuantity <= inventory.minStockLevel) {
        await AuditService.log(
          'LOW_STOCK_ALERT',
          'INVENTORY',
          `Low stock warning raised for medicine: ${medicine.name}. Stock remaining: ${finalInventoryQuantity}`,
          userId,
          ipAddress,
          userAgent
        );
      }

      totalDispensedCost += item.quantity * Number(medicine.price);

      dispenseItemsDetails.push({
        medicineId: item.medicineId,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
      });
    }

    // Determine status (For simplified rule, we assume this completes dispensing of the PO)
    const dispenseStatus = 'COMPLETED';

    // 7. Create Dispense Log
    const dispense = await prisma.prescriptionDispense.create({
      data: {
        prescriptionId: data.prescriptionId,
        pharmacistId: userId,
        status: dispenseStatus,
        notes: data.notes || null,
        items: {
          create: dispenseItemsDetails,
        },
      },
      include: {
        items: true,
      },
    });

    // 8. Create PharmacyTransaction Billing Record
    const txNum = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const transaction = await prisma.pharmacyTransaction.create({
      data: {
        transactionNumber: txNum,
        dispenseId: dispense.id,
        type: 'SALE',
        totalAmount: totalDispensedCost,
        paymentMethod: data.paymentMethod,
      },
    });

    // Log Compliance & Audit Events
    await this.logDataAccess(userId, data.prescriptionId, 'READ', ipAddress, userAgent);

    await AuditService.log(
      'MEDICINE_DISPENSED',
      'PRESCRIPTION',
      `Fulfillment dispense completed for prescription ${data.prescriptionId}. Transaction: ${txNum}`,
      userId,
      ipAddress,
      userAgent
    );

    return {
      dispense,
      transaction,
    };
  }

  static async getDispenseHistory(prescriptionId: string, userId: string) {
    // Log Compliance check
    await this.logDataAccess(userId, prescriptionId, 'READ');

    return prisma.prescriptionDispense.findMany({
      where: { prescriptionId },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
        transactions: true,
        pharmacist: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { dispensedAt: 'desc' },
    });
  }

  // --- SUBSTITUTION MAPPING ---

  static async createSubstitution(data: MedicineSubstitutionInput) {
    if (data.originalMedicineId === data.substituteMedicineId) {
      throw new Error('A medicine cannot be substituted with itself');
    }
    return prisma.medicineSubstitution.create({
      data: {
        originalMedicineId: data.originalMedicineId,
        substituteMedicineId: data.substituteMedicineId,
        notes: data.notes || null,
      },
    });
  }

  static async getSubstitutes(medicineId: string) {
    return prisma.medicineSubstitution.findMany({
      where: { originalMedicineId: medicineId },
      include: {
        substituteMedicine: {
          include: {
            inventories: true,
            batches: {
              where: {
                expiryDate: {
                  gt: new Date(),
                },
                quantity: {
                  gt: 0,
                },
              },
            },
          },
        },
      },
    });
  }

  // --- DASHBOARD & METRICS ---

  static async getDashboardMetrics(): Promise<PharmacyDashboardMetricsResponse> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const next30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [
      dailyDispensedCount,
      lowStockItems,
      expiringBatches,
      transactionsToday,
      suppliers,
    ] = await Promise.all([
      // Count of dispenses today
      prisma.prescriptionDispense.count({
        where: {
          dispensedAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),
      // Low stock inventories
      prisma.medicineInventory.findMany({
        where: {
          quantity: {
            lte: prisma.medicineInventory.fields.minStockLevel,
          },
        },
        include: {
          medicine: true,
        },
      }),
      // Batches expiring in next 30 days
      prisma.medicineBatch.findMany({
        where: {
          expiryDate: {
            gt: new Date(),
            lte: next30Days,
          },
        },
        include: {
          medicine: true,
        },
      }),
      // Sales today
      prisma.pharmacyTransaction.findMany({
        where: {
          type: 'SALE',
          timestamp: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),
      // Suppliers list
      prisma.supplier.findMany({
        orderBy: { performanceScore: 'desc' },
      }),
    ]);

    const totalRevenueToday = transactionsToday.reduce(
      (sum, tx) => sum + Number(tx.totalAmount),
      0
    );

    const supplierPerformance = suppliers.map((s) => ({
      supplierId: s.id,
      name: s.name,
      performanceScore: s.performanceScore ? Number(s.performanceScore) : 0,
    }));

    return {
      dailyDispensedCount,
      lowStockItemsCount: lowStockItems.length,
      expiringItemsCount: expiringBatches.length,
      totalRevenueToday,
      lowStockAlerts: lowStockItems,
      expiringBatches,
      supplierPerformance,
    };
  }

  // --- ADVANCED SEARCH AND HISTORY DETAILS ---

  static async getStockMovements(medicineId: string) {
    return prisma.stockMovement.findMany({
      where: { medicineId },
      orderBy: { timestamp: 'desc' },
    });
  }
}
