import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { CreateCardSchema, CreateCardRequestBody, CardListQuerySchema, CardListQuery } from '@/types/schemas/card_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, createPaginationInfo, validateRequestSize } from '@/lib/api_utils';

/**
 * Handles GET requests to list basketball trading cards with advanced filtering, searching, sorting, and pagination.
 * 
 * @param req NextRequest - The incoming request object containing query parameters for filtering and pagination.
 * 
 * Query Parameters (all optional, validated via CardListQuerySchema):
 *   - page: number (default: 1) - The page number for pagination.
 *   - pageSize: number (default: 20) - Number of cards per page.
 *   - search: string - General search term (applies to name, player, team, brand).
 *   - player: string - Filter by player name.
 *   - team: string - Filter by team name.
 *   - brand: string - Filter by card brand.
 *   - year: number - Filter by card year.
 *   - condition: string - Filter by card condition.
 *   - rarity: string - Filter by card rarity.
 *   - isForTrade: boolean - Filter cards available for trade.
 *   - isForSale: boolean - Filter cards available for sale.
 *   - minPrice: number - Minimum price filter.
 *   - maxPrice: number - Maximum price filter.
 *   - sortBy: string - Field to sort by (e.g., 'price', 'year').
 *   - sortOrder: string ('asc' | 'desc') - Sort order.
 * 
 * @returns JSON response with:
 *   - data: Array of card objects matching the filters and pagination.
 *   - pagination: Pagination metadata (current page, total pages, etc.).
 *   - error: Error message and details if validation or processing fails.
 */

export async function GET(req: NextRequest) {
    try {
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
            isForTrade,
            isForSale,
            minPrice,
            maxPrice,
            sortBy,
            sortOrder
        } = validationResult.data as CardListQuery;

        const where: any = {};

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

        if (isForTrade !== undefined) {
            where.isForTrade = isForTrade;
        }

        if (isForSale !== undefined) {
            where.isForSale = isForSale;
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            where.price = {};
            if (minPrice !== undefined) {
                where.price.gte = minPrice;
            }
            if (maxPrice !== undefined) {
                where.price.lte = maxPrice;
            }
        }

        const offset = (page - 1) * pageSize;

        const orderBy: any = {};
        orderBy[sortBy] = sortOrder;

        const total = await prisma.card?.count({ where }) || 0;

        const cards = await prisma.card?.findMany({
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
                    }
                }
            },
        }) || [];

        const pagination = createPaginationInfo(page, pageSize, total);

        logAuditEvent({
            action: 'CARDS_LISTED',
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'cards',
            timestamp: new Date(),
            details: {
                page,
                pageSize,
                total,
                search,
                filters: { player, team, brand, year, condition, rarity, isForTrade, isForSale }
            },
        });

        return createSuccessResponse(
            { items: cards, pagination },
            'Cards retrieved successfully'
        );

    } catch (error) {
        console.error('List cards error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * Handles POST requests to create a new card listing.
 * 
 * CAUTION: will be moved to /api/cards/new OR /api/card/new
 * 
 * @param req AuthenticatedRequest - The authenticated user making the request.
 * @returns JSON response with success or error message.
 */
export async function POST(req: AuthenticatedRequest) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = req.user;

        const requestBody = await req.json();

        if (!validateRequestSize(requestBody)) {
            return createErrorResponse('Request too large', 413);
        }

        const validationResult = CreateCardSchema.safeParse(requestBody);
        if (!validationResult.success) {
            logAuditEvent({
                action: 'CARD_CREATION_VALIDATION_FAILED',
                userId: userId,
                ip: getClientIP(req.headers),
                userAgent: getUserAgent(req.headers),
                resource: 'cards',
                timestamp: new Date(),
                details: { errors: validationResult.error.flatten().fieldErrors },
            });
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const cardData = validationResult.data as CreateCardRequestBody;

        // TODO: Uncomment when Card model is added to Prisma schema
        // const card = await prisma.card.create({
        //     data: {
        //         ...cardData,
        //         ownerId: userId,
        //     },
        //     include: {
        //         owner: {
        //             select: {
        //                 id: true,
        //                 name: true,
        //                 email: true,
        //             }
        //         }
        //     },
        // });

        // Temporary response until Card model exists
        return createErrorResponse('Card creation not available - Card model not implemented yet', 501);

        // TODO: Uncomment when Card model is added to Prisma schema
        // logAuditEvent({
        //     action: 'CARD_CREATED',
        //     userId: userId,
        //     ip: getClientIP(req.headers),
        //     userAgent: getUserAgent(req.headers),
        //     resource: 'cards',
        //     resourceId: card.id,
        //     timestamp: new Date(),
        //     details: { cardName: card.name, player: card.player },
        // });

        // return createSuccessResponse(card, 'Card created successfully');

    } catch (error) {
        console.error('Create card error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 