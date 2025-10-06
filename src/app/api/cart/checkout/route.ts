import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';
import { isRateLimitedForOperation, recordAttemptForOperation, withAuth } from '@/lib/auth';
import { verifyCvv } from '@/lib/payment_methods';
import { EncryptedPaymentMethod, PaymentMethodMetadata } from '@/types/schemas/payment_schemas';
import { sendEmail } from '@/lib/smtp';
import { generateOrderConfirmationEmail, generateOrderConfirmationText } from '@/lib/email_templates';
import { z } from 'zod';

const OneTimePaymentSchema = z.object({
    cardNumber: z.string().min(13).max(19),
    expiryMonth: z.string().min(1).max(2),
    expiryYear: z.string().min(2).max(4),
    cvv: z.string().min(3).max(4),
    cardholderName: z.string().min(1).max(100),
    cardBrand: z.string().min(1).max(50),
});

const CheckoutSchema = z.object({
    paymentMethodId: z.string()
        .min(1, { message: 'Payment method is required' })
        .max(50, { message: 'Payment method ID too long' })
        .optional(),
    cvv: z.string()
        .min(3, { message: 'CVV must be at least 3 digits' })
        .max(4, { message: 'CVV must be at most 4 digits' })
        .optional(),
    oneTimePayment: OneTimePaymentSchema.optional(),
    shippingAddress: z.object({
        name: z.string().min(1).max(100),
        phone: z.string().optional(),
        streetAddress: z.string().min(1).max(200),
        city: z.string().min(1).max(100),
        state: z.string().min(1).max(100),
        postalCode: z.string().min(1).max(20),
        country: z.string().min(1).max(100),
    }),
    notes: z.string()
        .max(500, { message: 'Notes must be less than 500 characters' })
        .optional(),
}).refine(
    (data) => data.paymentMethodId || data.oneTimePayment,
    { message: 'Either paymentMethodId or oneTimePayment must be provided' }
);

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
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @returns JSON response with purchase results or error
 */
export const POST = withAuth(async (req, user) => {
    try {
        const { userId } = user;
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

        const { paymentMethodId, cvv, oneTimePayment, shippingAddress, notes } = validationResult.data as CheckoutRequestBody;

        let effectivePaymentMethodId = paymentMethodId;

        if (paymentMethodId && cvv) {
            const userData = await prisma.user.findUnique({
                where: { id: userId },
                select: { paymentMethods: true }
            });

            if (!userData) {
                return createErrorResponse('ユーザーが見つかりません', 404);
            }

            const paymentMethods = (userData.paymentMethods as any[] || []) as EncryptedPaymentMethod[];
            const selectedMethod = paymentMethods.find(pm => pm.id === paymentMethodId);

            if (!selectedMethod) {
                return createErrorResponse('支払い方法が見つかりません', 404);
            }

            if (!verifyCvv(cvv, selectedMethod.cvvHash)) {
                recordAttemptForOperation(clientIP, 'purchases');
                return createErrorResponse('無効なCVVです', 400);
            }
        } else if (oneTimePayment) {
            const cardLast4 = oneTimePayment.cardNumber.slice(-4);
            effectivePaymentMethodId = `one_time_${oneTimePayment.cardBrand}_${cardLast4}`;
        }

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

        const paymentResult = await mockPaymentValidation(effectivePaymentMethodId || 'unknown', totalAmount);
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
                        paymentMethod: effectivePaymentMethodId,
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
                totalAmount,
                successfulPurchases,
                failedItems,
                originalItemCount: cart.items.length
            }
        });

        if (successfulPurchases > 0) {
            const buyer = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    name: true,
                    email: true
                }
            });

            if (buyer && buyer.email) {
                try {
                    const orderDate = new Date().toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    const shippingCost = 24.00;
                    const protocol = req.headers.get('x-forwarded-proto') || 'http';
                    const host = req.headers.get('host') || 'localhost:3000';
                    const baseUrl = `${protocol}://${host}`;

                    const emailData = {
                        orderId: paymentResult.transactionId || purchases[0].id,
                        orderDate,
                        customerName: buyer.name || 'お客様',
                        customerEmail: buyer.email,
                        items: purchases.map(p => ({
                            cardName: p.card.name,
                            player: p.card.player,
                            team: p.card.team,
                            year: p.card.year,
                            condition: p.card.condition,
                            price: p.price,
                            imageUrl: p.card.imageUrl ? `${baseUrl}${p.card.imageUrl}` : undefined
                        })),
                        subtotal: totalAmount,
                        shipping: shippingCost,
                        total: totalAmount + shippingCost,
                        shippingAddress: {
                            name: shippingAddress.name,
                            streetAddress: shippingAddress.streetAddress,
                            city: shippingAddress.city,
                            state: shippingAddress.state,
                            postalCode: shippingAddress.postalCode,
                            country: shippingAddress.country,
                            phone: shippingAddress.phone
                        }
                    };

                    const emailHtml = generateOrderConfirmationEmail(emailData);
                    const emailText = generateOrderConfirmationText(emailData);

                    await sendEmail({
                        to: buyer.email,
                        subject: `注文確認 - ${paymentResult.transactionId || purchases[0].id} - SWISH`,
                        html: emailHtml,
                        text: emailText
                    });
                } catch (emailError) {
                    console.error('[Checkout] Failed to send order confirmation email:', emailError);
                }
            }
        }

        return createSuccessResponse({
            purchases,
            summary: {
                totalPurchases: successfulPurchases,
                totalAmount,
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
});
