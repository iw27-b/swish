import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { UpdateExtendedUserSchema, UpdateExtendedUserRequestBody, VerifyPinSchema, VerifyPinRequestBody } from '@/types/schemas/user_extended_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { hashPassword, withAuth } from '@/lib/auth';
import { requirePinIfSet } from '@/lib/pin_utils';
import { Role } from '@prisma/client';

type CombinedRequestBody = UpdateExtendedUserRequestBody & { pin?: string };

/**
 * Get user's extended profile information
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @param params - The user ID
 * @returns JSON response with extended profile data or error
 */
export const GET = withAuth(async (
    req,
    user,
    { params }: { params: Promise<{ userId: string }> }
) => {
    try {
        const { userId } = await params;

        if (user.userId !== userId && user.role !== Role.ADMIN) {
            return createErrorResponse('Forbidden: You can only view your own extended profile', 403);
        }

        const targetUser = await prisma.user.findUnique({
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
                bio: true,
                // Removed: email, phoneNumber, dateOfBirth, shippingAddress, paymentMethods, securityPin
                // These are now available through separate secure endpoints
                
                // Include counts for social features (safe data)
                _count: {
                    select: {
                        followers: true,
                        following: true,
                        collections: true,
                        favoriteCards: true,
                        trackedListings: true,
                        purchases: true,
                        sales: true
                    }
                }
            },
        });

        if (!targetUser) {
            return createErrorResponse('User not found', 404);
        }

        const pinCheck = await prisma.user.findUnique({
            where: { id: userId },
            select: { securityPin: true }
        });

        const userResponse = {
            ...targetUser,
            hasSecurityPin: !!pinCheck?.securityPin
        };

        logAuditEvent({
            action: 'USER_EXTENDED_PROFILE_VIEWED',
            userId: user.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
        });

        return createSuccessResponse(userResponse, 'Extended profile retrieved successfully');

    } catch (error) {
        console.error('Get extended profile error:', error);
        return createErrorResponse('Internal server error', 500);
    }
});

/**
 * Update user's extended profile
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @param params - The user ID
 * @returns JSON response with updated profile or error
 */
export const PATCH = withAuth(async (
    req,
    user,
    { params }: { params: Promise<{ userId: string }> }
) => {
    try {
        const { userId } = await params;
        const requestingUser = user;

        if (requestingUser.userId !== userId && requestingUser.role !== Role.ADMIN) {
            return createErrorResponse('Forbidden: You can only update your own profile', 403);
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

        const { pin: pinProvided, ...profileData } = requestBody as CombinedRequestBody;

        const validationResult = UpdateExtendedUserSchema.safeParse(profileData);
        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const updateData = validationResult.data;

        if (Object.prototype.hasOwnProperty.call(updateData, 'shippingAddress')) {
            const pinError = await requirePinIfSet(
                userId,
                pinProvided,
                'shipping address update'
            );

            if (pinError) {
                return pinError;
            }
        }

        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                languagePreference: true,
                phoneNumber: true,
                dateOfBirth: true,
                bio: true,
                profileImageUrl: true,
                shippingAddress: true,
            },
        });

        if (!currentUser) {
            return createErrorResponse('User not found', 404);
        }

        const updatedFields: string[] = [];
        const finalUpdateData: any = {};

        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined && value !== (currentUser as any)[key]) {
                finalUpdateData[key] = value;
                updatedFields.push(key);
            }
        });

        if (Object.keys(finalUpdateData).length === 0) {
            return createSuccessResponse(currentUser, 'No changes detected');
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: finalUpdateData,
            select: {
                id: true,
                name: true,
                languagePreference: true,
                phoneNumber: true,
                dateOfBirth: true,
                bio: true,
                profileImageUrl: true,
                shippingAddress: true,
            },
        });

        logAuditEvent({
            action: 'USER_EXTENDED_PROFILE_UPDATED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
            details: { updatedFields },
        });

        return createSuccessResponse(updatedUser, 'Extended profile updated successfully');

    } catch (error) {
        console.error('Update extended profile error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}); 