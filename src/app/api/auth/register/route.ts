import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/password_utils';
import { sanitizeEmail, isRateLimited, recordFailedAttempt, clearFailedAttempts } from '@/lib/auth_utils';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { RegisterSchema, RegisterRequestBody } from '@/types/schemas/auth_schemas';

/**
 * Handles user registration with enhanced security
 * @param req The Next.js request object
 * @returns JSON response with user data or error
 */
export async function POST(req: NextRequest) {
    try {
        const clientIP = getClientIP(req.headers);

        if (isRateLimited(clientIP)) {
            logAuditEvent({
                action: 'REGISTRATION_RATE_LIMITED',
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
            });
            return createErrorResponse('Too many registration attempts. Please try again later.', 429);
        }

        const contentLength = req.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > 100000) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('Request too large', 413);
        }

        let requestBody;
        try {
            requestBody = await req.json();
        } catch (error) {
            recordFailedAttempt(clientIP);
            logAuditEvent({
                action: 'REGISTRATION_INVALID_JSON',
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
                details: { error: 'Invalid JSON format' },
            });
            return createErrorResponse('Invalid JSON format in request body', 400);
        }

        const validationResult = RegisterSchema.safeParse(requestBody);

        if (!validationResult.success) {
            recordFailedAttempt(clientIP);
            logAuditEvent({
                action: 'REGISTRATION_VALIDATION_FAILED',
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
        
        const { email, password, name } = validationResult.data as RegisterRequestBody;

        const sanitizedEmail = sanitizeEmail(email);

        const existingUser = await prisma.user.findUnique({
            where: { email: sanitizedEmail },
        });

        if (existingUser) {
            recordFailedAttempt(clientIP);
            logAuditEvent({
                action: 'REGISTRATION_EMAIL_EXISTS',
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
                details: { email: sanitizedEmail },
            });
            return createErrorResponse('User already exists', 409);
        }

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                email: sanitizedEmail,
                password: hashedPassword,
                name: name.trim(),
            },
        });

        const { password: _, ...userWithoutPassword } = user;

        clearFailedAttempts(clientIP);

        logAuditEvent({
            action: 'USER_REGISTERED',
            userId: user.id,
            ip: clientIP,
            userAgent: getUserAgent(req.headers),
            resource: 'auth',
            timestamp: new Date(),
            details: { email: sanitizedEmail },
        });

        return createSuccessResponse(
            { user: userWithoutPassword },
            'User created successfully'
        );

    } catch (error) {
        console.error('Registration error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 