import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';
import { isRateLimitedForOperation, recordAttemptForOperation } from '@/lib/auth';
import { z } from 'zod';

const CheckoutSchema = z.object({
    paymentMethodId: z.string()
        .min(1, { message: 'Payment method is required' })
        .max(50, { message: 'Payment method ID too long' }),
    shippingAddress: z.object({
        name: z.string().min(1).max(100),
        streetAddress: z.string().min(1).max(200),
        city: z.string().min(1).max(100),
        state: z.string().min(1).max(100),
        postalCode: z.string().min(1).max(20),
        country: z.string().min(1).max(100),
    }),
    notes: z.string()
        .max(500, { message: 'Notes must be less than 500 characters' })
        .optional(),
});

type CheckoutRequestBody = z.infer<typeof CheckoutSchema>;

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

    // Only add random failures in development/testing environments
    if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_RANDOM_PAYMENT_FAILURES === 'true') {
        if (Math.random() < 0.05) {
            return { success: false, error: 'Payment processing failed (simulated)' };
        }
    }

    return {
        success: true,
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
}

/**
 * Checkout all items in user's cart with FCFS collision handling
 * @param req AuthenticatedRequest - The authenticated request
 * @returns JSON response with purchase results or error
 */
export async function POST(req: AuthenticatedRequest) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = req.user;
        const clientIP = getClientIP(req.headers);

        if (isRateLimitedForOperation(clientIP, 'purchases')) {
            recordAttemptForOperation(clientIP, 'purchases');
            return createErrorResponse('Too many checkout requests. Please try again later.', 429);
        }

        let requestBody;
        try {
            requestBody = await req.json();
        } catch (error) {
            recordAttemptForOperation(clientIP, 'purchases');
            return createErrorResponse('Invalid JSON format in request body', 400);
        }

        const validationResult = CheckoutSchema.safeParse(requestBody);
        if (!validationResult.success) {
            recordAttemptForOperation(clientIP, 'purchases');
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { paymentMethodId, shippingAddress, notes } = validationResult.data as CheckoutRequestBody;

        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        card: {
                            include: {
                                owner: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!cart || cart.items.length === 0) {
            return createErrorResponse('Cart is empty', 400);
        }

        const validItems: any[] = [];
        const invalidItems: any[] = [];
        let totalAmount = 0;

        for (const item of cart.items) {
            const card = item.card;

            if (!card.isForSale || !card.price || card.price <= 0) {
                invalidItems.push({ item, reason: 'Card is no longer for sale' });
                continue;
            }

            if (card.ownerId === userId) {
                invalidItems.push({ item, reason: 'Cannot purchase your own card' });
                continue;
            }

            const existingPurchase = await prisma.purchase.findFirst({
                where: {
                    cardId: card.id,
                    status: { in: ['PENDING', 'PAID', 'SHIPPED'] }
                }
            });

            if (existingPurchase) {
                invalidItems.push({ item, reason: 'Card already sold' });
                continue;
            }

            validItems.push(item);
            totalAmount += card.price;
        }

        if (validItems.length === 0) {
            await prisma.cartItem.deleteMany({
                where: { cartId: cart.id }
            });

            return createErrorResponse('No valid items in cart to purchase', 400, {
                invalidItems: invalidItems.map(({ item, reason }) => `${item.card.name}: ${reason}`)
            });
        }

        const paymentResult = await mockPaymentValidation(paymentMethodId, totalAmount);
        if (!paymentResult.success) {
            logAuditEvent({
                action: 'CART_CHECKOUT_PAYMENT_FAILED',
                userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'purchases',
                timestamp: new Date(),
                details: { 
                    error: paymentResult.error,
                    amount: totalAmount,
                    itemCount: validItems.length
                }
            });

            return createErrorResponse(paymentResult.error || 'Payment processing failed', 400);
        }

        const purchases = await prisma.$transaction(async (tx) => {
            const createdPurchases = [];

            for (const item of validItems) {
                const card = item.card;

                const doubleCheckPurchase = await tx.purchase.findFirst({
                    where: {
                        cardId: card.id,
                        status: { in: ['PENDING', 'PAID', 'SHIPPED'] }
                    }
                });

                if (doubleCheckPurchase) {
                    invalidItems.push({ item, reason: 'Card sold during checkout (FCFS)' });
                    continue;
                }

                const purchase = await tx.purchase.create({
                    data: {
                        buyerId: userId,
                        sellerId: card.ownerId,
                        cardId: card.id,
                        price: card.price!,
                        status: 'PAID',
                        paymentMethod: paymentMethodId,
                        shippingAddress: shippingAddress,
                        notes: notes,
                    },
                    include: {
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
                                imageUrl: true
                            }
                        },
                        seller: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                });

                await tx.card.update({
                    where: { id: card.id },
                    data: { 
                        isForSale: false,
                        price: null
                    }
                });

                createdPurchases.push(purchase);
            }

            await tx.cartItem.deleteMany({
                where: { cartId: cart.id }
            });

            return createdPurchases;
        });

        const successfulPurchases = purchases.length;
        const failedItems = invalidItems.length;

        logAuditEvent({
            action: 'CART_CHECKOUT_COMPLETED',
            userId,
            ip: clientIP,
            userAgent: getUserAgent(req.headers),
            resource: 'purchases',
            timestamp: new Date(),
            details: { 
                transactionId: paymentResult.transactionId,
                totalAmount: purchases.reduce((sum, p) => sum + p.price, 0),
                successfulPurchases,
                failedItems,
                originalItemCount: cart.items.length
            }
        });

        return createSuccessResponse({
            purchases,
            summary: {
                totalPurchases: successfulPurchases,
                totalAmount: purchases.reduce((sum, p) => sum + p.price, 0),
                failedItems,
                invalidItems: invalidItems.map(({ item, reason }) => ({
                    cardId: item.cardId,
                    cardName: item.card.name,
                    reason
                }))
            },
            transactionId: paymentResult.transactionId
        }, successfulPurchases > 0 
            ? `Successfully purchased ${successfulPurchases} card(s)${failedItems > 0 ? ` (${failedItems} items unavailable)` : ''}`
            : 'Checkout failed - no items could be purchased'
        );

    } catch (error) {
        console.error('Cart checkout error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}
