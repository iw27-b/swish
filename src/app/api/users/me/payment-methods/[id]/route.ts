import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { EncryptedPaymentMethod } from '@/types/schemas/payment_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';
import { requirePinIfSet } from '@/lib/pin_utils';

/**
 * DELETE /api/users/me/payment-methods/[id]
 * Remove a specific payment method
 * Requires security PIN if set
 */
export const DELETE = withAuth(async (
    req: NextRequest,
    user,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const { id: paymentMethodId } = await params;

        const requestBody = await req.json().catch(() => ({}));
        const { securityPin: pinFromBody } = requestBody;

        const pinErrorResponse = await requirePinIfSet(
            user.userId,
            pinFromBody,
            'remove payment method'
        );
        
        if (pinErrorResponse) {
            return pinErrorResponse;
        }

        const userData = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { paymentMethods: true }
        });

        if (!userData) {
            return createErrorResponse('User not found', 404);
        }

        const paymentMethods = (userData.paymentMethods as any[] || []) as EncryptedPaymentMethod[];
        const paymentMethodIndex = paymentMethods.findIndex(pm => pm.id === paymentMethodId);

        if (paymentMethodIndex === -1) {
            return createErrorResponse('Payment method not found', 404);
        }

        const deletedPaymentMethod = paymentMethods[paymentMethodIndex];
        const updatedPaymentMethods = paymentMethods.filter(pm => pm.id !== paymentMethodId);

        await prisma.user.update({
            where: { id: user.userId },
            data: {
                paymentMethods: updatedPaymentMethods as any
            }
        });

        logAuditEvent({
            action: 'PAYMENT_METHOD_DELETED',
            userId: user.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'payment_method',
            resourceId: paymentMethodId,
            timestamp: new Date(),
            details: {
                cardBrand: deletedPaymentMethod.cardBrand,
                last4: deletedPaymentMethod.last4
            }
        });

        return createSuccessResponse(null, 'Payment method removed successfully');
    } catch (error) {
        console.error('Delete payment method error:', error);
        return createErrorResponse('Internal server error', 500);
    }
});

