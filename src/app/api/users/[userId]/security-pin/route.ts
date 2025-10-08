import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { SetSecurityPinSchema, SetSecurityPinRequestBody, VerifyPinSchema, VerifyPinRequestBody } from '@/types/schemas/user_extended_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { requirePinIfSet } from '@/lib/pin_utils';
import { hashPassword, withAuth } from '@/lib/auth';
import { Role } from '@prisma/client';

/**
 * Set or update user's security PIN
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @param params - The user ID
 * @returns JSON response with success message or error
 */
export const POST = withAuth(async (
    req,
    user,
    { params }: { params: Promise<{ userId: string }> }
) => {
    try {
        const { userId } = await params;
        const requestingUser = user;

        if (requestingUser.userId !== userId) {
            return createErrorResponse('Forbidden: You can only set your own security PIN', 403);
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

        const validationResult = SetSecurityPinSchema.safeParse(requestBody);
        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { pin } = validationResult.data as SetSecurityPinRequestBody;

        const hashedPin = await hashPassword(pin);

        await prisma.user.update({
            where: { id: userId },
            data: { securityPin: hashedPin }
        });

        logAuditEvent({
            action: 'SECURITY_PIN_SET',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
        });

        return createSuccessResponse(null, 'Security PIN set successfully');

    } catch (error) {
        console.error('Set security PIN error:', error);
        return createErrorResponse('Internal server error', 500);
    }
});

/**
 * Remove security PIN (requires current PIN)
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @param params - The user ID
 * @returns JSON response with success or error message
 */
export const DELETE = withAuth(async (
    req,
    user,
    { params }: { params: Promise<{ userId: string }> }
) => {
    try {
        const { userId } = await params;
        const requestingUser = user;

        if (requestingUser.userId !== userId && requestingUser.role !== Role.ADMIN) {
            return createErrorResponse('Forbidden: You can only remove your own security PIN', 403);
        }

        let requestBody: { pin?: string } = {};
        try {
            const body = await req.json();
            if (body && typeof body === 'object') {
                requestBody = body;
            }
        } catch {
        }

        if (requestingUser.role !== Role.ADMIN) {
            const pinError = await requirePinIfSet(
                userId,
                requestBody.pin,
                'PIN removal'
            );
 
            if (pinError) {
                return pinError;
            }
         }

        await prisma.user.update({
            where: { id: userId },
            data: { securityPin: null },
        });

        logAuditEvent({
            action: 'SECURITY_PIN_REMOVED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
        });

        return createSuccessResponse(null, 'Security PIN removed successfully');

    } catch (error) {
        console.error('Remove security PIN error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}); 