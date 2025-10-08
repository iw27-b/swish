import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { CreatePurchaseSchema, CreatePurchaseRequestBody } from '@/types/schemas/trade_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { isRateLimitedForOperation, recordAttemptForOperation, withAuth } from '@/lib/auth';

/**
 * Mock payment validation service
 * In production, we would use a real payment processor. But since this is a fake app for IW27, we'll just mock it and pretend it works.
 * @param paymentMethodId Payment method identifier
 * @param amount Purchase amount
 * @returns Promise with payment result
 */
async function mockPaymentValidation(paymentMethodId: string, amount: number): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    await new Promise(resolve => setTimeout(resolve, 100));

    if (paymentMethodId === 'invalid_card') {
        return { success: false, error: 'Invalid payment method' };
    }

    if (amount <= 0) {
        return { success: false, error: 'Invalid amount' };
    }

    if (amount > 10000) {
        return { success: false, error: 'Amount exceeds limit' };
    }

    // Simulate random payment failures (5% chance)
    if (Math.random() < 0.05) {
        return { success: false, error: 'Payment processing failed' };
    }

    return {
        success: true,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
}

/**
 * Create a new purchase
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @returns JSON response with created purchase data or error
 */
export const POST = withAuth(async (req, user) => {
    try {
        const { userId } = user;
        const clientIP = getClientIP(req.headers);

        if (isRateLimitedForOperation(clientIP, 'purchases')) {
            recordAttemptForOperation(clientIP, 'purchases');
            return createErrorResponse('Too many purchase requests. Please try again later.', 429);
        }

        const contentLength = req.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > 100000) {
            recordAttemptForOperation(clientIP, 'purchases');
            logAuditEvent({
                action: 'PURCHASE_CREATION_REQUEST_TOO_LARGE',
                userId: userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'purchases',
                timestamp: new Date(),
                details: { contentLength: parseInt(contentLength, 10) }
            });
            return createErrorResponse('Request too large', 413);
        }

        let requestBody;
        try {
            requestBody = await req.json();
        } catch (error) {
            recordAttemptForOperation(clientIP, 'purchases');
            logAuditEvent({
                action: 'PURCHASE_CREATION_INVALID_JSON',
                userId: userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'purchases',
                timestamp: new Date(),
                details: { error: 'Invalid JSON format' }
            });
            return createErrorResponse('Invalid JSON format in request body', 400);
        }

        const validationResult = CreatePurchaseSchema.safeParse(requestBody);
        if (!validationResult.success) {
            recordAttemptForOperation(clientIP, 'purchases');
            logAuditEvent({
                action: 'PURCHASE_CREATION_VALIDATION_FAILED',
                userId: userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'purchases',
                timestamp: new Date(),
                details: { errors: validationResult.error.flatten().fieldErrors },
            });
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { cardId, paymentMethodId, shippingAddress, notes } = validationResult.data as CreatePurchaseRequestBody;

        const card = await prisma.card.findUnique({
            where: { id: cardId },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            }
        });

        if (!card) {
            return createErrorResponse('Card not found', 404);
        }

        if (!card.isForSale) {
            return createErrorResponse('Card is not for sale', 400);
        }

        if (!card.price || card.price <= 0) {
            return createErrorResponse('Card price not set', 400);
        }

        if (card.ownerId === userId) {
            return createErrorResponse('Cannot purchase your own card', 400);
        }

        const existingPurchase = await prisma.purchase.findFirst({
            where: {
                cardId: cardId,
                status: { in: ['PENDING', 'PAID', 'SHIPPED'] }
            }
        });

        if (existingPurchase) {
            return createErrorResponse('Card is already sold or has a pending purchase', 400);
        }

        const paymentResult = await mockPaymentValidation(paymentMethodId, card.price!);
        if (!paymentResult.success) {
            recordAttemptForOperation(clientIP, 'purchases');
            logAuditEvent({
                action: 'PURCHASE_PAYMENT_FAILED',
                userId: userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'purchases',
                timestamp: new Date(),
                details: { 
                    cardId, 
                    amount: card.price, 
                    paymentError: paymentResult.error 
                },
            });
            return createErrorResponse(`Payment failed: ${paymentResult.error}`, 400);
        }

        const purchase = await prisma.$transaction(async (tx) => {
            const newPurchase = await tx.purchase.create({
                data: {
                    buyerId: userId,
                    sellerId: card.ownerId,
                    cardId: cardId,
                    price: card.price!,
                    status: 'PAID', 
                    paymentMethod: `${paymentMethodId}:${paymentResult.transactionId}`,
                    shippingAddress: shippingAddress,
                    notes: notes,
                },
                include: {
                    buyer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    },
                    seller: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    },
                    card: {
                        select: {
                            id: true,
                            name: true,
                            player: true,
                            team: true,
                            year: true,
                            brand: true,
                            condition: true,
                            rarity: true,
                            imageUrl: true,
                        }
                    }
                }
            });

            await tx.card.update({
                where: { id: cardId },
                data: {
                    isForSale: false,
                    price: null,
                    ownerId: userId, // Transfer ownership immediately after payment
                }
            });

            return newPurchase;
        });

        logAuditEvent({
            action: 'PURCHASE_COMPLETED',
            userId: userId,
            ip: clientIP,
            userAgent: getUserAgent(req.headers),
            resource: 'purchases',
            resourceId: purchase.id,
            timestamp: new Date(),
            details: {
                cardId,
                sellerId: card.ownerId,
                amount: card.price,
                transactionId: paymentResult.transactionId,
            },
        });

        return createSuccessResponse(purchase, 'Purchase completed successfully');

    } catch (error) {
        console.error('Create purchase error:', error);
        if (error instanceof Error) {
            return createErrorResponse(error.message, 400);
        }
        return createErrorResponse('Internal server error', 500);
    }
}); 