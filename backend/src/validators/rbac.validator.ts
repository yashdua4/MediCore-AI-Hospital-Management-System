import { z } from 'zod';
import { RoleType } from '@prisma/client';

export const createRoleSchema = z.object({
  name: z.nativeEnum(RoleType, {
    errorMap: () => ({ message: 'Invalid role type' }),
  }),
  description: z
    .string()
    .trim()
    .min(3, 'Description must be at least 3 characters long')
    .max(255, 'Description cannot exceed 255 characters'),
});

export const assignPermissionSchema = z.object({
  roleId: z.string().uuid('Invalid role ID format'),
  permissionId: z.string().uuid('Invalid permission ID format'),
});

export const assignRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  roleId: z.string().uuid('Invalid role ID format'),
});
