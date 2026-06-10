import prisma from '../config/prisma';
import { SessionService } from '../services/session.service';
import { AuditService } from '../services/audit.service';
import { SecurityService } from '../services/security.service';

async function cleanupDb() {
  await prisma.userSession.deleteMany();
  await prisma.securityEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
}

describe('Security and Session Services Unit Tests', () => {
  let user: any;

  beforeAll(async () => {
    await cleanupDb();
    user = await prisma.user.create({
      data: {
        id: 'test-user-uuid',
        email: 'tester@medicore.com',
        passwordHash: 'dummy',
      },
    });
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  describe('SessionService', () => {
    test('should create and validate active sessions', async () => {
      const expiresAt = new Date(Date.now() + 60000); // 1 min from now
      const session = await SessionService.createSession({
        userId: user.id,
        refreshToken: 'token-123',
        userAgent: 'test-agent',
        ipAddress: '192.168.0.1',
        expiresAt,
      });

      expect(session.userId).toBe(user.id);
      expect(session.refreshToken).toBe('token-123');

      // Validate session
      const validated = await SessionService.validateSession('token-123');
      expect(validated).not.toBeNull();
      expect(validated?.id).toBe(session.id);
    });

    test('should invalidate expired session', async () => {
      const expiresAt = new Date(Date.now() - 1000); // 1 sec ago
      await SessionService.createSession({
        userId: user.id,
        refreshToken: 'token-expired',
        userAgent: 'test-agent',
        ipAddress: '192.168.0.1',
        expiresAt,
      });

      const validated = await SessionService.validateSession('token-expired');
      expect(validated).toBeNull();
    });

    test('should revoke session by ID', async () => {
      const expiresAt = new Date(Date.now() + 60000);
      const session = await SessionService.createSession({
        userId: user.id,
        refreshToken: 'token-revokeme',
        userAgent: 'test-agent',
        ipAddress: '192.168.0.1',
        expiresAt,
      });

      await SessionService.invalidateSession(session.id);
      const validated = await SessionService.validateSession('token-revokeme');
      expect(validated).toBeNull();
    });
  });

  describe('AuditService', () => {
    test('should write audit logs and fetch them', async () => {
      const log = await AuditService.log(
        'LOGIN_SUCCESS',
        'auth',
        'User logged in successfully',
        user.id,
        '10.0.0.1',
        'firefox'
      );

      expect(log.action).toBe('LOGIN_SUCCESS');
      expect(log.userId).toBe(user.id);
      expect(log.userEmail).toBe('tester@medicore.com');

      const result = await AuditService.getLogs({ userId: user.id });
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.logs[0].action).toBe('LOGIN_SUCCESS');
    });
  });

  describe('SecurityService', () => {
    test('should log events and retrieve dashboard metrics', async () => {
      const event = await SecurityService.logEvent(
        'UNAUTHORIZED_ACCESS',
        'HIGH',
        'User tried to access dashboard',
        user.id,
        '10.0.0.2',
        'safari'
      );

      expect(event.eventType).toBe('UNAUTHORIZED_ACCESS');
      expect(event.resolved).toBe(false);

      // Resolve event
      const resolved = await SecurityService.resolveEvent(event.id);
      expect(resolved.resolved).toBe(true);

      // Fetch metrics
      const metrics = await SecurityService.getMetrics();
      expect(metrics.securityEventsCount.total).toBeGreaterThanOrEqual(1);

      // Fetch dashboard data
      const dashboard = await SecurityService.getDashboard();
      expect(dashboard.metrics).toBeDefined();
      expect(dashboard.recentEvents).toHaveLength(1);
    });
  });
});
