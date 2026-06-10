import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/prisma';
import { RbacService } from '../services/rbac.service';
import { SessionService } from '../services/session.service';
import { RoleType } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

async function cleanupDb() {
  await prisma.userSession.deleteMany();
  await prisma.securityEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
}

describe('Security Middleware and Endpoint Integration Tests', () => {
  let superAdminToken: string;
  let patientToken: string;
  let regularToken: string;
  
  let superUser: any;
  let patientUser: any;
  let regularUser: any;

  beforeAll(async () => {
    await cleanupDb();

    // 1. Create a super admin
    superUser = await prisma.user.create({
      data: {
        email: 'super@medicore.com',
        passwordHash: 'hash',
      },
    });
    const superRole = await RbacService.createRole({
      name: RoleType.SUPER_ADMIN,
      description: 'Super Admin',
    });
    await RbacService.assignRoleToUser(superUser.id, superRole.id);

    superAdminToken = jwt.sign(
      {
        userId: superUser.id,
        email: superUser.email,
        roleId: superRole.id,
        role: RoleType.SUPER_ADMIN,
        roles: [RoleType.SUPER_ADMIN],
        roleIds: [superRole.id],
      },
      JWT_SECRET
    );

    // 2. Create a patient
    patientUser = await prisma.user.create({
      data: {
        email: 'patient@medicore.com',
        passwordHash: 'hash',
      },
    });
    const patientRole = await RbacService.createRole({
      name: RoleType.PATIENT,
      description: 'Patient',
    });
    await RbacService.assignRoleToUser(patientUser.id, patientRole.id);

    patientToken = jwt.sign(
      {
        userId: patientUser.id,
        email: patientUser.email,
        roleId: patientRole.id,
        role: RoleType.PATIENT,
        roles: [RoleType.PATIENT],
        roleIds: [patientRole.id],
      },
      JWT_SECRET
    );

    // 3. Create a regular user
    regularUser = await prisma.user.create({
      data: {
        email: 'regular@medicore.com',
        passwordHash: 'hash',
      },
    });
    regularToken = jwt.sign(
      {
        userId: regularUser.id,
        email: regularUser.email,
        roleId: '',
        role: RoleType.PATIENT,
        roles: [],
        roleIds: [],
      },
      JWT_SECRET
    );

    // Register a test route for requireOwnershipOrRole
    const { requireOwnershipOrRole } = require('../middlewares/rbac.middleware');
    app.get(
      '/test/patients/:patientId/record',
      requireOwnershipOrRole([RoleType.DOCTOR], (req: any) => req.params.patientId),
      (_req, res) => {
        res.status(200).json({ data: 'access granted' });
      }
    );
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  describe('requireOwnershipOrRole Middleware', () => {
    test('should allow user who is the owner to access record', async () => {
      const response = await request(app)
        .get(`/test/patients/${patientUser.id}/record`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBe('access granted');
    });

    test('should allow SUPER_ADMIN to access record (bypass check)', async () => {
      const response = await request(app)
        .get(`/test/patients/${patientUser.id}/record`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBe('access granted');
    });

    test('should deny regular user who is not the owner nor doctor/admin', async () => {
      const response = await request(app)
        .get(`/test/patients/${patientUser.id}/record`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('Sessions Management Endpoints', () => {
    let sessionId: string;

    beforeEach(async () => {
      await prisma.userSession.deleteMany();
      // Create a mock active session
      const session = await SessionService.createSession({
        userId: patientUser.id,
        refreshToken: 'refresh-token-test',
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 300000),
      });
      sessionId = session.id;
    });

    test('should get active sessions for currently logged in user', async () => {
      const response = await request(app)
        .get('/api/sessions/active')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    test('should revoke active session by session ID', async () => {
      const response = await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('revoked');
    });

    test('should block revoking other user\'s sessions unless SUPER_ADMIN', async () => {
      const response = await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Security Dashboard Administrative Endpoints', () => {
    test('should allow SUPER_ADMIN to view security dashboard', async () => {
      const response = await request(app)
        .get('/api/security/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.metrics).toBeDefined();
    });

    test('should deny patient access to security metrics', async () => {
      const response = await request(app)
        .get('/api/security/metrics')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
    });
  });
});
