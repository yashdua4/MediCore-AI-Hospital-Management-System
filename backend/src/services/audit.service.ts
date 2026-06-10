import prisma from '../config/prisma';
import { AuditLogAction, AuditLogResponse } from '../types/security.types';

export class AuditService {
  /**
   * Log a user activity/audit record.
   */
  static async log(
    action: AuditLogAction,
    resource: string,
    details: string,
    userId: string | null = null,
    ipAddress: string = '127.0.0.1',
    userAgent: string | null = null
  ): Promise<AuditLogResponse> {
    const log = await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        details,
        ipAddress,
        userAgent,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    return {
      id: log.id,
      userId: log.userId,
      userEmail: log.user?.email || null,
      action: log.action,
      resource: log.resource,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      timestamp: log.timestamp,
    };
  }

  /**
   * Fetch audit logs with optional filters and pagination.
   */
  static async getLogs(options: {
    limit?: number;
    offset?: number;
    userId?: string;
    action?: string;
    resource?: string;
  }): Promise<{ logs: AuditLogResponse[]; total: number }> {
    const { limit = 50, offset = 0, userId, action, resource } = options;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resource) where.resource = resource;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: {
          timestamp: 'desc',
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        userEmail: log.user?.email || null,
        action: log.action,
        resource: log.resource,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.timestamp,
      })),
      total,
    };
  }
}
