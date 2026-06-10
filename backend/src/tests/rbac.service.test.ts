import prisma from '../config/prisma';
import { RbacService } from '../services/rbac.service';
import { PermissionService } from '../services/permission.service';
import { RoleType } from '@prisma/client';

async function cleanupDb() {
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.securityEvent.deleteMany();
}

describe('RbacService Unit Tests', () => {
  beforeEach(async () => {
    await cleanupDb();
  });

  afterAll(async () => {
    await cleanupDb();
    await prisma.$disconnect();
  });

  test('should create a role and write an audit log', async () => {
    // Create actor user first to satisfy foreign key constraint on AuditLog
    await prisma.user.create({
      data: {
        id: 'system-admin-id',
        email: 'admin@medicore.com',
        passwordHash: 'hashed',
      },
    });

    const role = await RbacService.createRole({
      name: RoleType.DOCTOR,
      description: 'Medical Doctor',
    }, 'system-admin-id', '192.168.1.1', 'Mozilla/5.0');

    expect(role.name).toBe(RoleType.DOCTOR);
    expect(role.description).toBe('Medical Doctor');

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'CREATE_ROLE' },
    });
    expect(audit).toBeDefined();
    expect(audit?.details).toContain('Role \'DOCTOR\' created');
    expect(audit?.userId).toBe('system-admin-id');
    expect(audit?.ipAddress).toBe('192.168.1.1');
    expect(audit?.userAgent).toBe('Mozilla/5.0');
  });

  test('should not create a duplicate role', async () => {
    await RbacService.createRole({
      name: RoleType.NURSE,
      description: 'Nurse Role',
    });

    await expect(
      RbacService.createRole({
        name: RoleType.NURSE,
        description: 'Nurse Role Duplicate',
      })
    ).rejects.toThrow('already exists');
  });

  test('should assign and remove permission on a role', async () => {
    const role = await RbacService.createRole({
      name: RoleType.LAB_TECH,
      description: 'Laboratory Technician',
    });

    const permission = await PermissionService.createPermission({
      resource: 'lab_reports',
      action: 'write',
    });

    // Assign
    await RbacService.assignPermissionToRole(role.id, permission.id);
    let rolePerms = await RbacService.getRolePermissions(role.id);
    expect(rolePerms).toHaveLength(1);
    expect(rolePerms[0].resource).toBe('lab_reports');

    // Remove
    await RbacService.removePermissionFromRole(role.id, permission.id);
    rolePerms = await RbacService.getRolePermissions(role.id);
    expect(rolePerms).toHaveLength(0);
  });

  test('should assign and remove role on a user', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'doctor@medicore.com',
        passwordHash: 'dummyhash',
      },
    });

    const role = await RbacService.createRole({
      name: RoleType.DOCTOR,
      description: 'Doctor Role',
    });

    // Assign role
    await RbacService.assignRoleToUser(user.id, role.id);

    const userPermsBefore = await RbacService.getUserPermissions(user.id);
    expect(userPermsBefore).toHaveLength(0); // Role has no permissions yet

    // Assign permission to Doctor role
    const permission = await PermissionService.createPermission({
      resource: 'patients',
      action: 'read',
    });
    await RbacService.assignPermissionToRole(role.id, permission.id);

    const userPermsAfter = await RbacService.getUserPermissions(user.id);
    expect(userPermsAfter).toHaveLength(1);
    expect(userPermsAfter[0].resource).toBe('patients');
    expect(userPermsAfter[0].action).toBe('read');

    // Remove role from user
    await RbacService.removeRoleFromUser(user.id, role.id);
    const userPermsFinal = await RbacService.getUserPermissions(user.id);
    expect(userPermsFinal).toHaveLength(0);
  });

  test('should evaluate access permissions correctly', async () => {
    // 1. Create a user
    const user = await prisma.user.create({
      data: {
        email: 'nurse@medicore.com',
        passwordHash: 'dummyhash',
      },
    });

    // 2. Try checkAccess when no roles are assigned
    let access = await RbacService.checkAccess(user.id, 'patients', 'write');
    expect(access.hasAccess).toBe(false);

    // 3. Create role and permission
    const role = await RbacService.createRole({
      name: RoleType.NURSE,
      description: 'Nurse Role',
    });
    const perm = await PermissionService.createPermission({
      resource: 'patients',
      action: 'write',
    });

    await RbacService.assignPermissionToRole(role.id, perm.id);
    await RbacService.assignRoleToUser(user.id, role.id);

    // 4. Check access after assignment
    access = await RbacService.checkAccess(user.id, 'patients', 'write');
    expect(access.hasAccess).toBe(true);

    // 5. Test locked account
    await prisma.user.update({
      where: { id: user.id },
      data: { isLocked: true },
    });
    access = await RbacService.checkAccess(user.id, 'patients', 'write');
    expect(access.hasAccess).toBe(false);
    expect(access.reason).toContain('locked');
  });

  test('should bypass checks for SUPER_ADMIN', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'admin@medicore.com',
        passwordHash: 'dummyhash',
      },
    });

    const superAdminRole = await RbacService.createRole({
      name: RoleType.SUPER_ADMIN,
      description: 'Super Administrator',
    });

    await RbacService.assignRoleToUser(user.id, superAdminRole.id);

    // Super Admin should have access to anything, even uncreated permissions
    const access = await RbacService.checkAccess(user.id, 'any_resource', 'any_action');
    expect(access.hasAccess).toBe(true);
  });
});
