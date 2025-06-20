import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { VerifyPinSchema, VerifyPinRequestBody } from '@/types/schemas/user_extended_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { requirePin } from '@/lib/pin_utils';
import { Role } from '@prisma/client';
import { z } from 'zod';

const PaymentMethodSchema = z.object({
    type: z.enum(['credit_card', 'debit_card', 'paypal', 'bank_account']),
    last4: z.string().length(4, { message: 'Last 4 digits must be exactly 4 characters' }),
    brand: z.string().optional(),
    expiryMonth: z.number().min(1).max(12).optional(),
    expiryYear: z.number().min(new Date().getFullYear()).optional(),
    isDefault: z.boolean().default(false),
});

const UpdatePaymentMethodsSchema = z.object({
    paymentMethods: z.array(PaymentMethodSchema),
    pin: z.string()
        .length(6, { message: 'PIN must be exactly 6 digits' })
        .regex(/^\d{6}$/, { message: 'PIN must contain only numbers' })
        .optional(),
});

type UpdatePaymentMethodsRequestBody = z.infer<typeof UpdatePaymentMethodsSchema>;

/**
 * Get user's payment methods
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The user ID
 * @returns JSON response with payment methods or error
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
            return createErrorResponse('Forbidden: You can only view your own payment methods', 403);
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                paymentMethods: true,
            },
        });

        if (!user) {
            return createErrorResponse('User not found', 404);
        }

        logAuditEvent({
            action: 'PAYMENT_METHODS_VIEWED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
        });

        return createSuccessResponse(
            { paymentMethods: user.paymentMethods || [] }, 
            'Payment methods retrieved successfully'
        );

    } catch (error) {
        console.error('Get payment methods error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * Update user's payment methods (requires PIN)
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The user ID
 * @returns JSON response with updated payment methods or error
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
            return createErrorResponse('Forbidden: You can only update your own payment methods', 403);
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

        const validationResult = UpdatePaymentMethodsSchema.safeParse(requestBody);
        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { paymentMethods, pin } = validationResult.data as UpdatePaymentMethodsRequestBody;

        const pinError = await requirePin(userId, pin, 'payment methods update');
        if (pinError) {
            return pinError;
        }

        const defaultMethods = paymentMethods.filter(pm => pm.isDefault);
        if (defaultMethods.length > 1) {
            return createErrorResponse('Only one payment method can be set as default', 400);
        }

        const updatedUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { id: true }
            });

            if (!user) {
                throw new Error('User not found');
            }

            return tx.user.update({
                where: { id: userId },
                data: { paymentMethods: paymentMethods },
                select: {
                    id: true,
                    paymentMethods: true,
                },
            });
        });

        logAuditEvent({
            action: 'PAYMENT_METHODS_UPDATED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
            details: { methodCount: paymentMethods.length },
        });

        return createSuccessResponse(
            { paymentMethods: updatedUser.paymentMethods }, 
            'Payment methods updated successfully'
        );

    } catch (error) {
        if (error instanceof Error && error.message === 'User not found') {
            return createErrorResponse('User not found', 404);
        }
        console.error('Update payment methods error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 