import express, { Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
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


const app = express();

app.use(cors());
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

app.use(authenticateJWT);

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


// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
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

export default app;
