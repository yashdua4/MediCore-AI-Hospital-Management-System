import { RoleType } from '@prisma/client';

export interface RoleCreateInput {
  name: RoleType;
  description: string;
}

export interface RoleResponse {
  id: string;
  name: RoleType;
  description: string;
}

export interface RolePermissionAssignInput {
  roleId: string;
  permissionId: string;
}

export interface UserRoleAssignInput {
  userId: string;
  roleId: string;
}

export interface CheckAccessInput {
  userId: string;
  resource: string;
  action: string;
}

export interface CheckAccessResult {
  hasAccess: boolean;
  reason?: string;
}
