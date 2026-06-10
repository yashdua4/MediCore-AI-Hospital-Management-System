export interface SessionCreateInput {
  userId: string;
  refreshToken: string;
  userAgent: string;
  ipAddress: string;
  expiresAt: Date;
}

export interface SessionResponse {
  id: string;
  userId: string;
  refreshToken: string;
  userAgent: string;
  ipAddress: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface ActiveSessionResponse {
  id: string;
  userAgent: string;
  ipAddress: string;
  expiresAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}
