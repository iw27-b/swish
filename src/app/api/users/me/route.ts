import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { UpdateUserSchema, UpdateSensitiveUserSchema } from '@/types/schemas/user_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { requirePinIfSet } from '@/lib/pin_utils';
import { EncryptedPaymentMethod } from '@/types/schemas/payment_schemas';
import { getPaymentMethodMetadata } from '@/lib/payment_methods';

/**
 * Get current user's complete profile
 * 
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @returns JSON response with user profile or error
 */
export const GET = withAuth(async (req, user) => {
    try {
        const userData = await prisma.user.findUnique({
            where: { id: user.userId },
            select: {
                id: true, email: true, name: true, role: true,
                createdAt: true, updatedAt: true, emailVerified: true,
                twoFactorEnabled: true, isSeller: true, sellerVerificationStatus: true,
                languagePreference: true, profileImageUrl: true,
                phoneNumber: true, dateOfBirth: true, bio: true,
                shippingAddress: true,
                paymentMethods: true,
                securityPin: true
            },
        });

        if (!userData) {
            return createErrorResponse('User not found', 404);
        }

        const paymentMethods = (userData.paymentMethods as any[] || []) as EncryptedPaymentMethod[];
        const paymentMethodsMetadata = paymentMethods.map(pm => getPaymentMethodMetadata(pm));

        const { securityPin, paymentMethods: _, ...profileData } = userData;
        const responseData = {
            ...profileData,
            paymentMethods: paymentMethodsMetadata,
            hasSecurityPin: !!securityPin
        };

        logAuditEvent({
            action: 'USER_COMPLETE_PROFILE_VIEWED',
            userId: user.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: user.userId,
            timestamp: new Date(),
        });

        return createSuccessResponse(responseData, 'Complete profile retrieved successfully');
    } catch (error) {
        console.error('Get current user error:', error);
        return createErrorResponse('Internal server error', 500);
    }
});

/**
 * Update current user's profile with PIN protection
 * 
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @returns JSON response with updated user profile or error
 */
export const PATCH = withAuth(async (req, user) => {
    try {
        const requestBody = await req.json();

        if (!validateRequestSize(requestBody)) {
            return createErrorResponse('Request too large', 413);
        }

        const { securityPin: pinFromBody, ...updateBody } = requestBody;

        const sensitiveFields = ['email', 'phoneNumber', 'dateOfBirth', 'bio', 'shippingAddress'];
        const hasSensitiveFields = sensitiveFields.some(field => updateBody.hasOwnProperty(field));

        const validationSchema = hasSensitiveFields ? UpdateSensitiveUserSchema : UpdateUserSchema;
        const validationResult = validationSchema.safeParse(updateBody);

        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const updateData = validationResult.data;
        const userWithPin = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { securityPin: true }
        });

        const hasSecurityPin = !!userWithPin?.securityPin;
        const requiresPin = hasSensitiveFields && hasSecurityPin;

        if (requiresPin) {
            const pinErrorResponse = await requirePinIfSet(user.userId, pinFromBody, 'update sensitive information');
            if (pinErrorResponse) {
                return pinErrorResponse;
            }
        }

        const finalUpdateData = updateData;

        if (Object.keys(finalUpdateData).length === 0) {
            return createSuccessResponse(await getUserProfile(user.userId), 'No changes detected');
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.userId },
            data: finalUpdateData,
            select: {
                id: true, email: true, name: true, role: true,
                createdAt: true, updatedAt: true, emailVerified: true,
                twoFactorEnabled: true, isSeller: true, sellerVerificationStatus: true,
                languagePreference: true, profileImageUrl: true,
                phoneNumber: true, dateOfBirth: true, bio: true,
                shippingAddress: true,
                securityPin: true
            },
        });

        const { securityPin: _, ...responseData } = updatedUser;
        const responseDataWithPin = {
            ...responseData,
            hasSecurityPin: !!updatedUser.securityPin
        };

        logAuditEvent({
            action: 'USER_PROFILE_UPDATED',
            userId: user.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: user.userId,
            timestamp: new Date(),
            details: { updatedFields: Object.keys(finalUpdateData) }
        });

        return createSuccessResponse(responseDataWithPin, 'Profile updated successfully');
    } catch (error) {
        console.error('Update current user error:', error);
        return createErrorResponse('Internal server error', 500);
    }
});

async function getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true, email: true, name: true, role: true,
            createdAt: true, updatedAt: true, emailVerified: true,
            twoFactorEnabled: true, isSeller: true, sellerVerificationStatus: true,
            languagePreference: true, profileImageUrl: true,
            phoneNumber: true, dateOfBirth: true, bio: true,
            shippingAddress: true,
            paymentMethods: true,
            securityPin: true
        },
    });

    if (!user) return null;

    const paymentMethods = (user.paymentMethods as any[] || []) as EncryptedPaymentMethod[];
    const paymentMethodsMetadata = paymentMethods.map(pm => getPaymentMethodMetadata(pm));

    const { securityPin, paymentMethods: _, ...userData } = user;
    return {
        ...userData,
        paymentMethods: paymentMethodsMetadata,
        hasSecurityPin: !!securityPin
    };
}