import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/prisma';
import { RbacService } from '../services/rbac.service';
import { RoleType } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

async function cleanupDb() {
  await prisma.aiFeedback.deleteMany();
  await prisma.aiMessage.deleteMany();
  await prisma.aiConversation.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
}

describe('AI Assistant Routes Integration Tests', () => {
  let adminToken: string;
  let patientToken: string;
  let adminUser: any;
  let patientUser: any;
  let adminRole: any;
  let patientRole: any;
  let conversationId: string;

  beforeAll(async () => {
    await cleanupDb();

    // 1. Create Roles
    adminRole = await RbacService.createRole({ name: RoleType.SUPER_ADMIN, description: 'Super Admin' });
    patientRole = await RbacService.createRole({ name: RoleType.PATIENT, description: 'Patient' });

    // 2. Create Users
    adminUser = await prisma.user.create({
      data: { email: 'admin.ai@medicore.com', passwordHash: 'hash' },
    });
    await RbacService.assignRoleToUser(adminUser.id, adminRole.id);

    patientUser = await prisma.user.create({
      data: { email: 'patient.ai@medicore.com', passwordHash: 'hash' },
    });
    await RbacService.assignRoleToUser(patientUser.id, patientRole.id);

    // 3. Tokens
    adminToken = jwt.sign(
      {
        userId: adminUser.id,
        email: adminUser.email,
        roleId: adminRole.id,
        role: RoleType.SUPER_ADMIN,
        roles: [RoleType.SUPER_ADMIN],
        roleIds: [adminRole.id],
      },
      JWT_SECRET
    );

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
  });

  afterAll(async () => {
    await cleanupDb();
  });

  describe('POST /api/ai/conversations', () => {
    it('should allow patient to start a new AI conversation and return simulated/clinical response', async () => {
      const res = await request(app)
        .post('/api/ai/conversations')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          prompt: 'Explain my active clinical prescription details',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Message processed successfully');
      expect(res.body.data.conversation).toBeDefined();
      expect(res.body.data.userMessage.content).toBe('Explain my active clinical prescription details');
      expect(res.body.data.aiMessage.content).toContain('Disclaimer');
      conversationId = res.body.data.conversation.id;
    });

    it('should fail if prompt parameter is missing', async () => {
      const res = await request(app)
        .post('/api/ai/conversations')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Bad Request');
    });
  });

  describe('GET /api/ai/conversations', () => {
    it('should list all conversations for the authenticated user matching their active role', async () => {
      const res = await request(app)
        .get('/api/ai/conversations')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].id).toBe(conversationId);
    });
  });

  describe('GET /api/ai/conversations/:id', () => {
    it('should retrieve conversation details including message logs', async () => {
      const res = await request(app)
        .get(`/api/ai/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(conversationId);
      expect(res.body.data.messages).toBeInstanceOf(Array);
      expect(res.body.data.messages.length).toBe(2); // USER and AI message
    });
  });

  describe('POST /api/ai/conversations/:id/feedback', () => {
    it('should allow rating feedback comments and return 201 status', async () => {
      const res = await request(app)
        .post(`/api/ai/conversations/${conversationId}/feedback`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          rating: 1,
          comment: 'Perfect clinical guidelines detail explanation',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('AI feedback recorded successfully');
      expect(res.body.data.rating).toBe(1);
    });
  });

  describe('GET /api/ai/telemetry', () => {
    it('should allow admins to query usage analytics metrics', async () => {
      const res = await request(app)
        .get('/api/ai/telemetry')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalConversations).toBeGreaterThan(0);
      expect(res.body.data.feedbackAccuracy.thumbsUp).toBe(1);
    });

    it('should reject requests from patients with 403 Forbidden status', async () => {
      const res = await request(app)
        .get('/api/ai/telemetry')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });
  });

  describe('DELETE /api/ai/conversations/:id', () => {
    it('should delete conversation logs cleanly', async () => {
      const res = await request(app)
        .delete(`/api/ai/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Conversation deleted successfully');

      // Verify deletion
      const checkRes = await request(app)
        .get(`/api/ai/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(checkRes.status).toBe(404);
    });
  });
});
