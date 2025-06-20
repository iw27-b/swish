import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { UpdateTradeSchema, UpdateTradeRequestBody } from '@/types/schemas/trade_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { Role } from '@prisma/client';

/**
 * Get a specific trade by ID
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The trade ID
 * @returns JSON response with trade data or error
 */
export async function GET(
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ tradeId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { tradeId } = await params;
        const { userId, role } = req.user;

        if (!tradeId) {
            return createErrorResponse('Trade ID is required', 400);
        }

        const trade = await prisma.trade.findUnique({
            where: { id: tradeId },
            include: {
                initiator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
                recipient: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
                cards: {
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
                                imageUrl: true,
                                price: true,
                                ownerId: true,
                            }
                        }
                    }
                }
            },
        });

        if (!trade) {
            return createErrorResponse('Trade not found', 404);
        }

        if (trade.initiatorId !== userId && trade.recipientId !== userId && role !== Role.ADMIN) {
            logAuditEvent({
                action: 'UNAUTHORIZED_TRADE_VIEW_ATTEMPT',
                userId: userId,
                ip: getClientIP(req.headers),
                userAgent: getUserAgent(req.headers),
                resource: 'trade',
                resourceId: tradeId,
                timestamp: new Date(),
            });
            return createErrorResponse('Forbidden: You can only view your own trades', 403);
        }

        logAuditEvent({
            action: 'TRADE_VIEWED',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'trade',
            resourceId: tradeId,
            timestamp: new Date(),
        });

        return createSuccessResponse(trade, 'Trade retrieved successfully');

    } catch (error) {
        console.error('Get trade error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * Update trade status (accept, reject, cancel)
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The trade ID
 * @returns JSON response with updated trade data or error
 */
export async function PATCH(
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ tradeId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { tradeId } = await params;
        const { userId } = req.user;

        if (!tradeId) {
            return createErrorResponse('Trade ID is required', 400);
        }

        const requestBody = await req.json();

        if (!validateRequestSize(requestBody)) {
            return createErrorResponse('Request too large', 413);
        }

        const validationResult = UpdateTradeSchema.safeParse(requestBody);
        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { status, responseMessage } = validationResult.data as UpdateTradeRequestBody;

        const existingTrade = await prisma.trade.findUnique({
            where: { id: tradeId },
            select: {
                id: true,
                status: true,
                initiatorId: true,
                recipientId: true,
                expiresAt: true,
            }
        });

        if (!existingTrade) {
            return createErrorResponse('Trade not found', 404);
        }

        if (existingTrade.status !== 'PENDING') {
            return createErrorResponse('Trade is no longer pending', 400);
        }

        if (existingTrade.expiresAt && existingTrade.expiresAt < new Date()) {
            return createErrorResponse('Trade has expired', 400);
        }

        if (status === 'CANCELLED') {
            if (existingTrade.initiatorId !== userId) {
                return createErrorResponse('Only the trade initiator can cancel the trade', 403);
            }
        } else if (status === 'ACCEPTED' || status === 'REJECTED') {
            if (existingTrade.recipientId !== userId) {
                return createErrorResponse('Only the trade recipient can accept or reject the trade', 403);
            }
        }

        const updatedTrade = await prisma.$transaction(async (tx) => {
            if (status === 'ACCEPTED') {
                const tradeCards = await tx.tradeCard.findMany({
                    where: { tradeId: tradeId },
                    include: { card: true }
                });

                for (const tradeCard of tradeCards) {
                    if (tradeCard.isOffered) {
                        await tx.card.update({
                            where: { id: tradeCard.cardId },
                            data: {
                                ownerId: existingTrade.recipientId,
                                isForTrade: false, 
                            }
                        });
                    } else {
                        await tx.card.update({
                            where: { id: tradeCard.cardId },
                            data: {
                                ownerId: existingTrade.initiatorId,
                                isForTrade: false, 
                            }
                        });
                    }
                }
            }

            return await tx.trade.update({
                where: { id: tradeId },
                data: {
                    status,
                    responseMessage,
                    updatedAt: new Date(),
                    completedAt: status === 'ACCEPTED' ? new Date() : undefined,
                },
                include: {
                    initiator: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    },
                    recipient: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    },
                    cards: {
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
                                    imageUrl: true,
                                    price: true,
                                    ownerId: true,
                                }
                            }
                        }
                    }
                },
            });
        });

        logAuditEvent({
            action: 'TRADE_STATUS_UPDATED',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'trade',
            resourceId: tradeId,
            timestamp: new Date(),
            details: {
                previousStatus: existingTrade.status,
                newStatus: status,
                responseMessage,
            },
        });

        return createSuccessResponse(updatedTrade, `Trade ${status.toLowerCase()} successfully`);

    } catch (error) {
        console.error('Update trade error:', error);
        if (error instanceof Error) {
            return createErrorResponse(error.message, 400);
        }
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * Delete a trade (admin only or cancel pending trades)
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The trade ID
 * @returns JSON response with success or error message
 */
export async function DELETE(
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ tradeId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { tradeId } = await params;
        const { userId, role } = req.user;

        if (!tradeId) {
            return createErrorResponse('Trade ID is required', 400);
        }

        const existingTrade = await prisma.trade.findUnique({
            where: { id: tradeId },
            select: {
                id: true,
                status: true,
                initiatorId: true,
                recipientId: true,
            }
        });

        if (!existingTrade) {
            return createErrorResponse('Trade not found', 404);
        }

        if (role !== Role.ADMIN && existingTrade.initiatorId !== userId) {
            return createErrorResponse('Forbidden: You can only delete your own trades', 403);
        }

        if (existingTrade.status === 'ACCEPTED' || existingTrade.status === 'COMPLETED') {
            return createErrorResponse('Cannot delete completed trades', 400);
        }

        await prisma.$transaction(async (tx) => {
            await tx.tradeCard.deleteMany({
                where: { tradeId: tradeId }
            });

            await tx.trade.delete({
                where: { id: tradeId }
            });
        });

        logAuditEvent({
            action: 'TRADE_DELETED',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'trade',
            resourceId: tradeId,
            timestamp: new Date(),
            details: { status: existingTrade.status },
        });

        return createSuccessResponse(
            { id: tradeId },
            'Trade deleted successfully'
        );

    } catch (error) {
        console.error('Delete trade error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 