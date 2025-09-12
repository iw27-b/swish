import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { FavoriteQuerySchema } from '@/types/schemas/user_extended_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';
import { isRateLimitedForOperation, recordAttemptForOperation } from '@/lib/auth';
import { Role } from '@prisma/client';

/**
 * Get user's favorite cards with pagination
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The user ID
 * @returns JSON response with favorites list or error
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
            return createErrorResponse('Forbidden: You can only view your own favorites', 403);
        }

        const url = new URL(req.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        const validationResult = FavoriteQuerySchema.safeParse(queryParams);

        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid query parameters',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { page, pageSize, sortBy, sortOrder } = validationResult.data;

        const [favorites, totalCount] = await Promise.all([
            prisma.cardFavorite.findMany({
                where: { userId },
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
                },
                orderBy: sortBy === 'createdAt' ? { createdAt: sortOrder } : 
                         sortBy === 'name' ? { card: { name: sortOrder } } :
                         { card: { price: sortOrder } },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.cardFavorite.count({ where: { userId } })
        ]);

        const totalPages = Math.ceil(totalCount / pageSize);

        logAuditEvent({
            action: 'USER_FAVORITES_VIEWED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
            details: { page, pageSize }
        });

        return createSuccessResponse({
            favorites,
            pagination: {
                page,
                pageSize,
                totalCount,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }, 'Favorites retrieved successfully');

    } catch (error) {
        console.error('Get favorites error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * Add a card to favorites
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The user ID
 * @returns JSON response with success message or error
 */
export async function POST(
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = await params;
        const requestingUser = req.user;
        const clientIP = getClientIP(req.headers);

        if (requestingUser.userId !== userId) {
            return createErrorResponse('Forbidden: You can only manage your own favorites', 403);
        }

        if (isRateLimitedForOperation(clientIP, 'profile_updates')) {
            recordAttemptForOperation(clientIP, 'profile_updates');
            return createErrorResponse('Too many favorite requests. Please try again later.', 429);
        }

        let requestBody;
        try {
            requestBody = await req.json();
        } catch (error) {
            return createErrorResponse('Invalid JSON format in request body', 400);
        }

        const { cardId } = requestBody;

        if (!cardId || typeof cardId !== 'string') {
            return createErrorResponse('Card ID is required', 400);
        }

        const card = await prisma.card.findUnique({
            where: { id: cardId },
            select: { id: true, name: true, player: true }
        });

        if (!card) {
            return createErrorResponse('Card not found', 404);
        }

        const existingFavorite = await prisma.cardFavorite.findUnique({
            where: {
                userId_cardId: {
                    userId,
                    cardId
                }
            }
        });

        if (existingFavorite) {
            return createErrorResponse('Card is already in favorites', 409);
        }

        const favorite = await prisma.cardFavorite.create({
            data: {
                userId,
                cardId
            },
            include: {
                card: {
                    select: {
                        id: true,
                        name: true,
                        player: true,
                        imageUrl: true,
                        price: true
                    }
                }
            }
        });

        logAuditEvent({
            action: 'CARD_FAVORITED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'card',
            resourceId: cardId,
            timestamp: new Date(),
        });

        return createSuccessResponse(favorite, 'Card added to favorites successfully');

    } catch (error) {
        console.error('Add favorite error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 