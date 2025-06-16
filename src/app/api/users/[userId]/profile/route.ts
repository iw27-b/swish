import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { UpdateExtendedUserSchema, UpdateExtendedUserRequestBody, SetSecurityPinSchema, SetSecurityPinRequestBody } from '@/types/schemas/user_extended_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { hashPassword } from '@/lib/password_utils';
import { Role } from '@prisma/client';

/**
 * Get user's extended profile information
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The user ID
 * @returns JSON response with extended profile data or error
 */
export async function GET(
    req: AuthenticatedRequest,
    { params }: { params: { userId: string } }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = params;
        const requestingUser = req.user;

        if (requestingUser.userId !== userId && requestingUser.role !== Role.ADMIN) {
            return createErrorResponse('Forbidden: You can only view your own extended profile', 403);
        }

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
                phoneNumber: true,
                dateOfBirth: true,
                profileImageUrl: true,
                bio: true,
                shippingAddress: true,
                paymentMethods: true,
                securityPin: true,
                // Include counts for social features
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

        if (!user) {
            return createErrorResponse('User not found', 404);
        }

        const { securityPin, ...userWithoutPin } = user;
        const userResponse = {
            ...userWithoutPin,
            hasSecurityPin: !!securityPin
        };

        logAuditEvent({
            action: 'USER_EXTENDED_PROFILE_VIEWED',
            userId: requestingUser.userId,
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
}

/**
 * Update user's extended profile information
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The user ID
 * @returns JSON response with updated profile or error
 */
export async function PATCH(
    req: AuthenticatedRequest,
    { params }: { params: { userId: string } }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = params;
        const requestingUser = req.user;

        if (requestingUser.userId !== userId) {
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

        const validationResult = UpdateExtendedUserSchema.safeParse(requestBody);
        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { 
            name, 
            languagePreference, 
            phoneNumber, 
            dateOfBirth, 
            bio, 
            profileImageUrl, 
            shippingAddress 
        } = validationResult.data as UpdateExtendedUserRequestBody;

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { 
                id: true, 
                name: true, 
                languagePreference: true,
                phoneNumber: true,
                dateOfBirth: true,
                bio: true,
                profileImageUrl: true,
                shippingAddress: true
            }
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
        if (phoneNumber !== undefined && phoneNumber !== existingUser.phoneNumber) {
            updateData.phoneNumber = phoneNumber;
        }
        if (dateOfBirth !== undefined && dateOfBirth !== existingUser.dateOfBirth) {
            updateData.dateOfBirth = dateOfBirth;
        }
        if (bio !== undefined && bio !== existingUser.bio) {
            updateData.bio = bio?.trim();
        }
        if (profileImageUrl !== undefined && profileImageUrl !== existingUser.profileImageUrl) {
            updateData.profileImageUrl = profileImageUrl;
        }
        if (shippingAddress !== undefined) {
            updateData.shippingAddress = shippingAddress;
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
                    phoneNumber: true,
                    dateOfBirth: true,
                    profileImageUrl: true,
                    bio: true,
                    shippingAddress: true,
                    paymentMethods: true,
                    securityPin: true,
                },
            });
            
            if (currentUser) {
                const { securityPin, ...userWithoutPin } = currentUser;
                const userResponse = {
                    ...userWithoutPin,
                    hasSecurityPin: !!securityPin
                };
                return createSuccessResponse(userResponse, 'No changes detected');
            }
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
                phoneNumber: true,
                dateOfBirth: true,
                profileImageUrl: true,
                bio: true,
                shippingAddress: true,
                paymentMethods: true,
                securityPin: true,
            },
        });

        const { securityPin, ...userWithoutPin } = updatedUser;
        const userResponse = {
            ...userWithoutPin,
            hasSecurityPin: !!securityPin
        };

        logAuditEvent({
            action: 'USER_EXTENDED_PROFILE_UPDATED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
            details: { updatedFields: Object.keys(updateData) },
        });

        return createSuccessResponse(userResponse, 'Extended profile updated successfully');

    } catch (error) {
        console.error('Update extended profile error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 