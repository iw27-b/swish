import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { UpdateCardSchema, UpdateCardRequestBody } from '@/types/schemas/card_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { Role } from '@prisma/client';

/**
 * Get a specific card by ID
 * @param req NextRequest - The request object
 * @param params - The card ID
 * @returns JSON response with card data or error
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ cardId: string }> }
) {
    try {
        const { cardId } = await params;

        if (!cardId) {
            return createErrorResponse('Card ID is required', 400);
        }

        const card = await prisma.card.findUnique({
            where: { id: cardId },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
                _count: {
                    select: {
                        favorites: true,
                        tracking: true,
                    }
                }
            },
        });

        if (!card) {
            return createErrorResponse('Card not found', 404);
        }

        logAuditEvent({
            action: 'CARD_VIEWED',
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'card',
            resourceId: cardId,
            timestamp: new Date(),
        });

        return createSuccessResponse(card, 'Card retrieved successfully');

    } catch (error) {
        console.error('Get card error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * Update a specific card
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The card ID
 * @returns JSON response with updated card data or error
 */
export async function PATCH(
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ cardId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { cardId } = await params;
        const { userId, role } = req.user;

        if (!cardId) {
            return createErrorResponse('Card ID is required', 400);
        }

        const requestBody = await req.json();

        if (!validateRequestSize(requestBody)) {
            return createErrorResponse('Request too large', 413);
        }

        const validationResult = UpdateCardSchema.safeParse(requestBody);
        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const updateData = validationResult.data as UpdateCardRequestBody;

        const existingCard = await prisma.card.findUnique({
            where: { id: cardId },
            select: { id: true, ownerId: true, name: true }
        });

        if (!existingCard) {
            return createErrorResponse('Card not found', 404);
        }

        if (existingCard.ownerId !== userId && role !== Role.ADMIN) {
            logAuditEvent({
                action: 'UNAUTHORIZED_CARD_UPDATE_ATTEMPT',
                userId: userId,
                ip: getClientIP(req.headers),
                userAgent: getUserAgent(req.headers),
                resource: 'card',
                resourceId: cardId,
                timestamp: new Date(),
            });
            return createErrorResponse('Forbidden: You can only update your own cards', 403);
        }

        if (updateData.isForSale === true && updateData.price === undefined) {
            return createErrorResponse('Price is required when listing card for sale', 400);
        }

        const updatedCard = await prisma.$transaction(async (tx) => {
            return await tx.card.update({
                where: { id: cardId },
                data: updateData,
                include: {
                    owner: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    }
                },
            });
        });

        logAuditEvent({
            action: 'CARD_UPDATED',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'card',
            resourceId: cardId,
            timestamp: new Date(),
            details: { 
                updatedFields: Object.keys(updateData),
                previousName: existingCard.name,
                newName: updatedCard.name 
            },
        });

        return createSuccessResponse(updatedCard, 'Card updated successfully');

    } catch (error) {
        console.error('Update card error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * Delete a specific card
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The card ID
 * @returns JSON response with success or error message
 */
export async function DELETE(
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ cardId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { cardId } = await params;
        const { userId, role } = req.user;

        if (!cardId) {
            return createErrorResponse('Card ID is required', 400);
        }

        const existingCard = await prisma.card.findUnique({
            where: { id: cardId },
            select: { 
                id: true, 
                ownerId: true, 
                name: true,
                isForSale: true,
                isForTrade: true,
            }
        });

        if (!existingCard) {
            return createErrorResponse('Card not found', 404);
        }

        const activePurchasesCount = await prisma.purchase.count({
            where: { 
                cardId: cardId,
                status: { in: ['PENDING', 'PAID', 'SHIPPED'] }
            }
        });

        const activeTradesCount = await prisma.tradeCard.count({
            where: { 
                cardId: cardId,
                trade: {
                    status: { in: ['PENDING', 'ACCEPTED'] }
                }
            }
        });

        if (existingCard.ownerId !== userId && role !== Role.ADMIN) {
            logAuditEvent({
                action: 'UNAUTHORIZED_CARD_DELETE_ATTEMPT',
                userId: userId,
                ip: getClientIP(req.headers),
                userAgent: getUserAgent(req.headers),
                resource: 'card',
                resourceId: cardId,
                timestamp: new Date(),
            });
            return createErrorResponse('Forbidden: You can only delete your own cards', 403);
        }

        if (activePurchasesCount > 0) {
            return createErrorResponse('Cannot delete card with active purchases', 400);
        }

        if (activeTradesCount > 0) {
            return createErrorResponse('Cannot delete card involved in active trades', 400);
        }

        await prisma.$transaction(async (tx) => {
            await tx.collectionCard.deleteMany({
                where: { cardId: cardId }
            });

            await tx.cardFavorite.deleteMany({
                where: { cardId: cardId }
            });

            await tx.cardTracking.deleteMany({
                where: { cardId: cardId }
            });

            await tx.tradeCard.deleteMany({
                where: { 
                    cardId: cardId,
                    trade: {
                        status: { in: ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'] }
                    }
                }
            });

            await tx.card.delete({
                where: { id: cardId }
            });
        });

        logAuditEvent({
            action: 'CARD_DELETED',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'card',
            resourceId: cardId,
            timestamp: new Date(),
            details: { cardName: existingCard.name },
        });

        return createSuccessResponse(
            { id: cardId },
            'Card deleted successfully'
        );

    } catch (error) {
        console.error('Delete card error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 