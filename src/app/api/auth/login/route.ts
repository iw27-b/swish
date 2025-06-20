import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword } from '@/lib/password_utils';
import { generateEdgeToken, generateEdgeRefreshToken } from '@/lib/edge_auth_utils';
import { isRateLimited, recordFailedAttempt, clearFailedAttempts } from '@/lib/auth_utils';
import { sanitizeEmail } from '@/lib/api_utils';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { Role } from '@prisma/client';
import { LoginSchema, LoginRequestBody } from '@/types/schemas/auth_schemas';

/**
 * Handles user login with secure HttpOnly cookie authentication
 * @param req The Next.js request object
 * @returns JSON response with login success boolean (NO USER DATA) and sets secure cookies
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

        let requestBody;
        try {
            requestBody = await req.json();
        } catch (error) {
            recordFailedAttempt(clientIP);
            logAuditEvent({
                action: 'LOGIN_INVALID_JSON',
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
                details: { error: 'Invalid JSON format' },
            });
            return createErrorResponse('Invalid JSON format in request body', 400);
        }

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
        if (!sanitizedEmail) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('Invalid email format', 400);
        }

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

        // Generate tokens for secure cookie storage using Edge Runtime compatible functions
        const accessToken = await generateEdgeToken(user.id, user.role as Role);
        const refreshToken = await generateEdgeRefreshToken(user.id, user.role as Role);

        logAuditEvent({
            action: 'LOGIN_SUCCESS',
            userId: user.id,
            ip: clientIP,
            userAgent: getUserAgent(req.headers),
            resource: 'auth',
            timestamp: new Date(),
        });

        // Create minimal response - NO SENSITIVE USER DATA
        const response = createSuccessResponse({
            loginSuccess: true,
        }, 'Login successful');

        // Set secure HttpOnly access token cookie
        response.cookies.set('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60, // 15 minutes
            path: '/'
        });

        // Set secure HttpOnly refresh token cookie
        response.cookies.set('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/'
        });

        // Set minimal user data cookie for client-side access (ONLY safe, non-sensitive data)
        response.cookies.set('user_data', JSON.stringify({
            id: user.id,                    // Safe: Just an identifier
            name: user.name,                // Safe: Display name
            role: user.role,                // Safe: Needed for UI permissions
            isEmailVerified: user.emailVerified  // Safe: UI state only
        }), {
            httpOnly: false, // Accessible to client for UI purposes
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60, // Same as access token
            path: '/'
        });

        return response;

    } catch (error) {
        console.error('Login error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 