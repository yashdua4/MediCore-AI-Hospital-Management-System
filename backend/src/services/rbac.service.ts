import prisma from '../config/prisma';
import { RoleType } from '@prisma/client';
import { RoleCreateInput, RoleResponse, CheckAccessResult } from '../types/rbac.types';
import { PermissionResponse } from '../types/permission.types';

export class RbacService {
  /**
   * Helper to write audit logs
   */
  private static async logAudit(
    action: string,
    resource: string,
    details: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: actorUserId || null,
          action,
          resource,
          details,
          ipAddress: ipAddress || '127.0.0.1',
          userAgent: userAgent || 'System',
        },
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Create a new role
   */
  static async createRole(
    data: RoleCreateInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<RoleResponse> {
    const existing = await prisma.role.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new Error(`Role '${data.name}' already exists`);
    }

    const role = await prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });

    await this.logAudit(
      'CREATE_ROLE',
      'role',
      `Role '${role.name}' created with description: ${role.description}`,
      actorUserId,
      ipAddress,
      userAgent
    );

    return role;
  }

  /**
   * Get all roles
   */
  static async getAllRoles(): Promise<RoleResponse[]> {
    return prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Assign a permission to a role
   */
  static async assignPermissionToRole(
    roleId: string,
    permissionId: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // Verify role and permission exist
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new Error(`Role with ID '${roleId}' not found`);

    const permission = await prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) throw new Error(`Permission with ID '${permissionId}' not found`);

    // Assign
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
      update: {},
      create: { roleId, permissionId },
    });

    await this.logAudit(
      'ASSIGN_PERMISSION_TO_ROLE',
      'role_permission',
      `Assigned permission '${permission.resource}:${permission.action}' (${permissionId}) to role '${role.name}' (${roleId})`,
      actorUserId,
      ipAddress,
      userAgent
    );
  }

  /**
   * Remove a permission from a role
   */
  static async removePermissionFromRole(
    roleId: string,
    permissionId: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new Error(`Role with ID '${roleId}' not found`);

    const permission = await prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) throw new Error(`Permission with ID '${permissionId}' not found`);

    const existingRelation = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });

    if (!existingRelation) {
      throw new Error(`Permission is not assigned to this role`);
    }

    await prisma.rolePermission.delete({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });

    await this.logAudit(
      'REMOVE_PERMISSION_FROM_ROLE',
      'role_permission',
      `Removed permission '${permission.resource}:${permission.action}' (${permissionId}) from role '${role.name}' (${roleId})`,
      actorUserId,
      ipAddress,
      userAgent
    );
  }

  /**
   * Assign a role to a user
   */
  static async assignRoleToUser(
    userId: string,
    roleId: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error(`User with ID '${userId}' not found`);

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new Error(`Role with ID '${roleId}' not found`);

    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId, roleId },
      },
      update: {},
      create: { userId, roleId },
    });

    await this.logAudit(
      'ASSIGN_ROLE_TO_USER',
      'user_role',
      `Assigned role '${role.name}' (${roleId}) to user (${userId})`,
      actorUserId,
      ipAddress,
      userAgent
    );
  }

  /**
   * Remove a role from a user
   */
  static async removeRoleFromUser(
    userId: string,
    roleId: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error(`User with ID '${userId}' not found`);

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new Error(`Role with ID '${roleId}' not found`);

    const relation = await prisma.userRole.findUnique({
      where: {
        userId_roleId: { userId, roleId },
      },
    });

    if (!relation) {
      throw new Error(`Role is not assigned to this user`);
    }

    await prisma.userRole.delete({
      where: {
        userId_roleId: { userId, roleId },
      },
    });

    await this.logAudit(
      'REMOVE_ROLE_FROM_USER',
      'user_role',
      `Removed role '${role.name}' (${roleId}) from user (${userId})`,
      actorUserId,
      ipAddress,
      userAgent
    );
  }

  /**
   * Get all permissions assigned to a role
   */
  static async getRolePermissions(roleId: string): Promise<PermissionResponse[]> {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new Error(`Role with ID '${roleId}' not found`);

    const relations = await prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });

    return relations.map((r) => r.permission);
  }

  /**
   * Get all unique permissions for a user across all their assigned roles
   */
  static async getUserPermissions(userId: string): Promise<PermissionResponse[]> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error(`User with ID '${userId}' not found`);

    return prisma.permission.findMany({
      where: {
        roles: {
          some: {
            role: {
              users: {
                some: { userId },
              },
            },
          },
        },
      },
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' },
      ],
    });
  }

  /**
   * Check if a user has access to a specific resource action
   */
  static async checkAccess(userId: string, resource: string, action: string): Promise<CheckAccessResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return { hasAccess: false, reason: 'User not found' };
    }

    if (user.isLocked) {
      return { hasAccess: false, reason: 'User account is locked' };
    }

    // SUPER_ADMIN has access to everything
    const isSuperAdmin = user.roles.some((r) => r.role.name === RoleType.SUPER_ADMIN);
    if (isSuperAdmin) {
      return { hasAccess: true };
    }

    // Check permissions
    const count = await prisma.permission.count({
      where: {
        resource: resource.toLowerCase(),
        action: action.toLowerCase(),
        roles: {
          some: {
            role: {
              users: {
                some: { userId },
              },
            },
          },
        },
      },
    });

    if (count > 0) {
      return { hasAccess: true };
    }

    return { hasAccess: false, reason: `Insufficient permissions for '${resource}:${action}'` };
  }
}
