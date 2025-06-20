import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { UpdateCollectionSchema, UpdateCollectionRequestBody, VerifyPinSchema, VerifyPinRequestBody } from '@/types/schemas/user_extended_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { requirePinIfSet } from '@/lib/pin_utils';
import { Role } from '@prisma/client';

/**
 * Get a specific collection
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The user ID and collection ID
 * @returns JSON response with collection data or error
 */
export async function GET(
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ userId: string; collectionId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId, collectionId } = await params;
        const requestingUser = req.user;

        const collection = await prisma.collection.findUnique({
            where: { id: collectionId },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true
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
                                isForSale: true,
                                isForTrade: true
                            }
                        }
                    },
                    orderBy: { addedAt: 'desc' }
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
            }
        });

        if (!collection) {
            return createErrorResponse('Collection not found', 404);
        }

        const hasAccess = 
            collection.ownerId === requestingUser.userId || 
            requestingUser.role === Role.ADMIN || 
            collection.isPublic || 
            collection.sharedWith.some(share => share.userId === requestingUser.userId); 

        if (!hasAccess) {
            return createErrorResponse('Forbidden: You do not have access to this collection', 403);
        }

        logAuditEvent({
            action: 'COLLECTION_VIEWED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'collection',
            resourceId: collectionId,
            timestamp: new Date(),
        });

        return createSuccessResponse(collection, 'Collection retrieved successfully');

    } catch (error) {
        console.error('Get collection error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * Update a specific collection
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The user ID and collection ID
 * @returns JSON response with updated collection or error
 */
export async function PATCH(
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ userId: string; collectionId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId, collectionId } = await params;
        const requestingUser = req.user;

        let requestBody;
        try {
            requestBody = await req.json();
        } catch (error) {
            return createErrorResponse('Invalid JSON format in request body', 400);
        }

        if (!validateRequestSize(requestBody)) {
            return createErrorResponse('Request too large', 413);
        }

        const validationResult = UpdateCollectionSchema.safeParse(requestBody);
        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const collection = await prisma.collection.findUnique({
            where: { id: collectionId },
            include: {
                sharedWith: true
            }
        });

        if (!collection) {
            return createErrorResponse('Collection not found', 404);
        }

        const canEdit = 
            collection.ownerId === requestingUser.userId || 
            requestingUser.role === Role.ADMIN || 
            collection.sharedWith.some(share => 
                share.userId === requestingUser.userId && share.canEdit
            ); 

        if (!canEdit) {
            return createErrorResponse('Forbidden: You do not have permission to edit this collection', 403);
        }

        const { name, description, isPublic, imageUrl } = validationResult.data as UpdateCollectionRequestBody;

        if (name && name !== collection.name) {
            const existingCollection = await prisma.collection.findFirst({
                where: {
                    ownerId: collection.ownerId,
                    name: { equals: name, mode: 'insensitive' },
                    id: { not: collectionId }
                }
            });

            if (existingCollection) {
                return createErrorResponse('A collection with this name already exists', 409);
            }
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description?.trim();
        if (isPublic !== undefined) updateData.isPublic = isPublic;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

        if (Object.keys(updateData).length === 0) {
            return createSuccessResponse(collection, 'No changes detected');
        }

        const updatedCollection = await prisma.collection.update({
            where: { id: collectionId },
            data: updateData,
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
            action: 'COLLECTION_UPDATED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'collection',
            resourceId: collectionId,
            timestamp: new Date(),
            details: { updatedFields: Object.keys(updateData) }
        });

        return createSuccessResponse(updatedCollection, 'Collection updated successfully');

    } catch (error) {
        console.error('Update collection error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * Delete a collection
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The user ID and collection ID
 * @returns JSON response with success or error message
 */
export async function DELETE(
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ userId: string; collectionId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId, collectionId } = await params;
        const requestingUser = req.user;

        if (requestingUser.userId !== userId && requestingUser.role !== Role.ADMIN) {
            return createErrorResponse('Forbidden: You can only delete your own collections', 403);
        }

        let requestBody: { pin?: string } = {};
        try {
            const body = await req.json();
            if (body && typeof body === 'object') {
                requestBody = body;
            }
        } catch {
        }

        if (requestingUser.userId === userId) {
            const pinError = await requirePinIfSet(
                userId,
                requestBody.pin,
                'collection deletion'
            );

            if (pinError) {
                return pinError;
            }
        }

        const collection = await prisma.collection.findUnique({
            where: { id: collectionId },
            include: { _count: { select: { cards: true } } },
        });

        if (!collection) {
            return createErrorResponse('Collection not found', 404);
        }

        if (collection.ownerId !== userId) {
            return createErrorResponse('Forbidden: You can only delete your own collections', 403);
        }

        await prisma.collection.delete({
            where: { id: collectionId },
        });

        logAuditEvent({
            action: 'COLLECTION_DELETED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'collection',
            resourceId: collectionId,
            timestamp: new Date(),
            details: {
                name: collection.name,
                cardCount: collection._count.cards,
            },
        });

        return createSuccessResponse(null, 'Collection deleted successfully');

    } catch (error) {
        console.error('Delete collection error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 