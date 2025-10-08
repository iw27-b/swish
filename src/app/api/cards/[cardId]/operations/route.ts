import prisma from '@/lib/prisma';
import { CardOperationSchema, CardOperationRequestBody } from '@/types/schemas/trade_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';
import { Role } from '@prisma/client';
import { withAuth } from '@/lib/auth';

/**
 * Handle card operations like listing for sale/trade, removing from sale/trade, updating price
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @param params - The card ID
 * @returns JSON response with updated card data or error
 */
export const POST = withAuth(async (
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

        const contentLength = req.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > 100000) {
            logAuditEvent({
                action: 'CARD_OPERATION_REQUEST_TOO_LARGE',
                userId: userId,
                ip: getClientIP(req.headers),
                userAgent: getUserAgent(req.headers),
                resource: 'card',
                resourceId: cardId,
                timestamp: new Date(),
                details: { contentLength: parseInt(contentLength, 10) }
            });
            return createErrorResponse('Request too large', 413);
        }

        let requestBody;
        try {
            requestBody = await req.json();
        } catch (error) {
            logAuditEvent({
                action: 'CARD_OPERATION_INVALID_JSON',
                userId: userId,
                ip: getClientIP(req.headers),
                userAgent: getUserAgent(req.headers),
                resource: 'card',
                resourceId: cardId,
                timestamp: new Date(),
                details: { error: 'Invalid JSON format' }
            });
            return createErrorResponse('Invalid JSON format in request body', 400);
        }

        const validationResult = CardOperationSchema.safeParse(requestBody);
        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { action, price } = validationResult.data as CardOperationRequestBody;

        const existingCard = await prisma.card.findUnique({
            where: { id: cardId },
            select: { 
                id: true, 
                ownerId: true, 
                name: true,
                isForSale: true,
                isForTrade: true,
                price: true
            }
        });

        if (!existingCard) {
            return createErrorResponse('Card not found', 404);
        }

        if (existingCard.ownerId !== userId && role !== Role.ADMIN) {
            logAuditEvent({
                action: 'UNAUTHORIZED_CARD_OPERATION_ATTEMPT',
                userId: userId,
                ip: getClientIP(req.headers),
                userAgent: getUserAgent(req.headers),
                resource: 'card',
                resourceId: cardId,
                timestamp: new Date(),
                details: { action }
            });
            return createErrorResponse('Forbidden: You can only operate on your own cards', 403);
        }

        let updateData: any = {};

        switch (action) {
            case 'list-for-sale':
                if (!price || price <= 0) {
                    return createErrorResponse('Valid price is required when listing for sale', 400);
                }
                updateData = { isForSale: true, price };
                break;

            case 'list-for-trade':
                updateData = { isForTrade: true };
                break;

            case 'remove-from-sale':
                updateData = { isForSale: false, price: null };
                break;

            case 'remove-from-trade':
                updateData = { isForTrade: false };
                break;

            case 'update-price':
                if (!existingCard.isForSale) {
                    return createErrorResponse('Card must be listed for sale to update price', 400);
                }
                if (!price || price <= 0) {
                    return createErrorResponse('Valid price is required', 400);
                }
                updateData = { price };
                break;

            default:
                return createErrorResponse('Invalid action', 400);
        }

        const updatedCard = await prisma.$transaction(async (tx) => {
            return await tx.card.update({
                where: { id: cardId },
                data: updateData,
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
            action: 'CARD_OPERATION_PERFORMED',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'card',
            resourceId: cardId,
            timestamp: new Date(),
            details: { 
                action,
                previousState: {
                    isForSale: existingCard.isForSale,
                    isForTrade: existingCard.isForTrade,
                    price: existingCard.price
                },
                newState: {
                    isForSale: updatedCard.isForSale,
                    isForTrade: updatedCard.isForTrade,
                    price: updatedCard.price
                }
            },
        });

        return createSuccessResponse(updatedCard, `Card ${action} completed successfully`);

    } catch (error) {
        console.error('Card operation error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}); 