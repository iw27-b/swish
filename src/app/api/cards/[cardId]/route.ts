import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { UpdateCardSchema, UpdateCardRequestBody } from '@/types/schemas/card_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize, retryWithBackoff, logObservabilityError } from '@/lib/api_utils';
import { validateImageFile } from '@/lib/image_utils';
import { withAuth, isRateLimited, recordFailedAttempt } from '@/lib/auth';
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
 * Update a specific card with optional image upload
 * Supports both JSON and FormData requests.
 * @param req NextRequest - The request object (will verify auth internally)
 * @param params - The card ID
 * @returns JSON response with updated card data or error
 */
export const PATCH = withAuth(async (
    req: NextRequest,
    user: { userId: string, role: Role },
    { params }: { params: Promise<{ cardId: string }> }
) => {
    try {
        const clientIP = getClientIP(req.headers);

        if (isRateLimited(clientIP)) {
            logAuditEvent({
                action: 'CARD_UPDATE_RATE_LIMITED',
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'card',
                timestamp: new Date(),
            });
            return createErrorResponse('Too many update attempts. Please try again later.', 429);
        }

        const { cardId } = await params;
        const { userId, role } = user;

        if (!cardId) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('Card ID is required', 400);
        }
        let updateData: Partial<UpdateCardRequestBody>;
        let imageFile: File | null = null;

        const contentType = req.headers.get('content-type');
        
        if (contentType?.includes('multipart/form-data')) {
            const formData = await req.formData();
            updateData = {
                name: formData.get('name') as string,
                player: formData.get('player') as string,
                team: formData.get('team') as string,
                year: formData.get('year') ? parseInt(formData.get('year') as string) : undefined,
                brand: formData.get('brand') as string,
                cardNumber: formData.get('cardNumber') as string,
                condition: formData.get('condition') as any,
                rarity: formData.get('rarity') as any,
                description: formData.get('description') as string,
                isForTrade: formData.get('isForTrade') === 'true',
                isForSale: formData.get('isForSale') === 'true',
                price: formData.get('price') ? parseFloat(formData.get('price') as string) : undefined,
            };
            imageFile = formData.get('file') as File;
        } else {
            updateData = await req.json();
        }

        if (!validateRequestSize(updateData)) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('Request too large', 413);
        }

        const existingCard = await prisma.card.findUnique({
            where: { id: cardId },
            select: { id: true, ownerId: true, name: true, imageUrl: true }
        });

        if (!existingCard) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('Card not found', 404);
        }

        if (existingCard.ownerId !== userId && role !== Role.ADMIN) {
            logAuditEvent({
                action: 'UNAUTHORIZED_CARD_UPDATE_ATTEMPT',
                userId: userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'card',
                resourceId: cardId,
                timestamp: new Date(),
            });
            return createErrorResponse('Forbidden: You can only update your own cards', 403);
        }

        if (imageFile && imageFile.size > 0) {
            try {
                const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
                const validationResult = validateImageFile(imageBuffer);
                
                if (!validationResult.isValid) {
                    recordFailedAttempt(clientIP);
                    return createErrorResponse(
                        validationResult.error || 'Invalid image file',
                        400
                    );
                }
                
                const formData = new FormData();
                formData.append('file', imageFile);
                formData.append('category', 'card');
                
                if (!process.env.NEXT_PUBLIC_BASE_URL) {
                    throw new Error('NEXT_PUBLIC_BASE_URL is not configured');
                }
                
                const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/images/upload`, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Authorization': req.headers.get('Authorization') || '',
                        'Cookie': req.headers.get('Cookie') || '',
                    },
                });
                
                if (!uploadResponse.ok) {
                    throw new Error('Image upload failed');
                }
                
                const uploadResult = await uploadResponse.json();
                updateData.imageUrl = uploadResult.data.url;
            } catch (imageError) {
                // recordFailedAttempt(clientIP);
                return createErrorResponse(
                    `Image upload failed: ${imageError instanceof Error ? imageError.message : 'Unknown error'}`,
                    400
                );
            }
        }

        const validationResult = UpdateCardSchema.safeParse(updateData);
        if (!validationResult.success) {
            recordFailedAttempt(clientIP);
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const validatedUpdateData = validationResult.data as UpdateCardRequestBody;

        if (validatedUpdateData.isForSale === true && validatedUpdateData.price === undefined) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('Price is required when listing card for sale', 400);
        }

        const updatedCard = await prisma.$transaction(async (tx) => {
            return await tx.card.update({
                where: { id: cardId },
                data: validatedUpdateData,
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
            ip: clientIP,
            userAgent: getUserAgent(req.headers),
            resource: 'card',
            resourceId: cardId,
            timestamp: new Date(),
            details: { 
                updatedFields: Object.keys(validatedUpdateData),
                previousName: existingCard.name,
                newName: updatedCard.name,
                hasImageUpdate: !!imageFile,
            },
        });

        const responseData = updatedCard;

        return createSuccessResponse(responseData, 'Card updated successfully');

    } catch (error) {
        console.error('Update card error:', error);
        return createErrorResponse('Internal server error', 500);
    }
});

/**
 * Delete a specific card
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @param params - The card ID
 * @returns JSON response with success or error message
 */
export const DELETE = withAuth(async (
    req,
    user,
    { params }: { params: Promise<{ cardId: string }> }
) => {
    try {
        const { cardId } = await params;
        const { userId, role } = user;

        if (!cardId) {
            return createErrorResponse('Card ID is required', 400);
        }

        const existingCard = await prisma.card.findUnique({
            where: { id: cardId },
            select: { 
                id: true, 
                ownerId: true, 
                name: true,
                imageUrl: true,
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
        
        if (existingCard.imageUrl) {
            try {
                await retryWithBackoff(async () => {
                    const deleteResponse = await fetch(new URL('/api/images/delete', req.nextUrl || req.url), {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': req.headers.get('Authorization') || '',
                            'Cookie': req.headers.get('Cookie') || '',
                        },
                        body: JSON.stringify({ imageUrl: existingCard.imageUrl }),
                    });
                    
                    if (!deleteResponse.ok) {
                        const errorText = await deleteResponse.text();
                        throw new Error(`Image deletion failed: ${deleteResponse.status} ${deleteResponse.statusText}. ${errorText}`);
                    }
                    
                    return deleteResponse;
                }, 3, 1000);
                
            } catch (error) {
                logObservabilityError({
                    operation: 'card_image_deletion',
                    error,
                    context: {
                        cardId: cardId,
                        imageUrl: existingCard.imageUrl,
                        action: 'DELETE_CARD_CASCADE'
                    },
                    severity: 'high'
                });
                
                return new NextResponse(JSON.stringify({
                    success: false,
                    message: 'Card deleted but image cleanup failed. Image may require manual cleanup.',
                    data: {
                        cardDeleted: true,
                        imageDeleted: false,
                        orphanedImageUrl: existingCard.imageUrl
                    },
                    meta: {
                        timestamp: new Date().toISOString(),
                        requestId: randomUUID(),
                    }
                }), {
                    status: 207,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

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
}); 