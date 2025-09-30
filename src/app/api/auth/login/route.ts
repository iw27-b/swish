import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, generateToken, generateRefreshToken, isRateLimited, recordFailedAttempt, clearFailedAttempts } from '@/lib/auth';
import { sanitizeEmail } from '@/lib/api_utils';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { Role } from '@prisma/client';
import { LoginSchema, LoginRequestBody } from '@/types/schemas/auth_schemas';
import { generateCsrfToken, setCsrfCookie, setStrictCorsHeaders, getAllowedOrigins } from '@/lib/csrf';

/**
 * Sets CORS headers for cross-origin requests with credentials
 * Uses strict origin checking for login endpoint
 * @param response The NextResponse object to add headers to
 * @param origin The origin header from the request
 * @returns The response with CORS headers
 */
function setCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
    setStrictCorsHeaders(response, origin || null, 'POST, OPTIONS');
    return response;
}

/**
 * Handles CORS preflight requests
 * @param req The Next.js request object
 * @returns Response with CORS headers
 */
export async function OPTIONS(req: NextRequest) {
    const response = new NextResponse(null, { status: 204 });
    return setCorsHeaders(response, req.headers.get('origin'));
}

/**
 * Handles user login with secure HttpOnly cookie authentication
 * @param req The Next.js request object
 * @returns JSON response with login success boolean (NO USER DATA) and sets secure cookies
 */
export async function POST(req: NextRequest) {
    try {
        const origin = req.headers.get('origin');
        const clientIP = getClientIP(req.headers);

        if (isRateLimited(clientIP)) {
            logAuditEvent({
                action: 'LOGIN_RATE_LIMITED',
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
            });
            const response = createErrorResponse('Too many login attempts. Please try again later.', 429);
            return setCorsHeaders(response, origin);
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
            const response = createErrorResponse('Invalid JSON format in request body', 400);
            return setCorsHeaders(response, origin);
        }

        if (!validateRequestSize(requestBody)) {
            recordFailedAttempt(clientIP);
            const response = createErrorResponse('Request too large', 413);
            return setCorsHeaders(response, origin);
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
            const response = createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
            return setCorsHeaders(response, origin);
        }

        const { email, password } = validationResult.data as LoginRequestBody;

        const sanitizedEmail = sanitizeEmail(email);
        if (!sanitizedEmail) {
            recordFailedAttempt(clientIP);
            const response = createErrorResponse('Invalid email format', 400);
            return setCorsHeaders(response, origin);
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
            const response = createErrorResponse('Invalid credentials', 401);
            return setCorsHeaders(response, origin);
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
            const response = createErrorResponse('Invalid credentials', 401);
            return setCorsHeaders(response, origin);
        }

        clearFailedAttempts(clientIP);

        const accessToken = await generateToken(user.id, user.role as Role);
        const refreshToken = await generateRefreshToken(user.id, user.role as Role);
        const csrfToken = generateCsrfToken();

        logAuditEvent({
            action: 'LOGIN_SUCCESS',
            userId: user.id,
            ip: clientIP,
            userAgent: getUserAgent(req.headers),
            resource: 'auth',
            timestamp: new Date(),
        });

        const response = createSuccessResponse({
            loginSuccess: true,
            csrfToken
        }, 'Login successful');

        const isProduction = process.env.NODE_ENV === 'production';

        response.cookies.set('access_token', accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 15 * 60,
            path: '/'
        });

        response.cookies.set('refresh_token', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/'
        });

        setCsrfCookie(response, csrfToken, isProduction);

        return setCorsHeaders(response, origin);

    } catch (error) {
        console.error('Login error:', error);
        const response = createErrorResponse('Internal server error', 500);
        return setCorsHeaders(response, req.headers.get('origin'));
    }
} 