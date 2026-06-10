import { Response } from 'express';
import { CustomRequest } from '../types/auth.types';
import { RbacService } from '../services/rbac.service';
import {
  createRoleSchema,
  assignPermissionSchema,
  assignRoleSchema,
} from '../validators/rbac.validator';

export class RbacController {
  /**
   * Create a new role
   */
  static async createRole(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      const role = await RbacService.createRole(parsed.data, actorUserId, ipAddress, userAgent);

      return res.status(201).json({
        message: 'Role created successfully',
        data: role,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      if (message.includes('already exists')) {
        return res.status(409).json({ error: 'Conflict', message });
      }
      console.error('Error in createRole:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create role' });
    }
  }

  /**
   * Get all roles
   */
  static async getAllRoles(_req: CustomRequest, res: Response): Promise<Response> {
    try {
      const roles = await RbacService.getAllRoles();
      return res.status(200).json({
        data: roles,
      });
    } catch (error) {
      console.error('Error in getAllRoles:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve roles' });
    }
  }

  /**
   * Assign a permission to a role
   */
  static async assignPermissionToRole(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = assignPermissionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      await RbacService.assignPermissionToRole(
        parsed.data.roleId,
        parsed.data.permissionId,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        message: 'Permission assigned to role successfully',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in assignPermissionToRole:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to assign permission' });
    }
  }

  /**
   * Remove a permission from a role
   */
  static async removePermissionFromRole(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = assignPermissionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      await RbacService.removePermissionFromRole(
        parsed.data.roleId,
        parsed.data.permissionId,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        message: 'Permission removed from role successfully',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('is not assigned')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in removePermissionFromRole:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to remove permission' });
    }
  }

  /**
   * Assign a role to a user
   */
  static async assignRoleToUser(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = assignRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      await RbacService.assignRoleToUser(
        parsed.data.userId,
        parsed.data.roleId,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        message: 'Role assigned to user successfully',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in assignRoleToUser:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to assign role' });
    }
  }

  /**
   * Remove a role from a user
   */
  static async removeRoleFromUser(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = assignRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];
      const actorUserId = req.user?.userId;

      await RbacService.removeRoleFromUser(
        parsed.data.userId,
        parsed.data.roleId,
        actorUserId,
        ipAddress,
        userAgent
      );

      return res.status(200).json({
        message: 'Role removed from user successfully',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      if (message.includes('is not assigned')) {
        return res.status(400).json({ error: 'Bad Request', message });
      }
      console.error('Error in removeRoleFromUser:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to remove role' });
    }
  }

  /**
   * Get permissions for a specific role
   */
  static async getRolePermissions(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { roleId } = req.params;
      if (!roleId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Role ID is required' });
      }

      const permissions = await RbacService.getRolePermissions(roleId);
      return res.status(200).json({
        data: permissions,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in getRolePermissions:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve role permissions' });
    }
  }

  /**
   * Get all unique permissions for a user
   */
  static async getUserPermissions(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ error: 'Bad Request', message: 'User ID is required' });
      }

      const permissions = await RbacService.getUserPermissions(userId);
      return res.status(200).json({
        data: permissions,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in getUserPermissions:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve user permissions' });
    }
  }
}
