import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { isRateLimited, recordFailedAttempt, clearFailedAttempts } from '@/lib/auth';
import { sanitizeEmail } from '@/lib/api_utils';
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
        if (!sanitizedEmail) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('Invalid email format', 400);
        }

        const user = await prisma.$transaction(async (tx) => {
            const existingUser = await tx.user.findUnique({
                where: { email: sanitizedEmail },
            });

            if (existingUser) {
                throw new Error('User already exists');
            }

            const hashedPassword = await hashPassword(password);

            return tx.user.create({
                data: {
                    email: sanitizedEmail,
                    password: hashedPassword,
                    name: name.trim(),
                },
            });
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
        if (error instanceof Error && error.message === 'User already exists') {
            const clientIP = getClientIP(req.headers);
            recordFailedAttempt(clientIP);
            logAuditEvent({
                action: 'REGISTRATION_EMAIL_EXISTS',
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
            });
            return createErrorResponse('User already exists', 409);
        }
        console.error('Registration error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 