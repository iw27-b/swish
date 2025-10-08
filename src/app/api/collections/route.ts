import prisma from '@/lib/prisma';
import { CreateCollectionSchema, CreateCollectionRequestBody, CollectionQuerySchema } from '@/types/schemas/user_extended_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { Role } from '@prisma/client';
import { withAuth, isRateLimitedForOperation, recordAttemptForOperation } from '@/lib/auth';

/**
 * Get authenticated user's collections with pagination and filtering
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @returns JSON response with collections list or error
 */
export const GET = withAuth(async (req, user) => {
    try {
        const { userId } = user;

        const url = new URL(req.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        const validationResult = CollectionQuerySchema.safeParse(queryParams);

        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid query parameters',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { page, pageSize, search, isPublic, sortBy, sortOrder } = validationResult.data;

        const ALLOWED_SORT_FIELDS = {
            'createdAt': 'createdAt',
            'name': 'name', 
            'updatedAt': 'updatedAt'
        } as const;

        const safeSortBy = ALLOWED_SORT_FIELDS[sortBy as keyof typeof ALLOWED_SORT_FIELDS] || 'createdAt';

        const where: any = { ownerId: userId };
        
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (isPublic !== undefined) {
            where.isPublic = isPublic;
        }

        const [collections, totalCount] = await Promise.all([
            prisma.collection.findMany({
                where,
                include: {
                    cards: {
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
                    },
                    sharedWith: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    },
                    _count: {
                        select: {
                            cards: true,
                            sharedWith: true
                        }
                    }
                },
                orderBy: { [safeSortBy]: sortOrder },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.collection.count({ where })
        ]);

        const totalPages = Math.ceil(totalCount / pageSize);

        logAuditEvent({
            action: 'USER_COLLECTIONS_VIEWED',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'collection',
            timestamp: new Date(),
            details: { page, pageSize }
        });

        return createSuccessResponse({
            collections,
            pagination: {
                page,
                pageSize,
                totalCount,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }, 'Collections retrieved successfully');

    } catch (error) {
        console.error('Get collections error:', error);
        return createErrorResponse('Internal server error', 500);
    }
});

/**
 * Create a new collection for the authenticated user
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @returns JSON response with created collection or error
 */
export const POST = withAuth(async (req, user) => {
    try {
        const { userId } = user;

        const clientIP = getClientIP(req.headers);

        if (isRateLimitedForOperation(clientIP, 'collections')) {
            logAuditEvent({
                action: 'COLLECTION_CREATE_RATE_LIMITED',
                userId: userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'collection',
                timestamp: new Date(),
            });
            return createErrorResponse('Too many collection operations. Please try again later.', 429);
        }

        let requestBody;
        try {
            requestBody = await req.json();
        } catch (error) {
            recordAttemptForOperation(clientIP, 'collections');
            return createErrorResponse('Invalid JSON format in request body', 400);
        }

        if (!validateRequestSize(requestBody)) {
            recordAttemptForOperation(clientIP, 'collections');
            return createErrorResponse('Request too large', 413);
        }

        const validationResult = CreateCollectionSchema.safeParse(requestBody);
        if (!validationResult.success) {
            recordAttemptForOperation(clientIP, 'collections');
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { name, description, isPublic, imageUrl } = validationResult.data as CreateCollectionRequestBody;

        recordAttemptForOperation(clientIP, 'collections');

        const collection = await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { id: true }
            });

            if (!user) {
                throw new Error('User not found');
            }

            return tx.collection.create({
                data: {
                    name: name.trim(),
                    description: description?.trim(),
                    isPublic: isPublic || false,
                    imageUrl,
                    ownerId: userId
                },
                include: {
                    _count: {
                        select: {
                            cards: true,
                            sharedWith: true
                        }
                    }
                }
            });
        });

        logAuditEvent({
            action: 'COLLECTION_CREATED',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'collection',
            resourceId: collection.id,
            timestamp: new Date(),
            details: { name, isPublic }
        });

        return createSuccessResponse(collection, 'Collection created successfully');

    } catch (error) {
        if (error instanceof Error && error.message === 'User not found') {
            return createErrorResponse('User not found', 404);
        }
        console.error('Create collection error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}); 