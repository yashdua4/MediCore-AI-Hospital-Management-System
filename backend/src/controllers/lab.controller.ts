import { Response } from 'express';
import { CustomRequest } from '../types/auth.types';
import { LabService } from '../services/lab.service';
import {
  createLabOrderSchema,
  assignTechnicianSchema,
  collectSampleSchema,
  enterResultsSchema,
  approveResultsSchema,
  labInventoryItemSchema,
} from '../validators/lab.validator';

export class LabController {
  // --- CATALOG MANAGEMENT ---

  static async createCategory(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Bad Request', message: 'Category name is required' });
      }
      const category = await LabService.createCategory(name, description);
      return res.status(201).json({
        message: 'Lab category created successfully',
        data: category,
      });
    } catch (error: any) {
      console.error('Error in createCategory:', error);
      if (error.message?.includes('already exists') || error.code === 'P2002') {
        return res.status(409).json({ error: 'Conflict', message: 'Category name already exists' });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create lab category' });
    }
  }

  static async createLabTest(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { categoryId, name, code, price, testType, description } = req.body;
      if (!categoryId || !name || !code || price === undefined || !testType) {
        return res.status(400).json({ error: 'Bad Request', message: 'Missing required fields' });
      }
      const labTest = await LabService.createLabTest({
        categoryId,
        name,
        code,
        price: Number(price),
        testType,
        description,
      });
      return res.status(201).json({
        message: 'Lab test created successfully',
        data: labTest,
      });
    } catch (error: any) {
      console.error('Error in createLabTest:', error);
      if (error.message?.includes('already exists') || error.code === 'P2002') {
        return res.status(409).json({ error: 'Conflict', message: 'Lab test name or code already exists' });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create lab test' });
    }
  }

  static async createReferenceRange(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { labTestId, parameter, gender, ageMin, ageMax, rangeMin, rangeMax, unit } = req.body;
      if (!labTestId || !parameter || !gender || rangeMin === undefined || rangeMax === undefined || !unit) {
        return res.status(400).json({ error: 'Bad Request', message: 'Missing required fields' });
      }
      const range = await LabService.createReferenceRange({
        labTestId,
        parameter,
        gender,
        ageMin: ageMin !== undefined ? Number(ageMin) : undefined,
        ageMax: ageMax !== undefined ? Number(ageMax) : undefined,
        rangeMin: Number(rangeMin),
        rangeMax: Number(rangeMax),
        unit,
      });
      return res.status(201).json({
        message: 'Lab reference range created successfully',
        data: range,
      });
    } catch (error: any) {
      console.error('Error in createReferenceRange:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create reference range' });
    }
  }

  // --- ORDER LIFE CYCLE ---

  static async createLabOrder(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createLabOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const order = await LabService.createLabOrder(
        parsed.data,
        req.user?.userId || 'system',
        req.ip,
        req.headers['user-agent']
      );

      return res.status(201).json({
        message: 'Lab order created successfully',
        data: order,
      });
    } catch (error: any) {
      console.error('Error in createLabOrder:', error);
      const message = error.message;
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create lab order' });
    }
  }

  static async receiveOrder(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const order = await LabService.receiveOrder(
        id,
        req.user?.userId || 'system',
        req.ip,
        req.headers['user-agent']
      );
      return res.status(200).json({
        message: 'Lab order received successfully',
        data: order,
      });
    } catch (error: any) {
      console.error('Error in receiveOrder:', error);
      const message = error.message;
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to receive lab order' });
    }
  }

  static async assignTechnician(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const parsed = assignTechnicianSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const assignment = await LabService.assignTechnician(
        id,
        parsed.data,
        req.user?.userId || 'system',
        req.ip,
        req.headers['user-agent']
      );

      return res.status(200).json({
        message: 'Technician assigned successfully',
        data: assignment,
      });
    } catch (error: any) {
      console.error('Error in assignTechnician:', error);
      const message = error.message;
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('not authorized') || message.includes('not a lab technician')) {
        return res.status(403).json({ error: 'Forbidden', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to assign technician' });
    }
  }

  static async collectSample(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const parsed = collectSampleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const sample = await LabService.collectSample(
        id,
        parsed.data,
        req.user?.userId || 'system',
        req.ip,
        req.headers['user-agent']
      );

      return res.status(201).json({
        message: 'Sample collected successfully',
        data: sample,
      });
    } catch (error: any) {
      console.error('Error in collectSample:', error);
      const message = error.message;
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to collect sample' });
    }
  }

  static async updateSampleStatus(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { sampleId } = req.params;
      const { status, rejectionReason } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Bad Request', message: 'Status is required' });
      }

      const sample = await LabService.updateSampleStatus(
        sampleId,
        status,
        rejectionReason,
        req.user?.userId || 'system'
      );

      return res.status(200).json({
        message: 'Sample status updated successfully',
        data: sample,
      });
    } catch (error: any) {
      console.error('Error in updateSampleStatus:', error);
      const message = error.message;
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update sample status' });
    }
  }

  static async enterResults(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const parsed = enterResultsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const results = await LabService.enterResults(
        id,
        parsed.data,
        req.user?.userId || 'system',
        req.ip,
        req.headers['user-agent']
      );

      return res.status(200).json({
        message: 'Results entered successfully',
        data: results,
      });
    } catch (error: any) {
      console.error('Error in enterResults:', error);
      const message = error.message;
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to enter results' });
    }
  }

  static async approveResults(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const parsed = approveResultsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }
      // Even if schema checks are optional, let's keep robust handling
      const approverId = req.user?.userId || 'system';

      const report = await LabService.approveResults(
        id,
        approverId,
        req.ip,
        req.headers['user-agent']
      );

      return res.status(200).json({
        message: 'Results approved and lab report generated successfully',
        data: report,
      });
    } catch (error: any) {
      console.error('Error in approveResults:', error);
      const message = error.message;
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('Cannot approve')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to approve results' });
    }
  }

  static async getReport(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { reportId } = req.params;
      const report = await LabService.getReport(
        reportId,
        req.user?.userId || 'system',
        req.ip,
        req.headers['user-agent']
      );
      return res.status(200).json({
        data: report,
      });
    } catch (error: any) {
      console.error('Error in getReport:', error);
      const message = error.message;
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('Access denied') || message.includes('permission')) {
        return res.status(403).json({ error: 'Forbidden', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve report' });
    }
  }

  static async cancelOrder(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const order = await LabService.cancelOrder(
        id,
        req.user?.userId || 'system',
        req.ip,
        req.headers['user-agent']
      );
      return res.status(200).json({
        message: 'Lab order cancelled successfully',
        data: order,
      });
    } catch (error: any) {
      console.error('Error in cancelOrder:', error);
      const message = error.message;
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('Cannot cancel')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to cancel order' });
    }
  }

  // --- INVENTORY MANAGEMENT ---

  static async listInventory(_req: CustomRequest, res: Response): Promise<Response> {
    try {
      const items = await LabService.listInventory();
      return res.status(200).json({
        data: items,
      });
    } catch (error: any) {
      console.error('Error in listInventory:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve inventory items' });
    }
  }

  static async addInventoryItem(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = labInventoryItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const item = await LabService.addInventoryItem(parsed.data);
      return res.status(201).json({
        message: 'Inventory item added successfully',
        data: item,
      });
    } catch (error: any) {
      console.error('Error in addInventoryItem:', error);
      if (error.message?.includes('already exists') || error.code === 'P2002') {
        return res.status(409).json({ error: 'Conflict', message: 'Inventory item with name already exists' });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to add inventory item' });
    }
  }

  static async updateInventoryQuantity(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { quantity } = req.body;
      if (quantity === undefined || typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({ error: 'Bad Request', message: 'Valid non-negative quantity is required' });
      }

      const item = await LabService.updateInventoryQuantity(id, quantity);
      return res.status(200).json({
        message: 'Inventory quantity updated successfully',
        data: item,
      });
    } catch (error: any) {
      console.error('Error in updateInventoryQuantity:', error);
      const message = error.message;
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update inventory quantity' });
    }
  }

  // --- EQUIPMENT MANAGEMENT ---

  static async listEquipment(_req: CustomRequest, res: Response): Promise<Response> {
    try {
      const list = await LabService.listEquipment();
      return res.status(200).json({
        data: list,
      });
    } catch (error: any) {
      console.error('Error in listEquipment:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to list equipment' });
    }
  }

  static async addEquipment(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { name, modelNumber, serialNumber, status, lastCalibration, nextCalibration } = req.body;
      if (!name || !status) {
        return res.status(400).json({ error: 'Bad Request', message: 'Name and status are required' });
      }

      const eq = await LabService.addEquipment({
        name,
        modelNumber,
        serialNumber,
        status,
        lastCalibration: lastCalibration ? new Date(lastCalibration) : undefined,
        nextCalibration: nextCalibration ? new Date(nextCalibration) : undefined,
      });

      return res.status(201).json({
        message: 'Lab equipment added successfully',
        data: eq,
      });
    } catch (error: any) {
      console.error('Error in addEquipment:', error);
      if (error.message?.includes('already exists') || error.code === 'P2002') {
        return res.status(409).json({ error: 'Conflict', message: 'Equipment name or serial number already exists' });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to add equipment' });
    }
  }

  static async updateEquipmentStatus(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status || !['OPERATIONAL', 'MAINTENANCE', 'DOWN'].includes(status)) {
        return res.status(400).json({ error: 'Bad Request', message: 'Valid status is required' });
      }

      const eq = await LabService.updateEquipmentStatus(id, status);
      return res.status(200).json({
        message: 'Equipment status updated successfully',
        data: eq,
      });
    } catch (error: any) {
      console.error('Error in updateEquipmentStatus:', error);
      const message = error.message;
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update equipment status' });
    }
  }

  // --- DASHBOARDS & METRICS ---

  static async getDashboardMetrics(_req: CustomRequest, res: Response): Promise<Response> {
    try {
      const metrics = await LabService.getDashboardMetrics();
      return res.status(200).json({
        data: metrics,
      });
    } catch (error: any) {
      console.error('Error in getDashboardMetrics:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve dashboard metrics' });
    }
  }

  static async getCriticalAlerts(_req: CustomRequest, res: Response): Promise<Response> {
    try {
      const alerts = await LabService.getCriticalAlerts();
      return res.status(200).json({
        data: alerts,
      });
    } catch (error: any) {
      console.error('Error in getCriticalAlerts:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve critical alerts' });
    }
  }

  static async getTechnicianPendingTasks(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const technicianId = req.user?.userId;
      if (!technicianId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Missing technician authentication context' });
      }
      const tasks = await LabService.getTechnicianPendingTasks(technicianId);
      return res.status(200).json({
        data: tasks,
      });
    } catch (error: any) {
      console.error('Error in getTechnicianPendingTasks:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve technician pending tasks' });
    }
  }
}
