import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/prisma';
import { RbacService } from '../services/rbac.service';
import { PermissionService } from '../services/permission.service';
import { RoleType } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

async function cleanupDb() {
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.securityEvent.deleteMany();
}

describe('RBAC Middleware and Route Integration Tests', () => {
  let superAdminToken: string;
  let doctorToken: string;
  let regularUserToken: string;
  
  let doctorUser: any;
  let regularUser: any;

  beforeAll(async () => {
    await cleanupDb();

    // 1. Create a super admin user
    const superAdmin = await prisma.user.create({
      data: {
        email: 'super@medicore.com',
        passwordHash: 'hash',
      },
    });
    const superRole = await RbacService.createRole({
      name: RoleType.SUPER_ADMIN,
      description: 'Super Admin',
    });
    await RbacService.assignRoleToUser(superAdmin.id, superRole.id);

    superAdminToken = jwt.sign(
      {
        userId: superAdmin.id,
        email: superAdmin.email,
        roleId: superRole.id,
        role: RoleType.SUPER_ADMIN,
        roles: [RoleType.SUPER_ADMIN],
        roleIds: [superRole.id],
      },
      JWT_SECRET
    );

    // 2. Create a doctor user
    doctorUser = await prisma.user.create({
      data: {
        email: 'doctor@medicore.com',
        passwordHash: 'hash',
      },
    });
    const doctorRole = await RbacService.createRole({
      name: RoleType.DOCTOR,
      description: 'Medical Doctor',
    });
    await RbacService.assignRoleToUser(doctorUser.id, doctorRole.id);

    const permission = await PermissionService.createPermission({
      resource: 'patients',
      action: 'read',
    });
    await RbacService.assignPermissionToRole(doctorRole.id, permission.id);

    doctorToken = jwt.sign(
      {
        userId: doctorUser.id,
        email: doctorUser.email,
        roleId: doctorRole.id,
        role: RoleType.DOCTOR,
        roles: [RoleType.DOCTOR],
        roleIds: [doctorRole.id],
      },
      JWT_SECRET
    );

    // 3. Create a regular user with NO roles
    regularUser = await prisma.user.create({
      data: {
        email: 'regular@medicore.com',
        passwordHash: 'hash',
      },
    });
    regularUserToken = jwt.sign(
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
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  describe('Route-Level Role Securing', () => {
    test('should allow SUPER_ADMIN to access permission creation endpoint', async () => {
      const response = await request(app)
        .post('/api/permissions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          resource: 'appointments',
          action: 'write',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('created successfully');
    });

    test('should deny DOCTOR access to permission creation (requires SUPER_ADMIN)', async () => {
      const response = await request(app)
        .post('/api/permissions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          resource: 'appointments',
          action: 'delete',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');

      // Verify a SecurityEvent was logged
      const securityEvent = await prisma.securityEvent.findFirst({
        where: { userId: doctorUser.id, eventType: 'UNAUTHORIZED_ACCESS' },
      });
      expect(securityEvent).toBeDefined();
      expect(securityEvent?.description).toContain("needing role 'SUPER_ADMIN'");
    });

    test('should deny access if Authorization header is missing', async () => {
      const response = await request(app)
        .post('/api/permissions')
        .send({
          resource: 'appointments',
          action: 'read',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('required');
    });
  });

  describe('Fine-Grained Permissions Verification', () => {
    // We register a dummy test router protected by requirePermission to test custom checks
    beforeAll(() => {
      const { requirePermission } = require('../middlewares/rbac.middleware');
      app.get('/test/patients-read', requirePermission('patients', 'read'), (_req, res) => {
        res.status(200).json({ data: 'patients read success' });
      });
    });

    test('should allow user with DOCTOR role to access patients-read endpoint', async () => {
      const response = await request(app)
        .get('/test/patients-read')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBe('patients read success');
    });

    test('should deny user without read:patients permission', async () => {
      const response = await request(app)
        .get('/test/patients-read')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
      expect(response.body.reason).toContain('Insufficient permissions');

      // Verify a SecurityEvent was logged
      const securityEvent = await prisma.securityEvent.findFirst({
        where: { userId: regularUser.id, eventType: 'UNAUTHORIZED_ACCESS' },
      });
      expect(securityEvent).toBeDefined();
      expect(securityEvent?.description).toContain('[patients:read]');
    });
  });
});
