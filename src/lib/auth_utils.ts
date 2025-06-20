import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { JwtPayload } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets are not defined');
}

const RATE_LIMIT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const MAX_FAILED_ATTEMPTS = 5;

const RATE_LIMITS = {
    auth: { maxAttempts: MAX_FAILED_ATTEMPTS, duration: RATE_LIMIT_DURATION },
    search: { maxAttempts: 100, duration: 60 * 1000 }, 
    collections: { maxAttempts: 20, duration: 60 * 1000 }, 
    profile_updates: { maxAttempts: 10, duration: 60 * 1000 }, 
    purchases: { maxAttempts: 5, duration: 60 * 1000 }, 
    trades: { maxAttempts: 10, duration: 60 * 1000 },
};

// In-memory store for rate limiting TODO: switch to Redis later
const rateLimitStore: Record<string, { attempts: number; resetTime: number }> = {};

/**
 * Generates a JWT for a given user.
 * @param userId The ID of the user.
 * @param role The role of the user.
 * @returns The generated JWT string.
 */
export function generateToken(userId: string, role: string = 'USER'): string {
    const payload = {
        userId,
        role,
    };

    try {
        const token = jwt.sign(payload, JWT_SECRET!, { 
            expiresIn: '15m',
            algorithm: 'HS256'
        });
        return token;
    } catch (error) {
        throw new Error(`Failed to generate token: ${error instanceof Error ? error.message : error}`);
    }
}

/**
 * Generates a refresh JWT for a given user.
 * @param userId The ID of the user.
 * @param role The role of the user.
 * @returns The generated refresh JWT string.
 */
export function generateRefreshToken(userId: string, role: string = 'USER'): string {
    const payload = {
        userId,
        role,
    };

    try {
        const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET!, { 
            expiresIn: '7d',
            algorithm: 'HS256'
        });
        return refreshToken;
    } catch (error) {
        throw new Error(`Failed to generate refresh token: ${error instanceof Error ? error.message : error}`);
    }
}

/**
 * Verifies a JWT and returns its payload if valid.
 * @param token The JWT string to verify.
 * @returns The decoded JwtPayload if the token is valid, otherwise null.
 */
export function verifyToken(token: string): { userId: string; role: string } | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET!) as any;
        return { userId: decoded.userId, role: decoded.role };
    } catch (error) {
        return null;
    }
}

/**
 * Check if IP is rate limited for authentication attempts
 * @param ip The client IP address
 * @returns true if rate limited, false otherwise
 */
export function isRateLimited(ip: string): boolean {
    return isRateLimitedForOperation(ip, 'auth');
}

/**
 * Check if IP is rate limited for a specific operation type
 * @param ip The client IP address
 * @param operation The type of operation being rate limited
 * @returns true if rate limited, false otherwise
 */
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

/**
 * Record a failed authentication attempt for rate limiting
 * @param ip The client IP address
 */
export function recordFailedAttempt(ip: string): void {
    recordAttemptForOperation(ip, 'auth');
}

/**
 * Record an attempt for a specific operation type
 * @param ip The client IP address
 * @param operation The type of operation
 */
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

/**
 * Clear failed authentication attempts for an IP
 * @param ip The client IP address
 */
export function clearFailedAttempts(ip: string): void {
    clearAttemptsForOperation(ip, 'auth');
}

/**
 * Clear attempts for a specific operation type
 * @param ip The client IP address
 * @param operation The type of operation
 */
export function clearAttemptsForOperation(ip: string, operation: keyof typeof RATE_LIMITS): void {
    const key = `${operation}:${ip}`;
    delete rateLimitStore[key];
}

export function hashPassword(password: string): string {
    return bcrypt.hashSync(password, 12);
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
    return bcrypt.compareSync(password, hashedPassword);
}