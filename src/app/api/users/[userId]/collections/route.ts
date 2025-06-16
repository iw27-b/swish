import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { CreateCollectionSchema, CreateCollectionRequestBody, CollectionQuerySchema } from '@/types/schemas/user_extended_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { Role } from '@prisma/client';

/**
 * Get user's collections with pagination and filtering
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The user ID
 * @returns JSON response with collections list or error
 */
export async function GET(
    req: AuthenticatedRequest,
    { params }: { params: { userId: string } }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = params;
        const requestingUser = req.user;

        // Users can only view their own collections unless they're admin
        if (requestingUser.userId !== userId && requestingUser.role !== Role.ADMIN) {
            return createErrorResponse('Forbidden: You can only view your own collections', 403);
        }

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
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.collection.count({ where })
        ]);

        const totalPages = Math.ceil(totalCount / pageSize);

        logAuditEvent({
            action: 'USER_COLLECTIONS_VIEWED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'collection',
            timestamp: new Date(),
            details: { targetUserId: userId, page, pageSize }
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
}

/**
 * Create a new collection for the user
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The user ID
 * @returns JSON response with created collection or error
 */
export async function POST(
    req: AuthenticatedRequest,
    { params }: { params: { userId: string } }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = params;
        const requestingUser = req.user;

        // Users can only create collections for themselves
        if (requestingUser.userId !== userId) {
            return createErrorResponse('Forbidden: You can only create collections for yourself', 403);
        }

        let requestBody;
        try {
            requestBody = await req.json();
        } catch (error) {
            return createErrorResponse('Invalid JSON format in request body', 400);
        }

        if (!validateRequestSize(requestBody)) {
            return createErrorResponse('Request too large', 413);
        }

        const validationResult = CreateCollectionSchema.safeParse(requestBody);
        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { name, description, isPublic, imageUrl } = validationResult.data as CreateCollectionRequestBody;

        // Check if user already has a collection with this name
        const existingCollection = await prisma.collection.findFirst({
            where: {
                ownerId: userId,
                name: { equals: name, mode: 'insensitive' }
            }
        });

        if (existingCollection) {
            return createErrorResponse('A collection with this name already exists', 409);
        }

        const collection = await prisma.collection.create({
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

        logAuditEvent({
            action: 'COLLECTION_CREATED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'collection',
            resourceId: collection.id,
            timestamp: new Date(),
            details: { name, isPublic }
        });

        return createSuccessResponse(collection, 'Collection created successfully');

    } catch (error) {
        console.error('Create collection error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 