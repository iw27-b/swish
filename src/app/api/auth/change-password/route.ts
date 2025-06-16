import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { ChangePasswordSchema, ChangePasswordRequestBody } from '@/types/schemas/user_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { verifyPassword, hashPassword } from '@/lib/password_utils';
import { isRateLimited, recordFailedAttempt, clearFailedAttempts } from '@/lib/auth_utils';

/**
* This route is used to change the password of the authenticated user.
* @param req AuthenticatedRequest - The request object
* @returns JSON response with success or error message
*/

export async function POST(req: AuthenticatedRequest) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = req.user;
        const clientIP = getClientIP(req.headers);

        if (isRateLimited(clientIP)) {
            logAuditEvent({
                action: 'PASSWORD_CHANGE_RATE_LIMITED',
                userId: userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
            });
            return createErrorResponse('Too many password change attempts. Please try again later.', 429);
        }

        const requestBody = await req.json();

        if (!validateRequestSize(requestBody)) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('Request too large', 413);
        }

        const validationResult = ChangePasswordSchema.safeParse(requestBody);
        if (!validationResult.success) {
            recordFailedAttempt(clientIP);
            logAuditEvent({
                action: 'PASSWORD_CHANGE_VALIDATION_FAILED',
                userId: userId,
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

        const { currentPassword, newPassword } = validationResult.data as ChangePasswordRequestBody;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, password: true }
        });

        if (!user) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('User not found', 404);
        }

        const isCurrentPasswordValid = await verifyPassword(user.password, currentPassword);
        if (!isCurrentPasswordValid) {
            recordFailedAttempt(clientIP);
            logAuditEvent({
                action: 'PASSWORD_CHANGE_INVALID_CURRENT_PASSWORD',
                userId: userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
            });
            return createErrorResponse('Current password is incorrect', 401);
        }

        const isSamePassword = await verifyPassword(user.password, newPassword);
        if (isSamePassword) {
            recordFailedAttempt(clientIP);
            logAuditEvent({
                action: 'PASSWORD_CHANGE_SAME_PASSWORD',
                userId: userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
            });
            return createErrorResponse('New password must be different from current password', 400);
        }

        const hashedNewPassword = await hashPassword(newPassword);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword },
        });

        clearFailedAttempts(clientIP);

        logAuditEvent({
            action: 'PASSWORD_CHANGED',
            userId: userId,
            ip: clientIP,
            userAgent: getUserAgent(req.headers),
            resource: 'auth',
            timestamp: new Date(),
        });

        return createSuccessResponse(
            null, 
            'Password changed successfully. Please log in again with your new password.'
        );

    } catch (error) {
        console.error('Change password error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 