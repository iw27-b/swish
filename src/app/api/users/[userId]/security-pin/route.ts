import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { SetSecurityPinSchema, SetSecurityPinRequestBody } from '@/types/schemas/user_extended_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { hashPassword, verifyPassword } from '@/lib/password_utils';

/**
 * Set or update user's security PIN
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The user ID
 * @returns JSON response with success message or error
 */
export async function POST(
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
}

/**
 * Remove user's security PIN
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The user ID
 * @returns JSON response with success message or error
 */
export async function DELETE(
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
            return createErrorResponse('Forbidden: You can only remove your own security PIN', 403);
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { securityPin: true }
        });

        if (!user?.securityPin) {
            return createErrorResponse('No security PIN is set', 404);
        }

        await prisma.user.update({
            where: { id: userId },
            data: { securityPin: null }
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
} 