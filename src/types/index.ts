import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { JwtPayload as BaseJwtPayload } from 'jsonwebtoken';

export interface JwtPayload extends BaseJwtPayload {
  userId: string;
  role: Role;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: JwtPayload;
}
