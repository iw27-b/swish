import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { CreateTradeSchema, CreateTradeRequestBody, TradeListQuerySchema, TradeListQuery } from '@/types/schemas/trade_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize, createPaginationInfo } from '@/lib/api_utils';
import { isRateLimitedForOperation, recordAttemptForOperation } from '@/lib/auth_utils';

/**
 * Get user's trades with pagination and filtering
 * @param req AuthenticatedRequest - The authenticated request
 * @returns JSON response with trades data or error
 */
export async function GET(req: AuthenticatedRequest) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = req.user;
        const url = new URL(req.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());

        const validationResult = TradeListQuerySchema.safeParse(queryParams);
        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid query parameters',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { page, pageSize, status, type, sortBy, sortOrder } = validationResult.data as TradeListQuery;

        const where: any = {};

        if (type === 'sent') {
            where.initiatorId = userId;
        } else if (type === 'received') {
            where.recipientId = userId;
        } else {
            where.OR = [
                { initiatorId: userId },
                { recipientId: userId }
            ];
        }

        if (status) {
            where.status = status;
        }

        const offset = (page - 1) * pageSize;
        const orderBy: any = {};
        orderBy[sortBy] = sortOrder;

        const total = await prisma.trade.count({ where });

        const trades = await prisma.trade.findMany({
            where,
            skip: offset,
            take: pageSize,
            orderBy,
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
                            }
                        }
                    }
                }
            },
        });

        const pagination = createPaginationInfo(page, pageSize, total);

        logAuditEvent({
            action: 'TRADES_LISTED',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'trades',
            timestamp: new Date(),
            details: { page, pageSize, total, type, status },
        });

        return createSuccessResponse(
            { items: trades, pagination },
            'Trades retrieved successfully'
        );

    } catch (error) {
        console.error('List trades error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * Create a new trade offer
 * @param req AuthenticatedRequest - The authenticated request
 * @returns JSON response with created trade data or error
 */
export async function POST(req: AuthenticatedRequest) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = req.user;
        const clientIP = getClientIP(req.headers);

        if (isRateLimitedForOperation(clientIP, 'trades')) {
            recordAttemptForOperation(clientIP, 'trades');
            return createErrorResponse('Too many trade requests. Please try again later.', 429);
        }

        const contentLength = req.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > 100000) {
            recordAttemptForOperation(clientIP, 'trades');
            logAuditEvent({
                action: 'TRADE_CREATION_REQUEST_TOO_LARGE',
                userId: userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'trades',
                timestamp: new Date(),
                details: { contentLength: parseInt(contentLength, 10) }
            });
            return createErrorResponse('Request too large', 413);
        }

        let requestBody;
        try {
            requestBody = await req.json();
        } catch (error) {
            recordAttemptForOperation(clientIP, 'collections');
            logAuditEvent({
                action: 'TRADE_CREATION_INVALID_JSON',
                userId: userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'trades',
                timestamp: new Date(),
                details: { error: 'Invalid JSON format' }
            });
            return createErrorResponse('Invalid JSON format in request body', 400);
        }

        const validationResult = CreateTradeSchema.safeParse(requestBody);
        if (!validationResult.success) {
            recordAttemptForOperation(clientIP, 'collections');
            logAuditEvent({
                action: 'TRADE_CREATION_VALIDATION_FAILED',
                userId: userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'trades',
                timestamp: new Date(),
                details: { errors: validationResult.error.flatten().fieldErrors },
            });
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { offeredCardIds, requestedCardIds, recipientUserId, message, expiresInDays } = validationResult.data as CreateTradeRequestBody;

        if (recipientUserId === userId) {
            return createErrorResponse('Cannot create trade with yourself', 400);
        }

        const recipient = await prisma.user.findUnique({
            where: { id: recipientUserId },
            select: { id: true, name: true }
        });

        if (!recipient) {
            return createErrorResponse('Recipient user not found', 404);
        }

        const trade = await prisma.$transaction(async (tx) => {
            const offeredCards = await tx.card.findMany({
                where: {
                    id: { in: offeredCardIds },
                    ownerId: userId,
                    isForTrade: true
                },
                select: { id: true, name: true, player: true }
            });

            if (offeredCards.length !== offeredCardIds.length) {
                throw new Error('Some offered cards not found or not available for trade');
            }

            const requestedCards = await tx.card.findMany({
                where: {
                    id: { in: requestedCardIds },
                    ownerId: recipientUserId,
                    isForTrade: true
                },
                select: { id: true, name: true, player: true }
            });

            if (requestedCards.length !== requestedCardIds.length) {
                throw new Error('Some requested cards not found or not available for trade');
            }

            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + expiresInDays);

            const newTrade = await tx.trade.create({
                data: {
                    initiatorId: userId,
                    recipientId: recipientUserId,
                    message,
                    expiresAt: expiryDate,
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
                    }
                }
            });

            const tradeCardData = [
                ...offeredCardIds.map(cardId => ({
                    tradeId: newTrade.id,
                    cardId,
                    isOffered: true
                })),
                ...requestedCardIds.map(cardId => ({
                    tradeId: newTrade.id,
                    cardId,
                    isOffered: false
                }))
            ];

            await tx.tradeCard.createMany({
                data: tradeCardData
            });

            return newTrade;
        });

        logAuditEvent({
            action: 'TRADE_CREATED',
            userId: userId,
            ip: clientIP,
            userAgent: getUserAgent(req.headers),
            resource: 'trades',
            resourceId: trade.id,
            timestamp: new Date(),
            details: {
                recipientId: recipientUserId,
                offeredCardsCount: offeredCardIds.length,
                requestedCardsCount: requestedCardIds.length,
                expiresAt: trade.expiresAt
            },
        });

        return createSuccessResponse(trade, 'Trade offer created successfully');

    } catch (error) {
        console.error('Create trade error:', error);
        if (error instanceof Error) {
            return createErrorResponse(error.message, 400);
        }
        return createErrorResponse('Internal server error', 500);
    }
} 