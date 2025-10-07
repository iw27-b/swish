import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { AddPaymentMethodSchema, EncryptedPaymentMethod } from '@/types/schemas/payment_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { randomUUID } from 'crypto';
import { encryptPaymentMethod, getPaymentMethodMetadata, isDuplicateCard } from '@/lib/payment_methods';
import { requirePinIfSet } from '@/lib/pin_utils';

/**
 * GET /api/users/me/payment-methods
 * Retrieve all payment method metadata for current user
 * Returns ONLY safe metadata (no sensitive card data)
 * 
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @returns JSON response with payment methods or error
 */
export const GET = withAuth(async (req, user) => {
    try {
        const userData = await prisma.user.findUnique({
            where: { id: user.userId },
            select: {
                paymentMethods: true
            }
        });

        if (!userData) {
            return createErrorResponse('User not found', 404);
        }

        const paymentMethods = (userData.paymentMethods as any[] || []) as EncryptedPaymentMethod[];
        const metadata = paymentMethods.map(pm => getPaymentMethodMetadata(pm));

        logAuditEvent({
            action: 'PAYMENT_METHODS_VIEWED',
            userId: user.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'payment_method',
            resourceId: user.userId,
            timestamp: new Date(),
        });

        return createSuccessResponse(metadata, 'Payment methods retrieved successfully');
    } catch (error) {
        console.error('Get payment methods error:', error);
        return createErrorResponse('Internal server error', 500);
    }
});

/**
 * POST /api/users/me/payment-methods
 * Add a new payment method for current user
 * Requires security PIN if set
 * Encrypts card data before storage
 * 
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @returns JSON response with success message or error
 */
export const POST = withAuth(async (req, user) => {
    try {
        const requestBody = await req.json();

        if (!validateRequestSize(requestBody)) {
            return createErrorResponse('Request too large', 413);
        }

        const { securityPin: pinFromBody, ...paymentData } = requestBody;
        const validationResult = AddPaymentMethodSchema.safeParse(paymentData);

        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid payment method data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const paymentMethodInput = validationResult.data.paymentMethods[0];
        const pinErrorResponse = await requirePinIfSet(
            user.userId,
            pinFromBody,
            'add payment method'
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

        const existingPaymentMethods = (userData.paymentMethods as any[] || []) as EncryptedPaymentMethod[];

        if (isDuplicateCard(existingPaymentMethods, paymentMethodInput.cardNumber)) {
            return createErrorResponse('This card is already saved to your account', 409);
        }

        const generatedId = `card_${randomUUID()}`;

        const encrypted = encryptPaymentMethod({
            id: generatedId,
            cardNumber: paymentMethodInput.cardNumber,
            cardholderName: paymentMethodInput.cardholderName,
            expiryMonth: paymentMethodInput.expiryMonth,
            expiryYear: paymentMethodInput.expiryYear,
            cardBrand: paymentMethodInput.cardBrand,
            last4: paymentMethodInput.last4,
            nickname: paymentMethodInput.nickname,
        });
        const encryptedPaymentMethod = encrypted;
        const updatedPaymentMethods = [...existingPaymentMethods, encryptedPaymentMethod];

        await prisma.user.update({
            where: { id: user.userId },
            data: {
                paymentMethods: updatedPaymentMethods as any
            }
        });

        const metadata = getPaymentMethodMetadata(encryptedPaymentMethod);

        logAuditEvent({
            action: 'PAYMENT_METHOD_ADDED',
            userId: user.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'payment_method',
            resourceId: encryptedPaymentMethod.id,
            timestamp: new Date(),
            details: {
                cardBrand: encryptedPaymentMethod.cardBrand,
                last4: encryptedPaymentMethod.last4
            }
        });

        const response = createSuccessResponse(metadata, 'Payment method added successfully');
        
        return new Response(response.body, {
            status: 201,
            headers: response.headers
        });
    } catch (error) {
        console.error('Add payment method error:', error);
        return createErrorResponse('Internal server error', 500);
    }
});

