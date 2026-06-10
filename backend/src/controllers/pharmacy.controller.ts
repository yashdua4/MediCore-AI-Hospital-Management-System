import { Response } from 'express';
import { CustomRequest } from '../types/auth.types';
import { PharmacyService } from '../services/pharmacy.service';
import {
  createMedicineSchema,
  updateMedicineSchema,
  createSupplierSchema,
  createPurchaseOrderSchema,
  dispensePrescriptionSchema,
  createSubstitutionSchema
} from '../validators/pharmacy.validator';

export class PharmacyController {
  // --- CATALOG MANAGEMENT ---

  static async createCategory(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Bad Request', message: 'Category name is required' });
      }
      const category = await PharmacyService.createCategory(name, description);
      return res.status(201).json({
        message: 'Category created successfully',
        data: category,
      });
    } catch (error: any) {
      console.error('Error in createCategory:', error);
      if (error.message?.includes('already exists') || error.code === 'P2002') {
        return res.status(409).json({ error: 'Conflict', message: 'Category name already exists' });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create category' });
    }
  }

  static async createMedicine(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createMedicineSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const medicine = await PharmacyService.createMedicine(
        parsed.data,
        req.user?.userId || 'system',
        req.ip,
        req.headers['user-agent']
      );

      return res.status(201).json({
        message: 'Medicine created successfully',
        data: medicine,
      });
    } catch (error: any) {
      console.error('Error in createMedicine:', error);
      if (error.message?.includes('already exists') || error.code === 'P2002') {
        return res.status(409).json({ error: 'Conflict', message: 'Medicine with name already exists' });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create medicine' });
    }
  }

  static async updateMedicine(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const parsed = updateMedicineSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const medicine = await PharmacyService.updateMedicine(
        id,
        parsed.data,
        req.user?.userId || 'system',
        req.ip,
        req.headers['user-agent']
      );

      return res.status(200).json({
        message: 'Medicine updated successfully',
        data: medicine,
      });
    } catch (error: any) {
      console.error('Error in updateMedicine:', error);
      const message = error.message;
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update medicine' });
    }
  }

  static async searchMedicines(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const query = (req.query.q as string) || '';
      const list = await PharmacyService.searchMedicines(query);
      return res.status(200).json({
        data: list,
      });
    } catch (error: any) {
      console.error('Error in searchMedicines:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to search medicines' });
    }
  }

  // --- SUPPLIER & PROCUREMENT ---

  static async createSupplier(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createSupplierSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const supplier = await PharmacyService.createSupplier(parsed.data);
      return res.status(201).json({
        message: 'Supplier created successfully',
        data: supplier,
      });
    } catch (error: any) {
      console.error('Error in createSupplier:', error);
      if (error.message?.includes('already exists') || error.code === 'P2002') {
        return res.status(409).json({ error: 'Conflict', message: 'Supplier with name already exists' });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create supplier' });
    }
  }

  static async createPurchaseOrder(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createPurchaseOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const po = await PharmacyService.createPurchaseOrder(
        parsed.data,
        req.user?.userId || 'system',
        req.ip,
        req.headers['user-agent']
      );

      return res.status(201).json({
        message: 'Purchase order created successfully',
        data: po,
      });
    } catch (error: any) {
      console.error('Error in createPurchaseOrder:', error);
      const message = error.message;
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create purchase order' });
    }
  }

  static async receivePurchaseOrder(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const po = await PharmacyService.receivePurchaseOrder(
        id,
        req.user?.userId || 'system',
        req.ip,
        req.headers['user-agent']
      );

      return res.status(200).json({
        message: 'Purchase order stock received and updated in inventory successfully',
        data: po,
      });
    } catch (error: any) {
      console.error('Error in receivePurchaseOrder:', error);
      const message = error.message;
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('already received')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to receive purchase order stock' });
    }
  }

  // --- PRESCRIPTION FULFILLMENT & DISPENSING ---

  static async dispensePrescription(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = dispensePrescriptionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const result = await PharmacyService.dispensePrescription(
        parsed.data,
        req.user?.userId || 'system',
        req.ip,
        req.headers['user-agent']
      );

      return res.status(200).json({
        message: 'Prescription medicines dispensed successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Error in dispensePrescription:', error);
      const message = error.message;
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('expired') || message.includes('Insufficient stock') || message.includes('already been fully completed')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to dispense prescription' });
    }
  }

  static async getDispenseHistory(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { prescriptionId } = req.params;
      const list = await PharmacyService.getDispenseHistory(
        prescriptionId,
        req.user?.userId || 'system'
      );
      return res.status(200).json({
        data: list,
      });
    } catch (error: any) {
      console.error('Error in getDispenseHistory:', error);
      const message = error.message;
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve dispense history' });
    }
  }

  // --- SUBSTITUTIONS MAPPING ---

  static async createSubstitution(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createSubstitutionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const sub = await PharmacyService.createSubstitution(parsed.data);
      return res.status(201).json({
        message: 'Medicine substitution map created successfully',
        data: sub,
      });
    } catch (error: any) {
      console.error('Error in createSubstitution:', error);
      if (error.message?.includes('already exists') || error.code === 'P2002') {
        return res.status(409).json({ error: 'Conflict', message: 'Substitution mapping already exists' });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to map substitution' });
    }
  }

  static async getSubstitutes(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { medicineId } = req.params;
      const list = await PharmacyService.getSubstitutes(medicineId);
      return res.status(200).json({
        data: list,
      });
    } catch (error: any) {
      console.error('Error in getSubstitutes:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get substitutes' });
    }
  }

  // --- DASHBOARD & METRICS ---

  static async getDashboardMetrics(_req: CustomRequest, res: Response): Promise<Response> {
    try {
      const metrics = await PharmacyService.getDashboardMetrics();
      return res.status(200).json({
        data: metrics,
      });
    } catch (error: any) {
      console.error('Error in getDashboardMetrics:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve dashboard metrics' });
    }
  }

  static async getStockMovements(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { medicineId } = req.params;
      const list = await PharmacyService.getStockMovements(medicineId);
      return res.status(200).json({
        data: list,
      });
    } catch (error: any) {
      console.error('Error in getStockMovements:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve stock movements' });
    }
  }
}
