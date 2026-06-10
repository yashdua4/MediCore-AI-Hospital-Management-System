import prisma from '../config/prisma';
import { PermissionCreateInput, PermissionResponse } from '../types/permission.types';

export class PermissionService {
  /**
   * Create a new permission
   */
  static async createPermission(data: PermissionCreateInput): Promise<PermissionResponse> {
    const resource = data.resource.trim().toLowerCase();
    const action = data.action.trim().toLowerCase();

    // Check if permission already exists
    const existing = await prisma.permission.findUnique({
      where: {
        resource_action: {
          resource,
          action,
        },
      },
    });

    if (existing) {
      throw new Error(`Permission already exists for resource '${resource}' and action '${action}'`);
    }

    return prisma.permission.create({
      data: {
        resource,
        action,
      },
    });
  }

  /**
   * Get all permissions
   */
  static async getAllPermissions(): Promise<PermissionResponse[]> {
    return prisma.permission.findMany({
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' },
      ],
    });
  }

  /**
   * Get permission by ID
   */
  static async getPermissionById(id: string): Promise<PermissionResponse | null> {
    return prisma.permission.findUnique({
      where: { id },
    });
  }

  /**
   * Delete a permission
   */
  static async deletePermission(id: string): Promise<PermissionResponse> {
    const existing = await prisma.permission.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`Permission with ID '${id}' not found`);
    }

    return prisma.permission.delete({
      where: { id },
    });
  }
}
