import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, verifyPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ChangePasswordSchema } from '@/types/schemas/user_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Change user password
 * Requires: current password, new password, confirm password
 * Returns: Success message or validation errors
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId } = user;

        const body = await request.json();

        const validation = ChangePasswordSchema.safeParse(body);
        if (!validation.success) {
            logAuditEvent({
                action: 'PASSWORD_CHANGE_VALIDATION_FAILED',
                userId,
                ip: getClientIP(request.headers),
                userAgent: getUserAgent(request.headers),
                resource: 'auth',
                timestamp: new Date(),
                details: { errors: validation.error.flatten().fieldErrors }
            });

            return NextResponse.json({
                error: 'Validation failed',
                details: validation.error.flatten().fieldErrors
            }, { status: 400 });
        }

        const { currentPassword, newPassword } = validation.data;

        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, password: true, email: true }
        });

        if (!dbUser) {
            logAuditEvent({
                action: 'PASSWORD_CHANGE_USER_NOT_FOUND',
                userId,
                ip: getClientIP(request.headers),
                userAgent: getUserAgent(request.headers),
                resource: 'auth',
                timestamp: new Date()
            });

            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const isCurrentPasswordValid = await verifyPassword(currentPassword, dbUser.password);
        if (!isCurrentPasswordValid) {
            logAuditEvent({
                action: 'PASSWORD_CHANGE_INVALID_CURRENT',
                userId,
                ip: getClientIP(request.headers),
                userAgent: getUserAgent(request.headers),
                resource: 'auth',
                timestamp: new Date()
            });

            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
        }

        const isSamePassword = await verifyPassword(newPassword, dbUser.password);
        if (isSamePassword) {
            logAuditEvent({
                action: 'PASSWORD_CHANGE_SAME_PASSWORD',
                userId,
                ip: getClientIP(request.headers),
                userAgent: getUserAgent(request.headers),
                resource: 'auth',
                timestamp: new Date()
            });

            return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 });
        }

        const hashedNewPassword = hashPassword(newPassword);
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: await hashedNewPassword,
                updatedAt: new Date()
            }
        });

        logAuditEvent({
            action: 'PASSWORD_CHANGE_SUCCESS',
            userId,
            ip: getClientIP(request.headers),
            userAgent: getUserAgent(request.headers),
            resource: 'auth',
            timestamp: new Date()
        });

        return NextResponse.json({ message: 'Password changed successfully' });

    } catch (error) {
        logAuditEvent({
            action: 'PASSWORD_CHANGE_ERROR',
            userId: 'unknown',
            ip: getClientIP(request.headers),
            userAgent: getUserAgent(request.headers),
            resource: 'auth',
            timestamp: new Date(),
            details: { error: error instanceof Error ? error.message : 'Unknown error' }
        });

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 