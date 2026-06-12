import request from 'supertest';
import app from '../app';
import prisma from '../config/prisma';

describe('Health Check System', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('GET /health returns liveness status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.service).toBe('medicore-backend');
    expect(res.body.timestamp).toBeDefined();
  });

  test('GET /ready returns readiness when database is reachable', async () => {
    const res = await request(app).get('/ready');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('READY');
    expect(res.body.database.connected).toBe(true);
    expect(typeof res.body.database.latencyMs).toBe('number');
  });

  test('GET /health/system returns full validation report', async () => {
    const res = await request(app).get('/health/system');

    expect([200, 503]).toContain(res.status);
    expect(['healthy', 'degraded', 'unhealthy']).toContain(res.body.status);
    expect(res.body.checks.environment).toBeDefined();
    expect(res.body.checks.routes.count).toBe(14);
    expect(res.body.checks.routes.modules).toContain('/api/patients');
    expect(res.body.checks.routes.modules).toContain('/api/emergency');
    expect(res.body.checks.authentication.configured).toBe(true);
  });

  test('health endpoints are accessible without authentication', async () => {
    const endpoints = ['/health', '/ready', '/health/system'];

    for (const endpoint of endpoints) {
      const res = await request(app).get(endpoint);
      expect(res.status).not.toBe(401);
    }
  });
});
