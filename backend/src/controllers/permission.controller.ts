import { Response } from 'express';
import { CustomRequest } from '../types/auth.types';
import { PermissionService } from '../services/permission.service';
import { createPermissionSchema } from '../validators/permission.validator';

export class PermissionController {
  /**
   * Create a new permission
   */
  static async createPermission(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const parsed = createPermissionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const permission = await PermissionService.createPermission(parsed.data);

      return res.status(201).json({
        message: 'Permission created successfully',
        data: permission,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      if (message.includes('already exists')) {
        return res.status(409).json({ error: 'Conflict', message });
      }
      console.error('Error in createPermission:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create permission' });
    }
  }

  /**
   * Get all permissions
   */
  static async getAllPermissions(_req: CustomRequest, res: Response): Promise<Response> {
    try {
      const permissions = await PermissionService.getAllPermissions();
      return res.status(200).json({
        data: permissions,
      });
    } catch (error) {
      console.error('Error in getAllPermissions:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve permissions' });
    }
  }

  /**
   * Delete a permission
   */
  static async deletePermission(req: CustomRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Bad Request', message: 'Permission ID is required' });
      }

      await PermissionService.deletePermission(id);

      return res.status(200).json({
        message: 'Permission deleted successfully',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message });
      }
      console.error('Error in deletePermission:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete permission' });
    }
  }
}
