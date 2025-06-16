import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword } from '@/lib/password_utils';
import { generateToken, sanitizeEmail, isRateLimited, recordFailedAttempt, clearFailedAttempts } from '@/lib/auth_utils';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { Role } from '@prisma/client';
import { LoginSchema, LoginRequestBody } from '@/types/schemas/auth_schemas';

/**
 * Handles user login with enhanced security and rate limiting
 * @param req The Next.js request object
 * @returns JSON response with authentication token and user data or error
 */
export async function POST(req: NextRequest) {
    try {
        const clientIP = getClientIP(req.headers);

        if (isRateLimited(clientIP)) {
            logAuditEvent({
                action: 'LOGIN_RATE_LIMITED',
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
            });
            return createErrorResponse('Too many login attempts. Please try again later.', 429);
        }

        const requestBody = await req.json();

        // Validate request size
        if (!validateRequestSize(requestBody)) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('Request too large', 413);
        }

        const validationResult = LoginSchema.safeParse(requestBody);

        if (!validationResult.success) {
            recordFailedAttempt(clientIP);
            logAuditEvent({
                action: 'LOGIN_VALIDATION_FAILED',
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
                details: { errors: validationResult.error.flatten().fieldErrors },
            });
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { email, password } = validationResult.data as LoginRequestBody;

        const sanitizedEmail = sanitizeEmail(email);

        const user = await prisma.user.findUnique({
            where: { email: sanitizedEmail },
        });

        if (!user) {
            recordFailedAttempt(clientIP);
            logAuditEvent({
                action: 'LOGIN_USER_NOT_FOUND',
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
                details: { email: sanitizedEmail },
            });
            return createErrorResponse('Invalid credentials', 401);
        }

        const isPasswordValid = await verifyPassword(user.password, password);

        if (!isPasswordValid) {
            recordFailedAttempt(clientIP);
            logAuditEvent({
                action: 'LOGIN_INVALID_PASSWORD',
                userId: user.id,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
            });
            return createErrorResponse('Invalid credentials', 401);
        }

        clearFailedAttempts(clientIP);

        const token = generateToken(user.id, user.role as Role);

        const { password: _, ...userWithoutPassword } = user;

        logAuditEvent({
            action: 'LOGIN_SUCCESS',
            userId: user.id,
            ip: clientIP,
            userAgent: getUserAgent(req.headers),
            resource: 'auth',
            timestamp: new Date(),
        });

        return createSuccessResponse({
            token,
            user: userWithoutPassword,
        }, 'Login successful');

    } catch (error) {
        console.error('Login error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 