import prisma from '../config/prisma';
import {
  SecurityEventType,
  SecuritySeverity,
  SecurityEventResponse,
  SecurityMetrics,
  DashboardData,
  AuditLogResponse,
} from '../types/security.types';

export class SecurityService {
  /**
   * Log a security incident/event.
   */
  static async logEvent(
    eventType: SecurityEventType,
    severity: SecuritySeverity,
    description: string,
    userId: string | null = null,
    ipAddress: string = '127.0.0.1',
    userAgent: string | null = null
  ): Promise<SecurityEventResponse> {
    const event = await prisma.securityEvent.create({
      data: {
        userId,
        eventType,
        severity,
        description,
        ipAddress,
        userAgent,
        resolved: false,
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
      id: event.id,
      userId: event.userId,
      userEmail: event.user?.email || null,
      eventType: event.eventType,
      severity: event.severity,
      description: event.description,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      resolved: event.resolved,
      timestamp: event.timestamp,
    };
  }

  /**
   * Fetch security events with optional filters.
   */
  static async getEvents(options: {
    limit?: number;
    offset?: number;
    eventType?: string;
    severity?: string;
    resolved?: boolean;
  }): Promise<{ events: SecurityEventResponse[]; total: number }> {
    const { limit = 50, offset = 0, eventType, severity, resolved } = options;

    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (severity) where.severity = severity;
    if (resolved !== undefined) where.resolved = resolved;

    const [events, total] = await Promise.all([
      prisma.securityEvent.findMany({
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
      prisma.securityEvent.count({ where }),
    ]);

    return {
      events: events.map((event) => ({
        id: event.id,
        userId: event.userId,
        userEmail: event.user?.email || null,
        eventType: event.eventType,
        severity: event.severity,
        description: event.description,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        resolved: event.resolved,
        timestamp: event.timestamp,
      })),
      total,
    };
  }

  /**
   * Resolve a security event.
   */
  static async resolveEvent(id: string): Promise<SecurityEventResponse> {
    const event = await prisma.securityEvent.update({
      where: { id },
      data: { resolved: true },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    return {
      id: event.id,
      userId: event.userId,
      userEmail: event.user?.email || null,
      eventType: event.eventType,
      severity: event.severity,
      description: event.description,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      resolved: event.resolved,
      timestamp: event.timestamp,
    };
  }

  /**
   * Compute aggregate security metrics.
   */
  static async getMetrics(): Promise<SecurityMetrics> {
    const [
      activeSessionsCount,
      totalEvents,
      unresolvedEvents,
      criticalEvents,
      failedLoginsCount,
      lockedAccountsCount,
    ] = await Promise.all([
      prisma.userSession.count({
        where: {
          expiresAt: {
            gt: new Date(),
          },
        },
      }),
      prisma.securityEvent.count(),
      prisma.securityEvent.count({
        where: { resolved: false },
      }),
      prisma.securityEvent.count({
        where: {
          resolved: false,
          severity: 'CRITICAL',
        },
      }),
      prisma.auditLog.count({
        where: {
          action: 'LOGIN_FAILED',
        },
      }),
      prisma.user.count({
        where: { isLocked: true },
      }),
    ]);

    return {
      activeSessionsCount,
      securityEventsCount: {
        total: totalEvents,
        unresolved: unresolvedEvents,
        critical: criticalEvents,
      },
      failedLoginsCount,
      lockedAccountsCount,
    };
  }

  /**
   * Retrieve compiled dashboard data.
   */
  static async getDashboard(): Promise<DashboardData> {
    const metrics = await this.getMetrics();

    const [recentEvents, recentAudits] = await Promise.all([
      prisma.securityEvent.findMany({
        take: 10,
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
      prisma.auditLog.findMany({
        take: 10,
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
    ]);

    const formattedEvents: SecurityEventResponse[] = recentEvents.map((e) => ({
      id: e.id,
      userId: e.userId,
      userEmail: e.user?.email || null,
      eventType: e.eventType,
      severity: e.severity,
      description: e.description,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      resolved: e.resolved,
      timestamp: e.timestamp,
    }));

    const formattedAudits: AuditLogResponse[] = recentAudits.map((a) => ({
      id: a.id,
      userId: a.userId,
      userEmail: a.user?.email || null,
      action: a.action,
      resource: a.resource,
      details: a.details,
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
      timestamp: a.timestamp,
    }));

    return {
      metrics,
      recentEvents: formattedEvents,
      recentAudits: formattedAudits,
    };
  }
}
