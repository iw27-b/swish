import { SignJWT, jwtVerify } from 'jose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { JwtPayload } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets are not defined');
}

const RATE_LIMIT_DURATION = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

const RATE_LIMITS = {
    auth: { maxAttempts: MAX_FAILED_ATTEMPTS, duration: RATE_LIMIT_DURATION },
    search: { maxAttempts: 100, duration: 60 * 1000 },
    collections: { maxAttempts: 20, duration: 60 * 1000 },
    profile_updates: { maxAttempts: 10, duration: 60 * 1000 },
    purchases: { maxAttempts: 5, duration: 60 * 1000 },
    trades: { maxAttempts: 10, duration: 60 * 1000 },
} as const;

const rateLimitStore: Record<string, { attempts: number; resetTime: number }> = {};

const secretKey = new TextEncoder().encode(JWT_SECRET);
const refreshSecretKey = new TextEncoder().encode(JWT_REFRESH_SECRET);

/**
 * Generate JWT token (Edge compatible)
 */
export async function generateToken(userId: string, role: string = 'USER'): Promise<string> {
    try {
        return await new SignJWT({ userId, role })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('15m')
            .sign(secretKey);
    } catch (error) {
        throw new Error(`Failed to generate token: ${error instanceof Error ? error.message : error}`);
    }
}

/**
 * Generate refresh token (Edge compatible)
 */
export async function generateRefreshToken(userId: string, role: string = 'USER'): Promise<string> {
    try {
        return await new SignJWT({ userId, role })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(refreshSecretKey);
    } catch (error) {
        throw new Error(`Failed to generate refresh token: ${error instanceof Error ? error.message : error}`);
    }
}

/**
 * Verify JWT token (Edge compatible)
 */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secretKey);

        if (payload.userId && typeof payload.userId === 'string' &&
            payload.role && typeof payload.role === 'string') {
            return {
                userId: payload.userId,
                role: payload.role as Role,
                iat: payload.iat,
                exp: payload.exp
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Verify refresh token (Edge compatible)
 */
export async function verifyRefreshToken(token: string): Promise<JwtPayload | null> {
    try {
        const { payload } = await jwtVerify(token, refreshSecretKey);

        if (payload.userId && typeof payload.userId === 'string' &&
            payload.role && typeof payload.role === 'string') {
            return {
                userId: payload.userId,
                role: payload.role as Role,
                iat: payload.iat,
                exp: payload.exp
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Parse JWT token from Cookie header
 */
export function parseTokenFromCookie(cookieHeader: string | null, cookieName: string = 'access_token'): string | null {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
    const targetCookie = cookies.find(cookie => cookie.startsWith(`${cookieName}=`));

    if (targetCookie) {
        return targetCookie.substring(cookieName.length + 1);
    }

    return null;
}

/**
 * Rate limiting utilities
 */
export function isRateLimited(ip: string): boolean {
    return isRateLimitedForOperation(ip, 'auth');
}

export function isRateLimitedForOperation(ip: string, operation: keyof typeof RATE_LIMITS): boolean {
    const key = `${operation}:${ip}`;
    const now = Date.now();
    const limit = RATE_LIMITS[operation];

    if (!rateLimitStore[key]) {
        return false;
    }

    const record = rateLimitStore[key];
    if (now > record.resetTime) {
        delete rateLimitStore[key];
        return false;
    }

    return record.attempts >= limit.maxAttempts;
}

export function recordFailedAttempt(ip: string): void {
    recordAttemptForOperation(ip, 'auth');
}

export function recordAttemptForOperation(ip: string, operation: keyof typeof RATE_LIMITS): void {
    const key = `${operation}:${ip}`;
    const now = Date.now();
    const limit = RATE_LIMITS[operation];

    if (!rateLimitStore[key]) {
        rateLimitStore[key] = {
            attempts: 1,
            resetTime: now + limit.duration
        };
    } else {
        const record = rateLimitStore[key];

        if (now > record.resetTime) {
            record.attempts = 1;
            record.resetTime = now + limit.duration;
        } else {
            record.attempts++;
        }
    }
}

export function clearFailedAttempts(ip: string): void {
    clearAttemptsForOperation(ip, 'auth');
}

export function clearAttemptsForOperation(ip: string, operation: keyof typeof RATE_LIMITS): void {
    const key = `${operation}:${ip}`;
    delete rateLimitStore[key];
}

export async function getAuthenticatedUser(req: NextRequest): Promise<JwtPayload | null> {
    try {
        let accessToken = parseTokenFromCookie(req.headers.get('cookie'), 'access_token');

        if (!accessToken) {
            const authHeader = req.headers.get('authorization');
            if (authHeader?.startsWith('Bearer ')) {
                accessToken = authHeader.substring(7);
            }
        }

        if (!accessToken) {
            return null;
        }

        return await verifyToken(accessToken);
    } catch (error) {
        return null;
    }
}

export async function requireAuth(req: NextRequest): Promise<JwtPayload> {
    const user = await getAuthenticatedUser(req);
    if (!user) {
        throw new Error('Authentication required');
    }
    return user;
}

export async function verifyAuth(req: NextRequest): Promise<{success: boolean, user: JwtPayload}> {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return { success: false } as {success: false, user: JwtPayload};
        }
        return { success: true, user };
    } catch (error) {
        return { success: false } as {success: false, user: JwtPayload};
    }
}

export function withAuth<T extends any[]>(
    handler: (req: NextRequest, user: JwtPayload, ...args: T) => Promise<Response>
) {
    return async (req: NextRequest, ...args: T): Promise<Response> => {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return Response.json({
                success: false,
                message: 'Authentication required'
            }, { status: 401 });
        }
        return handler(req, user, ...args);
    };
}

export function withOptionalAuth<T extends any[]>(
    handler: (req: NextRequest, user: JwtPayload | null, ...args: T) => Promise<Response>
) {
    return async (req: NextRequest, ...args: T): Promise<Response> => {
        const user = await getAuthenticatedUser(req);
        return handler(req, user, ...args);
    };
}

/**
 * Hashes a password using bcrypt
 * @param password The plain text password to hash
 * @returns Promise resolving to the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
    try {
        return await bcrypt.hash(password, 12);
    } catch (error) {
        throw new Error('Failed to hash password');
    }
}

/**
 * Verifies a password against its hash using bcrypt
 * @param hashedPassword The stored hash
 * @param plainPassword The plain text password to verify
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
    try {
        return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
        return false;
    }
}
