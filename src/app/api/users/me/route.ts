import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { UpdateUserSchema, UpdateUserRequestBody, UpdateSensitiveUserSchema, UpdateSensitiveUserRequestBody } from '@/types/schemas/user_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { requirePinIfSet, requirePin } from '@/lib/pin_utils';

/**
 * Get current user's complete profile (all data except security tokens)
 * Since user is authenticated and accessing their own data, no PIN required for viewing
 * @param req AuthenticatedRequest - The user object that is authenticated
 * @returns JSON response with complete profile data
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
                profileImageUrl: true,
                phoneNumber: true,
                dateOfBirth: true,
                bio: true,
                shippingAddress: true,
                paymentMethods: true,
                password: false,
                emailVerificationToken: false,
                resetToken: false,
                securityPin: false,
            },
        });

        if (!user) {
            return createErrorResponse('User not found', 404);
        }

        const responseData = {
            ...user,
            hasSecurityPin: await prisma.user.findUnique({
                where: { id: userId },
                select: { securityPin: true }
            }).then(u => !!u?.securityPin)
        };

        logAuditEvent({
            action: 'USER_COMPLETE_PROFILE_VIEWED',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
            details: { 
                accessType: 'self-access',
                securityLevel: 'authenticated-only'
            },
        });

        return createSuccessResponse(responseData, 'Complete profile retrieved successfully');

    } catch (error) {
        console.error('Get current user error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * Update current user's profile with PIN protection for sensitive fields
 * Basic fields (name, language) can be updated freely
 * Sensitive fields (email, phone, DOB, bio) require PIN if user has one set
 * Financial fields (shipping address) always require PIN
 * @param req AuthenticatedRequest - The user object that is authenticated
 * @returns JSON response with updated profile
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

        const sensitiveFields = ['email', 'phoneNumber', 'dateOfBirth', 'bio', 'shippingAddress'];
        const hasSensitiveFields = sensitiveFields.some(field => requestBody.hasOwnProperty(field));

        let validationResult;
        if (hasSensitiveFields) {
            validationResult = UpdateSensitiveUserSchema.safeParse(requestBody);
        } else {
            validationResult = UpdateUserSchema.safeParse(requestBody);
        }

        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { 
                id: true, 
                name: true, 
                email: true,
                phoneNumber: true,
                dateOfBirth: true,
                bio: true,
                languagePreference: true,
                profileImageUrl: true,
                shippingAddress: true,
                securityPin: true
            }
        });

        if (!existingUser) {
            return createErrorResponse('User not found', 404);
        }

        const updateData = validationResult.data as UpdateSensitiveUserRequestBody;
        const hasSecurityPin = !!existingUser.securityPin;

        // Determine which fields require PIN verification
        const sensitiveUpdateFields = [];
        const financialUpdateFields = [];
        
        if (updateData.email && updateData.email !== existingUser.email) {
            sensitiveUpdateFields.push('email');
        }
        if (updateData.phoneNumber !== undefined && updateData.phoneNumber !== existingUser.phoneNumber) {
            sensitiveUpdateFields.push('phoneNumber');
        }
        if (updateData.dateOfBirth !== undefined) {
            const currentDOB = existingUser.dateOfBirth?.toISOString().split('T')[0];
            if (updateData.dateOfBirth !== currentDOB) {
                sensitiveUpdateFields.push('dateOfBirth');
            }
        }
        if (updateData.bio !== undefined && updateData.bio !== existingUser.bio) {
            sensitiveUpdateFields.push('bio');
        }
        if (updateData.shippingAddress) {
            financialUpdateFields.push('shippingAddress');
        }

        const requiresPinVerification = (hasSecurityPin && sensitiveUpdateFields.length > 0) || financialUpdateFields.length > 0;
        
        if (requiresPinVerification) {
            let pinErrorResponse = null;
            
            if (financialUpdateFields.length > 0) {
                pinErrorResponse = await requirePin(userId, updateData.securityPin, 'update financial information');
            } else if (hasSecurityPin && sensitiveUpdateFields.length > 0) {
                pinErrorResponse = await requirePinIfSet(userId, updateData.securityPin, 'update sensitive information');
            }
            
            if (pinErrorResponse) {
                return pinErrorResponse;
            }
        }

        const { securityPin, ...updateFields } = updateData;
        const finalUpdateData: any = {};

        if (updateFields.name !== undefined && updateFields.name !== existingUser.name) {
            finalUpdateData.name = updateFields.name.trim();
        }
        if (updateFields.languagePreference !== undefined && updateFields.languagePreference !== existingUser.languagePreference) {
            finalUpdateData.languagePreference = updateFields.languagePreference;
        }
        if (updateFields.profileImageUrl !== undefined && updateFields.profileImageUrl !== existingUser.profileImageUrl) {
            finalUpdateData.profileImageUrl = updateFields.profileImageUrl || null;
        }
        if (updateFields.email !== undefined && updateFields.email !== existingUser.email) {
            finalUpdateData.email = updateFields.email;
            finalUpdateData.emailVerified = false; 
        }
        if (updateFields.phoneNumber !== undefined && updateFields.phoneNumber !== existingUser.phoneNumber) {
            finalUpdateData.phoneNumber = updateFields.phoneNumber || null;
        }
        if (updateFields.dateOfBirth !== undefined) {
            const currentDOB = existingUser.dateOfBirth?.toISOString().split('T')[0];
            if (updateFields.dateOfBirth !== currentDOB) {
                finalUpdateData.dateOfBirth = updateFields.dateOfBirth ? new Date(updateFields.dateOfBirth) : null;
            }
        }
        if (updateFields.bio !== undefined && updateFields.bio !== existingUser.bio) {
            finalUpdateData.bio = updateFields.bio || null;
        }
        if (updateFields.shippingAddress) {
            finalUpdateData.shippingAddress = updateFields.shippingAddress;
        }

        if (Object.keys(finalUpdateData).length === 0) {
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
                    profileImageUrl: true,
                    phoneNumber: true,
                    dateOfBirth: true,
                    bio: true,
                    shippingAddress: true,
                    paymentMethods: true,
                },
            });

            const responseData = {
                ...currentUser,
                hasSecurityPin: hasSecurityPin
            };

            return createSuccessResponse(responseData, 'No changes detected');
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: finalUpdateData,
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
                profileImageUrl: true,
                phoneNumber: true,
                dateOfBirth: true,
                bio: true,
                shippingAddress: true,
                paymentMethods: true,
            },
        });

        const responseData = {
            ...updatedUser,
            hasSecurityPin: hasSecurityPin
        };

        logAuditEvent({
            action: 'USER_PROFILE_UPDATED',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
            details: { 
                updatedFields: Object.keys(finalUpdateData),
                sensitiveFields: sensitiveUpdateFields,
                financialFields: financialUpdateFields,
                pinRequired: requiresPinVerification,
                pinProvided: !!updateData.securityPin
            },
        });

        return createSuccessResponse(responseData, 'Profile updated successfully');

    } catch (error) {
        console.error('Update current user error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 