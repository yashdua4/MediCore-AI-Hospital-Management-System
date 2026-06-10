import prisma from '../config/prisma';
import { SessionCreateInput, SessionResponse } from '../types/session.types';

export class SessionService {
  /**
   * Create a new session for a user.
   * Detects and logs MULTIPLE_SESSION_LOGIN if the user has multiple active sessions.
   */
  static async createSession(data: SessionCreateInput): Promise<SessionResponse> {
    const { userId, refreshToken, userAgent, ipAddress, expiresAt } = data;

    // Check for existing active sessions to trigger MULTIPLE_SESSION_LOGIN warning
    const activeSessions = await prisma.userSession.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (activeSessions.length >= 2) {
      // Create a security event for multiple concurrent sessions
      await prisma.securityEvent.create({
        data: {
          userId,
          eventType: 'MULTIPLE_SESSION_LOGIN',
          severity: 'LOW',
          description: `User has ${activeSessions.length + 1} active concurrent sessions.`,
          ipAddress,
          userAgent,
        },
      });
    }

    // Create session in database
    return prisma.userSession.create({
      data: {
        userId,
        refreshToken,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });
  }

  /**
   * Validate a session by refresh token.
   */
  static async validateSession(refreshToken: string): Promise<SessionResponse | null> {
    const session = await prisma.userSession.findUnique({
      where: { refreshToken },
    });

    if (!session) {
      return null;
    }

    // Check if expired
    if (session.expiresAt < new Date()) {
      // Cleanup expired session
      await prisma.userSession.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return session;
  }

  /**
   * Invalidate/revoke a specific session by ID.
   */
  static async invalidateSession(id: string): Promise<void> {
    await prisma.userSession.delete({
      where: { id },
    }).catch(() => {
      // Ignore if already deleted
    });
  }

  /**
   * Invalidate/revoke all sessions for a user, optionally keeping a specific session.
   */
  static async invalidateAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    await prisma.userSession.deleteMany({
      where: {
        userId,
        id: exceptSessionId ? { not: exceptSessionId } : undefined,
      },
    });
  }

  /**
   * Get all active sessions for a user.
   */
  static async getActiveSessions(userId: string): Promise<SessionResponse[]> {
    return prisma.userSession.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
