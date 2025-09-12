import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { CardListQuerySchema, CardListQuery } from '@/types/schemas/card_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, createPaginationInfo } from '@/lib/api_utils';
import { isRateLimitedForOperation, recordAttemptForOperation } from '@/lib/auth';

/**
 * Get marketplace cards (cards for sale) with advanced filtering and search
 * @param req NextRequest - The request object
 * @returns JSON response with marketplace cards or error
 */
export async function GET(req: NextRequest) {
    try {
        const clientIP = getClientIP(req.headers);

        if (isRateLimitedForOperation(clientIP, 'search')) {
            recordAttemptForOperation(clientIP, 'search');
            return createErrorResponse('Too many marketplace requests. Please try again later.', 429);
        }

        const url = new URL(req.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());

        const validationResult = CardListQuerySchema.safeParse(queryParams);
        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid query parameters',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const {
            page,
            pageSize,
            search,
            player,
            team,
            brand,
            year,
            condition,
            rarity,
            minPrice,
            maxPrice,
            sortBy,
            sortOrder
        } = validationResult.data as CardListQuery;

        const where: any = {
            isForSale: true,
            price: { not: null, gt: 0 } 
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { player: { contains: search, mode: 'insensitive' } },
                { team: { contains: search, mode: 'insensitive' } },
                { brand: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (player) {
            where.player = { contains: player, mode: 'insensitive' };
        }

        if (team) {
            where.team = { contains: team, mode: 'insensitive' };
        }

        if (brand) {
            where.brand = { contains: brand, mode: 'insensitive' };
        }

        if (year) {
            where.year = year;
        }

        if (condition) {
            where.condition = condition;
        }

        if (rarity) {
            where.rarity = rarity;
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            where.price = { ...where.price };
            if (minPrice !== undefined) {
                where.price.gte = minPrice;
            }
            if (maxPrice !== undefined) {
                where.price.lte = maxPrice;
            }
        }

        const offset = (page - 1) * pageSize;

        const orderBy: any = {};
        if (sortBy === 'price') {
            orderBy.price = sortOrder;
        } else if (sortBy === 'year') {
            orderBy.year = sortOrder;
        } else if (sortBy === 'player') {
            orderBy.player = sortOrder;
        } else if (sortBy === 'name') {
            orderBy.name = sortOrder;
        } else {
            orderBy.createdAt = sortOrder; 
        }

        const total = await prisma.card.count({ where });

        const cards = await prisma.card.findMany({
            where,
            skip: offset,
            take: pageSize,
            orderBy,
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        _count: {
                            select: {
                                sales: { where: { status: 'COMPLETED' } }
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        favorites: true,
                        tracking: true,
                        purchases: { where: { status: { in: ['PENDING', 'PAID', 'SHIPPED'] } } }
                    }
                }
            },
        });

        const stats = await prisma.card.aggregate({
            where: { isForSale: true, price: { not: null, gt: 0 } },
            _avg: { price: true },
            _min: { price: true },
            _max: { price: true },
            _count: true,
        });

        const trending = await prisma.card.findMany({
            where: {
                isForSale: true,
                price: { not: null, gt: 0 },
                favorites: {
                    some: {
                        createdAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                        }
                    }
                }
            },
            include: {
                _count: {
                    select: {
                        favorites: true,
                        tracking: true,
                    }
                }
            },
            orderBy: {
                favorites: {
                    _count: 'desc'
                }
            },
            take: 5
        });

        const pagination = createPaginationInfo(page, pageSize, total);

        const marketplaceData = {
            items: cards,
            pagination,
            stats: {
                totalListings: stats._count,
                averagePrice: stats._avg.price || 0,
                priceRange: {
                    min: stats._min.price || 0,
                    max: stats._max.price || 0
                }
            },
            trending: trending.map(card => ({
                id: card.id,
                name: card.name,
                player: card.player,
                team: card.team,
                year: card.year,
                price: card.price,
                imageUrl: card.imageUrl,
                favoriteCount: card._count.favorites,
                trackingCount: card._count.tracking
            }))
        };

        logAuditEvent({
            action: 'MARKETPLACE_BROWSED',
            ip: clientIP,
            userAgent: getUserAgent(req.headers),
            resource: 'marketplace',
            timestamp: new Date(),
            details: {
                page,
                pageSize,
                total,
                search,
                filters: { player, team, brand, year, condition, rarity, minPrice, maxPrice }
            },
        });

        return createSuccessResponse(
            marketplaceData,
            'Marketplace cards retrieved successfully'
        );

    } catch (error) {
        console.error('Marketplace browse error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 