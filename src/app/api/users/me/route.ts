import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { UpdateUserSchema, UpdateUserRequestBody } from '@/types/schemas/user_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';

/**
 * This route is used to get the current user's profile.
 * @param req AuthenticatedRequest - The user object that is authenticated
 * @returns JSON response with success or error message
 */

export async function GET(req: AuthenticatedRequest) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = req.user;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                emailVerified: true,
                twoFactorEnabled: true,
                isSeller: true,
                sellerVerificationStatus: true,
                languagePreference: true,
            },
        });

        if (!user) {
            return createErrorResponse('User not found', 404);
        }

        logAuditEvent({
            action: 'USER_PROFILE_SELF_VIEWED',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
        });

        return createSuccessResponse(user, 'Profile retrieved successfully');

    } catch (error) {
        console.error('Get current user error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * This route is used to update the current user's profile.
 * @param req AuthenticatedRequest - The user object that is authenticated
 * @returns JSON response with success or error message
 */

export async function PATCH(req: AuthenticatedRequest) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = req.user;

        const requestBody = await req.json();

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
                    email: true,
                    name: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                    emailVerified: true,
                    twoFactorEnabled: true,
                    isSeller: true,
                    sellerVerificationStatus: true,
                    languagePreference: true,
                },
            });
            return createSuccessResponse(currentUser, 'No changes detected');
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                emailVerified: true,
                twoFactorEnabled: true,
                isSeller: true,
                sellerVerificationStatus: true,
                languagePreference: true,
            },
        });

        logAuditEvent({
            action: 'USER_PROFILE_SELF_UPDATED',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
            details: { updatedFields: Object.keys(updateData) },
        });

        return createSuccessResponse(updatedUser, 'Profile updated successfully');

    } catch (error) {
        console.error('Update current user error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 