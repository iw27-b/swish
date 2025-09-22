import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { CreateCardSchema, CreateCardRequestBody, CardListQuerySchema, CardListQuery } from '@/types/schemas/card_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, createPaginationInfo, validateRequestSize, validateContentLength } from '@/lib/api_utils';
import { validateImageFile } from '@/lib/image_utils';
import { verifyAuth, isRateLimited, recordFailedAttempt } from '@/lib/auth';

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

        const orderBy: any = [
            { [sortBy]: sortOrder },
            { id: 'asc' }
        ];

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
 * Handles POST requests to create a new card listing with optional image upload.
 * Supports both JSON and FormData requests.
 * 
 * @param req NextRequest - The request object (will verify auth internally).
 * @returns JSON response with success or error message.
 */
export async function POST(req: NextRequest) {
    try {
        const clientIP = getClientIP(req.headers);
        
        if (isRateLimited(clientIP)) {
            logAuditEvent({
                action: 'CARD_CREATION_RATE_LIMITED',
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'cards',
                timestamp: new Date(),
            });
            return createErrorResponse('Too many card creation attempts. Please try again later.', 429);
        }

        const authResult = await verifyAuth(req);
        if (!authResult.success || !authResult.user) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = authResult.user;

        const contentLengthValidation = validateContentLength(req.headers, '/api/cards');
        if (!contentLengthValidation.isValid) {
            recordFailedAttempt(clientIP);
            return contentLengthValidation.errorResponse!;
        }

        let cardData: any;
        let imageFile: File | null = null;

        const contentType = req.headers.get('content-type');
        
        if (contentType?.includes('multipart/form-data')) {
            const formData = await req.formData();
            cardData = {
                name: formData.get('name') as string,
                player: formData.get('player') as string,
                team: formData.get('team') as string,
                year: formData.get('year') ? parseInt(formData.get('year') as string) : undefined,
                brand: formData.get('brand') as string,
                cardNumber: formData.get('cardNumber') as string,
                condition: formData.get('condition') as string,
                rarity: formData.get('rarity') as string,
                description: formData.get('description') as string,
                isForTrade: formData.get('isForTrade') === 'true',
                isForSale: formData.get('isForSale') === 'true',
                price: formData.get('price') ? parseFloat(formData.get('price') as string) : undefined,
            };
            imageFile = formData.get('file') as File;
        } else {
            cardData = await req.json();
        }

        if (!validateRequestSize(cardData)) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('Request too large', 413);
        }

        if (imageFile && imageFile.size > 0) {
            const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('category', 'card');
            
            try {
                const origin = new URL(req.url).origin;
                const uploadUrl = `${origin}/api/images/upload`;
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 10_000);
                const headers: HeadersInit = {};
                const auth = req.headers.get('authorization');
                if (auth) headers['authorization'] = auth;
                const cookie = req.headers.get('cookie');
                if (cookie) headers['cookie'] = cookie;
                const uploadResponse = await fetch(uploadUrl, {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal,
                    headers,
                });
                clearTimeout(timer);
                
                if (!uploadResponse.ok) {
                    throw new Error('Image upload failed');
                }
                
                const uploadResult = await uploadResponse.json();
                cardData.imageUrl = uploadResult.data.url;
            } catch (imageError) {
                recordFailedAttempt(clientIP);
                return createErrorResponse(
                    `Image upload failed: ${imageError instanceof Error ? imageError.message : 'Unknown error'}`,
                    400
                );
            }
        }

        const validationResult = CreateCardSchema.safeParse(cardData);
        if (!validationResult.success) {
            recordFailedAttempt(clientIP);
            logAuditEvent({
                action: 'CARD_CREATION_VALIDATION_FAILED',
                userId: userId,
                ip: clientIP,
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

        const validatedCardData = validationResult.data as CreateCardRequestBody;

        const card = await prisma.$transaction(async (tx) => {
            return await tx.card.create({
                data: {
                    name: validatedCardData.name,
                    player: validatedCardData.player,
                    team: validatedCardData.team,
                    year: validatedCardData.year,
                    brand: validatedCardData.brand,
                    cardNumber: validatedCardData.cardNumber,
                    condition: validatedCardData.condition,
                    rarity: validatedCardData.rarity,
                    description: validatedCardData.description,
                    imageUrl: validatedCardData.imageUrl,
                    isForTrade: validatedCardData.isForTrade,
                    isForSale: validatedCardData.isForSale,
                    price: validatedCardData.price,
                    ownerId: userId,
                },
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
            action: 'CARD_CREATED',
            userId: userId,
            ip: clientIP,
            userAgent: getUserAgent(req.headers),
            resource: 'cards',
            resourceId: card.id,
            timestamp: new Date(),
            details: { 
                cardName: card.name, 
                player: card.player,
                hasImage: !!validatedCardData.imageUrl,
                imageProcessed: !!imageFile,
            },
        });

        const responseData = card;

        return createSuccessResponse(responseData, 'Card created successfully');

    } catch (error) {
        console.error('Create card error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 