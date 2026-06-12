import { Response } from 'express';
import { CustomRequest } from '../types/auth.types';
import { AiService } from '../services/ai.service';
import { RoleType } from '@prisma/client';

export class AiController {
  /**
   * Get all conversations for the authenticated user (scoped by role)
   */
  static async getConversations(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Missing user context' });
      }

      // Default to the current logged-in role
      const role = (req.query.role as RoleType) || req.user?.role || RoleType.PATIENT;
      
      const conversations = await AiService.getConversations(userId, role);
      return res.status(200).json({
        message: 'Conversations retrieved successfully',
        data: conversations,
      });
    } catch (error: any) {
      console.error('Error in getConversations:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve conversations' });
    }
  }

  /**
   * Get single conversation details with message stream
   */
  static async getConversationDetails(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Missing user context' });
      }

      const conversation = await AiService.getConversationDetails(userId, id);
      return res.status(200).json({
        message: 'Conversation details retrieved successfully',
        data: conversation,
      });
    } catch (error: any) {
      console.error('Error in getConversationDetails:', error);
      const message = error.message;
      if (message.includes('not found') || message.includes('access denied')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve conversation details' });
    }
  }

  /**
   * Delete a conversation
   */
  static async deleteConversation(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Missing user context' });
      }

      const result = await AiService.deleteConversation(userId, id);
      return res.status(200).json({
        message: 'Conversation deleted successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Error in deleteConversation:', error);
      const message = error.message;
      if (message.includes('not found') || message.includes('access denied')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete conversation' });
    }
  }

  /**
   * Send a prompt (chats or starts a new conversation)
   */
  static async sendMessage(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Missing user context' });
      }

      const { conversationId, prompt } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Bad Request', message: 'Prompt must be a non-empty string' });
      }

      const role = req.user?.role || RoleType.PATIENT;

      const result = await AiService.sendMessage(userId, conversationId, role, prompt);
      return res.status(200).json({
        message: 'Message processed successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Error in sendMessage:', error);
      const message = error.message;
      if (message.includes('not found') || message.includes('access denied')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to process copilot query' });
    }
  }

  /**
   * Submit accuracy feedback
   */
  static async submitFeedback(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params; // conversationId
      const { messageId, rating, comment } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Missing user context' });
      }

      if (rating === undefined || ![1, -1].includes(rating)) {
        return res.status(400).json({ error: 'Bad Request', message: 'Rating must be 1 (Thumbs Up) or -1 (Thumbs Down)' });
      }

      const feedback = await AiService.submitFeedback(userId, id, messageId, rating, comment);
      return res.status(201).json({
        message: 'AI feedback recorded successfully',
        data: feedback,
      });
    } catch (error: any) {
      console.error('Error in submitFeedback:', error);
      const message = error.message;
      if (message.includes('not found') || message.includes('access denied')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to save feedback' });
    }
  }

  /**
   * Get AI Usage Telemetry metrics
   */
  static async getTelemetry(req: CustomRequest, res: Response): Promise<Response> {
    try {
      // Accessible to Admin/Executive dashboard users.
      // (The router RBAC middleware will guard it, but let's have a fail-safe check)
      const userRole = req.user?.role;
      if (userRole !== RoleType.SUPER_ADMIN && userRole !== RoleType.HOSPITAL_ADMIN) {
        return res.status(403).json({ error: 'Forbidden', message: 'Access restricted to system administrators' });
      }

      const telemetry = await AiService.getTelemetry();
      return res.status(200).json({
        message: 'Telemetry metrics retrieved successfully',
        data: telemetry,
      });
    } catch (error: any) {
      console.error('Error in getTelemetry:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to compile AI telemetry statistics' });
    }
  }
}
