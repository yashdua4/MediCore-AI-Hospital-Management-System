import { Response, NextFunction } from 'express';
import { RoleType } from '@prisma/client';
import { CustomRequest } from '../types/auth.types';
import { RbacService } from '../services/rbac.service';
import prisma from '../config/prisma';

/**
 * Middleware to require a specific singular role.
 * SUPER_ADMIN is always granted access.
 */
export const requireRole = (role: RoleType) => {
  return async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      }

      const userRoles = user.roles || [];
      const isSuperAdmin = userRoles.includes(RoleType.SUPER_ADMIN);
      const hasRole = userRoles.includes(role);

      if (isSuperAdmin || hasRole) {
        return next();
      }

      // Log unauthorized access attempt as a security event
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      await prisma.securityEvent.create({
        data: {
          userId: user.userId,
          eventType: 'UNAUTHORIZED_ACCESS',
          severity: 'HIGH',
          description: `Unauthorized Access Attempt: User '${user.email}' requested endpoint needing role '${role}'. Current roles: [${userRoles.join(', ')}].`,
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'] || null,
        },
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Forbidden: Insufficient role permissions',
      });
    } catch (error) {
      console.error('Error in requireRole middleware:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Authorization verification failed' });
    }
  };
};

/**
 * Middleware to require any one of the specified roles.
 * SUPER_ADMIN is always granted access.
 */
export const requireAnyRole = (allowedRoles: RoleType[]) => {
  return async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      }

      const userRoles = user.roles || [];
      const isSuperAdmin = userRoles.includes(RoleType.SUPER_ADMIN);
      const hasRole = userRoles.some((role) => allowedRoles.includes(role));

      if (isSuperAdmin || hasRole) {
        return next();
      }

      // Log unauthorized access attempt as a security event
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      await prisma.securityEvent.create({
        data: {
          userId: user.userId,
          eventType: 'UNAUTHORIZED_ACCESS',
          severity: 'HIGH',
          description: `Unauthorized Access Attempt: User '${user.email}' requested endpoint needing any role from [${allowedRoles.join(', ')}]. Current roles: [${userRoles.join(', ')}].`,
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'] || null,
        },
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Forbidden: Insufficient role permissions',
      });
    } catch (error) {
      console.error('Error in requireAnyRole middleware:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Authorization verification failed' });
    }
  };
};

/**
 * Middleware to require specific resource permission.
 * SUPER_ADMIN is always granted access.
 */
export const requirePermission = (resource: string, action: string) => {
  return async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      }

      const result = await RbacService.checkAccess(user.userId, resource, action);

      if (result.hasAccess) {
        return next();
      }

      // Log unauthorized access attempt as a security event
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      await prisma.securityEvent.create({
        data: {
          userId: user.userId,
          eventType: 'UNAUTHORIZED_ACCESS',
          severity: 'HIGH',
          description: `Unauthorized Access Attempt: User '${user.email}' requested permission [${resource}:${action}]. Reason: ${result.reason || 'No access granted'}`,
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'] || null,
        },
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Forbidden: Insufficient permissions',
        reason: result.reason,
      });
    } catch (error) {
      console.error('Error in requirePermission middleware:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Authorization verification failed' });
    }
  };
};

/**
 * Middleware to require either ownership of the target resource or membership in a privileged role.
 * SUPER_ADMIN is always granted access.
 */
export const requireOwnershipOrRole = (
  allowedRoles: RoleType[],
  getOwnerId: (req: CustomRequest) => Promise<string | null | undefined> | string | null | undefined
) => {
  return async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      }

      const userRoles = user.roles || [];
      const isSuperAdmin = userRoles.includes(RoleType.SUPER_ADMIN);
      const hasPrivilegedRole = userRoles.some((role) => allowedRoles.includes(role));

      if (isSuperAdmin || hasPrivilegedRole) {
        return next();
      }

      const ownerId = await getOwnerId(req);

      if (ownerId && ownerId === user.userId) {
        return next();
      }

      // Log unauthorized access attempt
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      await prisma.securityEvent.create({
        data: {
          userId: user.userId,
          eventType: 'UNAUTHORIZED_ACCESS',
          severity: 'HIGH',
          description: `Unauthorized Access Attempt: User '${user.email}' failed resource ownership check and does not have roles [${allowedRoles.join(', ')}].`,
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'] || null,
        },
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Forbidden: Insufficient permissions (Ownership or privileged role required)',
      });
    } catch (error) {
      console.error('Error in requireOwnershipOrRole middleware:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Authorization verification failed' });
    }
  };
};
