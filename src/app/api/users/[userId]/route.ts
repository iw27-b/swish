import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { UpdateUserSchema, UpdateUserRequestBody } from '@/types/schemas/user_schemas';
import { VerifyPinSchema, VerifyPinRequestBody } from '@/types/schemas/user_extended_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { requirePinIfSet } from '@/lib/pin_utils';
import { Role } from '@prisma/client';
import { isRateLimitedForOperation, recordAttemptForOperation } from '@/lib/auth';

/**
 * This route is used to get a specific user's profile.
 * @param req AuthenticatedRequest - The user object that is authenticated
 * @param params - The user ID
 * @returns JSON response with success or error message
 */

export async function GET(
    req: AuthenticatedRequest, 
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = await params;
        const requestingUser = req.user;

        if (requestingUser.userId !== userId && requestingUser.role !== Role.ADMIN) {
            logAuditEvent({
                action: 'UNAUTHORIZED_USER_ACCESS_ATTEMPT',
                userId: requestingUser.userId,
                ip: getClientIP(req.headers),
                userAgent: getUserAgent(req.headers),
                resource: 'user',
                resourceId: userId,
                timestamp: new Date(),
            });
            return createErrorResponse('Forbidden: You can only view your own profile', 403);
        }

        if (!userId) {
            return createErrorResponse('User ID is required', 400);
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                emailVerified: true,
                twoFactorEnabled: true,
                isSeller: true,
                sellerVerificationStatus: true,
                languagePreference: true,
                profileImageUrl: true,
            },
        });

        if (!user) {
            return createErrorResponse('User not found', 404);
        }

        logAuditEvent({
            action: 'USER_PROFILE_VIEWED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
        });

        return createSuccessResponse(user, 'User profile retrieved successfully');

    } catch (error) {
        console.error('Get user error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * This route is used to update a specific user's profile.
 * @param req AuthenticatedRequest - The user object that is authenticated
 * @param params - The user ID
 * @returns JSON response with success or error message
 */

export async function PATCH(
    req: AuthenticatedRequest, 
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = await params;
        const requestingUser = req.user;

        if (requestingUser.userId !== userId) {
            logAuditEvent({
                action: 'UNAUTHORIZED_USER_UPDATE_ATTEMPT',
                userId: requestingUser.userId,
                ip: getClientIP(req.headers),
                userAgent: getUserAgent(req.headers),
                resource: 'user',
                resourceId: userId,
                timestamp: new Date(),
            });
            return createErrorResponse('Forbidden: You can only update your own profile', 403);
        }

        if (!userId) {
            return createErrorResponse('User ID is required', 400);
        }

        const clientIP = getClientIP(req.headers);

        if (isRateLimitedForOperation(clientIP, 'profile_updates')) {
            logAuditEvent({
                action: 'PROFILE_UPDATE_RATE_LIMITED',
                userId: requestingUser.userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'user',
                resourceId: userId,
                timestamp: new Date(),
            });
            return createErrorResponse('Too many profile updates. Please try again later.', 429);
        }

        let requestBody;
        try {
            requestBody = await req.json();
        } catch (error) {
            return createErrorResponse('Invalid JSON format in request body', 400);
        }

         if (!validateRequestSize(requestBody)) {
             return createErrorResponse('Request too large', 413);
         }

         const validationResult = UpdateUserSchema.safeParse(requestBody);
         if (!validationResult.success) {
             return createErrorResponse(
                 'Invalid request data',
                 400,
                 validationResult.error.flatten().fieldErrors
             );
         }

        const { name, languagePreference } = validationResult.data as UpdateUserRequestBody;

        recordAttemptForOperation(clientIP, 'profile_updates');

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, languagePreference: true }
        });

        if (!existingUser) {
            return createErrorResponse('User not found', 404);
        }

        const updateData: any = {};
        if (name !== undefined && name !== existingUser.name) {
            updateData.name = name.trim();
        }
        if (languagePreference !== undefined && languagePreference !== existingUser.languagePreference) {
            updateData.languagePreference = languagePreference;
        }

        if (Object.keys(updateData).length === 0) {
            const currentUser = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                    emailVerified: true,
                    twoFactorEnabled: true,
                    isSeller: true,
                    sellerVerificationStatus: true,
                    languagePreference: true,
                    profileImageUrl: true,
                },
            });
            return createSuccessResponse(currentUser, 'No changes detected');
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                emailVerified: true,
                twoFactorEnabled: true,
                isSeller: true,
                sellerVerificationStatus: true,
                languagePreference: true,
                profileImageUrl: true,
            },
        });

        logAuditEvent({
            action: 'USER_PROFILE_UPDATED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
            details: { updatedFields: Object.keys(updateData) },
        });

        return createSuccessResponse(updatedUser, 'User profile updated successfully');

    } catch (error) {
        console.error('Update user error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * This route is used to delete a specific user's profile. (AS ADMIN)
 * @param req AuthenticatedRequest - The user object that is authenticated
 * @param params - The user ID
 * @returns JSON response with success or error message
 */

export async function DELETE(
    req: AuthenticatedRequest, 
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = await params;
        const requestingUser = req.user;

        if (requestingUser.userId !== userId && requestingUser.role !== Role.ADMIN) {
            logAuditEvent({
                action: 'UNAUTHORIZED_USER_DELETE_ATTEMPT',
                userId: requestingUser.userId,
                ip: getClientIP(req.headers),
                userAgent: getUserAgent(req.headers),
                resource: 'user',
                resourceId: userId,
                timestamp: new Date(),
            });
            return createErrorResponse('Forbidden: You can only delete your own account', 403);
        }

        if (!userId) {
            return createErrorResponse('User ID is required', 400);
        }

        let requestBody: VerifyPinRequestBody | null = null;
        try {
            const body = await req.json();
            if (body && typeof body === 'object') {
                const validation = VerifyPinSchema.safeParse(body);
                if (validation.success) {
                    requestBody = validation.data;
                }
            }
        } catch {
        }

        if (requestingUser.userId === userId) {
            const pinError = await requirePinIfSet(
                userId,
                requestBody?.pin,
                'account deletion'
            );

            if (pinError) {
                return pinError;
            }
        }

        const userToDelete = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true }
        });

        if (!userToDelete) {
            return createErrorResponse('User not found', 404);
        }

        if (userToDelete.role === Role.ADMIN && requestingUser.userId !== userId) {
            logAuditEvent({
                action: 'ADMIN_DELETE_ADMIN_ATTEMPT',
                userId: requestingUser.userId,
                ip: getClientIP(req.headers),
                userAgent: getUserAgent(req.headers),
                resource: 'user',
                resourceId: userId,
                timestamp: new Date(),
            });
            return createErrorResponse('Forbidden: Cannot delete other admin accounts', 403);
        }

        await prisma.user.delete({
            where: { id: userId },
        });

        logAuditEvent({
            action: 'USER_DELETED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
            details: { 
                deletedUserEmail: userToDelete.email, 
                deletedUserRole: userToDelete.role,
                selfDeletion: requestingUser.userId === userId
            },
        });

        return createSuccessResponse(null, 'User account deleted successfully');

    } catch (error) {
        console.error('Delete user error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 