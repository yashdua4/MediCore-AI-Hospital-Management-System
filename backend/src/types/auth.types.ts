import { Request } from 'express';
import { RoleType } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  roleId: string;
  role: RoleType;
  roles: RoleType[];
  roleIds: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    role: RoleType;
    mfaEnabled: boolean;
  };
  tokens?: AuthTokens;
  requiresMfa?: boolean;
  mfaTempToken?: string; // Used to verify MFA in the next step
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface CustomRequest extends Request {
  user?: JwtPayload;
  sessionId?: string;
}

export interface SecurityEventLog {
  userId?: string;
  eventType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  ipAddress: string;
  userAgent?: string;
}