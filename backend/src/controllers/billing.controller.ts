import { Response } from 'express';
import { CustomRequest } from '../types/auth.types';
import { BillingService } from '../services/billing.service';
import prisma from '../config/prisma';
import {
  createInvoiceSchema,
  receivePaymentSchema,
  requestRefundSchema,
  processRefundSchema,
  createProviderSchema,
  createPolicySchema,
  submitClaimSchema,
  processClaimSchema,
} from '../validators/billing.validator';

export class BillingController {
  /**
   * Create a draft invoice.
   */
  static async createInvoice(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createInvoiceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User context missing' });
      }

      const invoice = await BillingService.createInvoice(parsed.data, actorUserId, ipAddress, userAgent);
      return res.status(201).json({
        message: 'Invoice draft created successfully',
        data: invoice,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in createInvoice:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create invoice draft' });
    }
  }

  /**
   * Finalize a draft invoice.
   */
  static async finalizeInvoice(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User context missing' });
      }

      const invoice = await BillingService.finalizeInvoice(id, actorUserId, ipAddress, userAgent);
      return res.status(200).json({
        message: 'Invoice finalized successfully',
        data: invoice,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('already been finalized')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in finalizeInvoice:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to finalize invoice' });
    }
  }

  /**
   * Cancel an invoice.
   */
  static async cancelInvoice(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User context missing' });
      }

      const invoice = await BillingService.cancelInvoice(id, actorUserId, ipAddress, userAgent);
      return res.status(200).json({
        message: 'Invoice cancelled successfully',
        data: invoice,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('Cannot cancel invoice') || message.includes('already')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in cancelInvoice:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to cancel invoice' });
    }
  }

  /**
   * Record a payment against an invoice.
   */
  static async recordPayment(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params; // invoiceId
      const parsed = receivePaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User context missing' });
      }

      const result = await BillingService.recordPayment(id, parsed.data, actorUserId, ipAddress, userAgent);
      return res.status(201).json({
        message: 'Payment recorded successfully',
        data: result,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('exceeds') || message.includes('only be recorded')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in recordPayment:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to record payment' });
    }
  }

  /**
   * Request a refund.
   */
  static async requestRefund(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { paymentId } = req.params;
      const parsed = requestRefundSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User context missing' });
      }

      const refund = await BillingService.requestRefund(paymentId, parsed.data, actorUserId, ipAddress, userAgent);
      return res.status(201).json({
        message: 'Refund requested successfully',
        data: refund,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('exceeds') || message.includes('only be requested')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in requestRefund:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to request refund' });
    }
  }

  /**
   * Process/Approve/Reject a refund.
   */
  static async processRefund(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { refundId } = req.params;
      const parsed = processRefundSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User context missing' });
      }

      const refund = await BillingService.processRefund(refundId, parsed.data, actorUserId, ipAddress, userAgent);
      return res.status(200).json({
        message: `Refund processed: ${parsed.data.status}`,
        data: refund,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('already been processed')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in processRefund:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to process refund' });
    }
  }

  /**
   * Create an insurance provider.
   */
  static async createProvider(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createProviderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const provider = await BillingService.createProvider(parsed.data);
      return res.status(201).json({
        message: 'Insurance provider registered successfully',
        data: provider,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('already exists')) {
        return res.status(409).json({ error: 'Conflict', message });
      }
      console.error('Error in createProvider:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create provider' });
    }
  }

  /**
   * Create an insurance policy.
   */
  static async createPolicy(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createPolicySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const policy = await BillingService.createPolicy(parsed.data);
      return res.status(201).json({
        message: 'Insurance policy registered successfully',
        data: policy,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('already exists')) {
        return res.status(409).json({ error: 'Conflict', message });
      }
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in createPolicy:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create policy' });
    }
  }

  /**
   * Submit insurance claim.
   */
  static async submitInsuranceClaim(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = submitClaimSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User context missing' });
      }

      const claim = await BillingService.submitInsuranceClaim(parsed.data, actorUserId, ipAddress, userAgent);
      return res.status(201).json({
        message: 'Insurance claim submitted successfully',
        data: claim,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('exceeds') || message.includes('expired') || message.includes('not active') || message.includes('does not match') || message.includes('Claims can only be generated')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in submitInsuranceClaim:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to submit claim' });
    }
  }

  /**
   * Process/Review/Settle insurance claim.
   */
  static async processInsuranceClaim(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { claimId } = req.params;
      const parsed = processClaimSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User context missing' });
      }

      const claim = await BillingService.processInsuranceClaim(claimId, parsed.data, actorUserId, ipAddress, userAgent);
      return res.status(200).json({
        message: `Insurance claim processed: ${parsed.data.status}`,
        data: claim,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('exceeds') || message.includes('already been processed')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in processInsuranceClaim:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to process claim' });
    }
  }

  /**
   * Get invoice report.
   */
  static async getInvoice(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      const invoice = await BillingService.getInvoiceById(id, actorUserId, ipAddress, userAgent);
      if (!invoice) {
        return res.status(404).json({ error: 'Not Found', message: `Invoice with ID '${id}' not found` });
      }

      // RBAC/Ownership check:
      // Patients can only view their own invoices
      const isPatient = req.user?.roles.includes('PATIENT');
      if (isPatient && invoice.patient.userId !== actorUserId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access Denied: You can only access your own invoices',
        });
      }

      return res.status(200).json({
        data: invoice,
      });
    } catch (error: unknown) {
      console.error('Error in getInvoice:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get invoice details' });
    }
  }

  /**
   * Get all invoices for a patient.
   */
  static async getPatientInvoices(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { patientId } = req.params;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      // Check Patient ownership
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
      });
      if (!patient) {
        return res.status(404).json({ error: 'Not Found', message: `Patient with ID '${patientId}' not found` });
      }

      const isPatient = req.user?.roles.includes('PATIENT');
      if (isPatient && patient.userId !== actorUserId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access Denied: You can only access your own patient invoices',
        });
      }

      const invoices = await BillingService.getPatientInvoices(patientId, actorUserId, ipAddress, userAgent);
      return res.status(200).json({
        data: invoices,
      });
    } catch (error: unknown) {
      console.error('Error in getPatientInvoices:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get patient invoices' });
    }
  }

  /**
   * Get Revenue Dashboard metrics.
   */
  static async getRevenueDashboard(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      const metrics = await BillingService.getRevenueDashboard(actorUserId, ipAddress, userAgent);
      return res.status(200).json({
        data: metrics,
      });
    } catch (error: unknown) {
      console.error('Error in getRevenueDashboard:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to aggregate revenue metrics' });
    }
  }

  /**
   * Get Insurance Dashboard metrics.
   */
  static async getInsuranceDashboard(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'System';
      const actorUserId = req.user?.userId;

      const metrics = await BillingService.getInsuranceDashboard(actorUserId, ipAddress, userAgent);
      return res.status(200).json({
        data: metrics,
      });
    } catch (error: unknown) {
      console.error('Error in getInsuranceDashboard:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to aggregate insurance metrics' });
    }
  }
}
