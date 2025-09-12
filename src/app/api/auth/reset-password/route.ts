import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ResetPasswordSchema, ResetPasswordRequestBody } from '@/types/schemas/user_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { isRateLimited, recordFailedAttempt, clearFailedAttempts } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/auth';

/**
 * This route is used to reset the password of the user.
 * @param req NextRequest - The request object
 * @returns JSON response with success or error message
 */

export async function POST(req: NextRequest) {
    try {
        const clientIP = getClientIP(req.headers);

        if (isRateLimited(clientIP)) {
            logAuditEvent({
                action: 'PASSWORD_RESET_COMPLETION_RATE_LIMITED',
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
            });
            return createErrorResponse('Too many password reset attempts. Please try again later.', 429);
        }

        const requestBody = await req.json();

        if (!validateRequestSize(requestBody)) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('Request too large', 413);
        }

        const validationResult = ResetPasswordSchema.safeParse(requestBody);
        if (!validationResult.success) {
            recordFailedAttempt(clientIP);
            logAuditEvent({
                action: 'PASSWORD_RESET_VALIDATION_FAILED',
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

        const { token, password } = validationResult.data as ResetPasswordRequestBody;

        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() },
            },
            select: { id: true, email: true, password: true }
        });

        if (!user) {
            recordFailedAttempt(clientIP);
            logAuditEvent({
                action: 'PASSWORD_RESET_INVALID_TOKEN',
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
                details: { token: `${token.substring(0, 10)}...` },
            });
            return createErrorResponse('Invalid or expired reset token', 400);
        }

        const isSamePassword = await verifyPassword(user.password, password);
        if (isSamePassword) {
            recordFailedAttempt(clientIP);
            logAuditEvent({
                action: 'PASSWORD_RESET_SAME_PASSWORD',
                userId: user.id,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
            });
            return createErrorResponse('New password must be different from your current password', 400);
        }

        const hashedPassword = await hashPassword(password);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        clearFailedAttempts(clientIP);

        logAuditEvent({
            action: 'PASSWORD_RESET_COMPLETED',
            userId: user.id,
            ip: clientIP,
            userAgent: getUserAgent(req.headers),
            resource: 'auth',
            timestamp: new Date(),
            details: { email: user.email },
        });

        return createSuccessResponse(
            null,
            'Password reset successfully. You can now log in with your new password.'
        );

    } catch (error) {
        console.error('Reset password error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 