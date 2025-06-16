import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { JwtPayload } from '@/types';

const JWT_SECRET: string = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables. Please add it to your .env file.');
}

const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

/**
 * Generates a JWT for a given user.
 * @param userId The ID of the user.
 * @param role The role of the user.
 * @returns The generated JWT string.
 */
export function generateToken(userId: string, role: Role): string {
    const payload: Pick<JwtPayload, 'userId' | 'role'> = { userId, role };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verifies a JWT and returns its payload if valid.
 * @param token The JWT string to verify.
 * @returns The decoded JwtPayload if the token is valid, otherwise null.
 */
export function verifyToken(token: string): JwtPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        return decoded;
    } catch (error) {
        return null;
    }
}

/**
 * Checks if an IP address is rate limited for login attempts.
 * @param ipAddress The IP address to check.
 * @returns true if rate limited, false otherwise.
 */
export function isRateLimited(ipAddress: string): boolean {
    const now = Date.now();
    const attempts = loginAttempts.get(ipAddress);

    if (!attempts) {
        return false;
    }

    if (now > attempts.resetTime) {
        loginAttempts.delete(ipAddress);
        return false;
    }

    return attempts.count >= MAX_LOGIN_ATTEMPTS;
}

/**
 * Records a failed login attempt for rate limiting.
 * @param ipAddress The IP address of the failed attempt.
 */
export function recordFailedAttempt(ipAddress: string): void {
    const now = Date.now();
    const attempts = loginAttempts.get(ipAddress);

    if (!attempts) {
        loginAttempts.set(ipAddress, { count: 1, resetTime: now + LOCKOUT_TIME });
    } else {
        attempts.count += 1;
        attempts.resetTime = now + LOCKOUT_TIME;
    }
}

/**
 * Clears failed login attempts for an IP address (on successful login).
 * @param ipAddress The IP address to clear attempts for.
 */
export function clearFailedAttempts(ipAddress: string): void {
    loginAttempts.delete(ipAddress);
}

/**
 * Sanitizes email input by trimming and converting to lowercase.
 * @param email The email to sanitize.
 * @returns The sanitized email.
 */
export function sanitizeEmail(email: string): string {
    return email.trim().toLowerCase();
} 