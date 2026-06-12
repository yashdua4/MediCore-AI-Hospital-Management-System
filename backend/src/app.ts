import 'dotenv/config';
import express, { Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import prisma from './config/prisma';
import { CustomRequest, JwtPayload } from './types/auth.types';
import permissionRouter from './routes/permission.routes';
import rbacRouter from './routes/rbac.routes';
import securityRouter from './routes/security.routes';
import sessionRouter from './routes/session.routes';
import patientRouter from './routes/patient.routes';
import doctorRouter from './routes/doctor.routes';
import appointmentRouter from './routes/appointment.routes';
import emrRouter from './routes/emr.routes';
import labRouter from './routes/lab.routes';
import pharmacyRouter from './routes/pharmacy.routes';
import billingRouter from './routes/billing.routes';
import ipdRouter from './routes/ipd.routes';
import emergencyRouter from './routes/emergency.routes';
import aiRouter from './routes/ai.routes';

const API_ROUTE_MODULES = [
  '/api/permissions',
  '/api/rbac',
  '/api/security',
  '/api/sessions',
  '/api/patients',
  '/api/doctors',
  '/api/appointments',
  '/api/emr',
  '/api/lab',
  '/api/pharmacy',
  '/api/billing',
  '/api/ipd',
  '/api/emergency',
  '/api/ai',
] as const;

function validateEnvironment() {
  const required = ['DATABASE_URL', 'JWT_SECRET'] as const;
  const missing = required.filter((key) => !process.env[key]?.trim());
  const warnings: string[] = [];

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'test_secret') {
      warnings.push('JWT_SECRET is using a development default in production');
    }
    if (!process.env.CORS_ORIGIN) {
      warnings.push('CORS_ORIGIN is not set; all origins are allowed');
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || '5000',
  };
}

async function checkDatabaseConnectivity() {
  const started = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  return {
    connected: true,
    latencyMs: Date.now() - started,
  };
}

async function checkRbacOperational() {
  const roleCount = await prisma.role.count();
  return {
    operational: true,
    roleCount,
  };
}

const app = express();

const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors({
    origin: corsOrigin ? corsOrigin.split(',').map((origin) => origin.trim()) : true,
  })
);
app.use(express.json());

// Helper JWT Authentication Mock/Decoder for Testing and Integration
const authenticateJWT = (req: CustomRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_secret') as JwtPayload;
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }
  }
  next();
};

const publicPaths = new Set(['/health', '/ready', '/health/system']);

app.use((req: CustomRequest, res: Response, next: NextFunction) => {
  if (publicPaths.has(req.path)) {
    return next();
  }
  return authenticateJWT(req, res, next);
});

// Routes
app.use('/api/permissions', permissionRouter);
app.use('/api/rbac', rbacRouter);
app.use('/api/security', securityRouter);
app.use('/api/sessions', sessionRouter);
app.use('/api/patients', patientRouter);
app.use('/api/doctors', doctorRouter);
app.use('/api/appointments', appointmentRouter);
app.use('/api/emr', emrRouter);
app.use('/api/lab', labRouter);
app.use('/api/pharmacy', pharmacyRouter);
app.use('/api/billing', billingRouter);
app.use('/api/ipd', ipdRouter);
app.use('/api/emergency', emergencyRouter);
app.use('/api/ai', aiRouter);

// Health Check System
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'medicore-backend',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (_req, res) => {
  const environment = validateEnvironment();
  if (!environment.valid) {
    return res.status(503).json({
      status: 'NOT_READY',
      reason: 'Missing required environment variables',
      missing: environment.missing,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const database = await checkDatabaseConnectivity();
    return res.status(200).json({
      status: 'READY',
      database,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      status: 'NOT_READY',
      reason: 'Database connectivity check failed',
      message: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/health/system', async (_req, res) => {
  const environment = validateEnvironment();
  const checks: Record<string, unknown> = {
    environment,
    routes: {
      count: API_ROUTE_MODULES.length,
      modules: [...API_ROUTE_MODULES],
    },
    authentication: {
      configured: Boolean(process.env.JWT_SECRET),
      jwtSecretSet: Boolean(process.env.JWT_SECRET?.trim()),
    },
  };

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (!environment.valid) {
    overallStatus = 'unhealthy';
  } else if (environment.warnings.length > 0) {
    overallStatus = 'degraded';
  }

  try {
    checks.database = await checkDatabaseConnectivity();
    checks.services = {
      postgresql: 'up',
      prisma: 'up',
    };
    checks.rbac = await checkRbacOperational();
  } catch (error) {
    overallStatus = 'unhealthy';
    checks.database = {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
    checks.services = {
      postgresql: 'down',
      prisma: 'down',
    };
  }

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
  return res.status(statusCode).json({
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use((err: Error, _req: express.Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
});

const PORT = Number(process.env.PORT) || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MediCore API listening on port ${PORT}`);
  });
}

export default app;
