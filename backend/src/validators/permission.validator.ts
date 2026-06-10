import { z } from 'zod';

export const createPermissionSchema = z.object({
  resource: z
    .string()
    .trim()
    .min(2, 'Resource name must be at least 2 characters long')
    .max(50, 'Resource name cannot exceed 50 characters')
    .toLowerCase()
    .regex(/^[a-z_]+$/, 'Resource name can only contain lowercase letters and underscores'),
  action: z
    .string()
    .trim()
    .min(2, 'Action must be at least 2 characters long')
    .max(50, 'Action cannot exceed 50 characters')
    .toLowerCase()
    .regex(/^[a-z_]+$/, 'Action can only contain lowercase letters and underscores'),
});

export const updatePermissionSchema = z.object({
  resource: z
    .string()
    .trim()
    .min(2, 'Resource name must be at least 2 characters long')
    .max(50, 'Resource name cannot exceed 50 characters')
    .toLowerCase()
    .regex(/^[a-z_]+$/, 'Resource name can only contain lowercase letters and underscores')
    .optional(),
  action: z
    .string()
    .trim()
    .min(2, 'Action must be at least 2 characters long')
    .max(50, 'Action cannot exceed 50 characters')
    .toLowerCase()
    .regex(/^[a-z_]+$/, 'Action can only contain lowercase letters and underscores')
    .optional(),
});
