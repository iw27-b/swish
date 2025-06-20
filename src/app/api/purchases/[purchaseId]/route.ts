import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { UpdatePurchaseSchema, UpdatePurchaseRequestBody } from '@/types/schemas/trade_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { Role } from '@prisma/client';

/**
 * Get a specific purchase by ID
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The purchase ID
 * @returns JSON response with purchase data or error
 */
export async function GET(
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ purchaseId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { purchaseId } = await params;
        const { userId, role } = req.user;

        if (!purchaseId) {
            return createErrorResponse('Purchase ID is required', 400);
        }

        const purchase = await prisma.purchase.findUnique({
            where: { id: purchaseId },
            include: {
                buyer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
                seller: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
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
                    }
                }
            },
        });

        if (!purchase) {
            return createErrorResponse('Purchase not found', 404);
        }

        if (purchase.buyerId !== userId && purchase.sellerId !== userId && role !== Role.ADMIN) {
            logAuditEvent({
                action: 'UNAUTHORIZED_PURCHASE_VIEW_ATTEMPT',
                userId: userId,
                ip: getClientIP(req.headers),
                userAgent: getUserAgent(req.headers),
                resource: 'purchase',
                resourceId: purchaseId,
                timestamp: new Date(),
            });
            return createErrorResponse('Forbidden: You can only view your own purchases', 403);
        }

        logAuditEvent({
            action: 'PURCHASE_VIEWED',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'purchase',
            resourceId: purchaseId,
            timestamp: new Date(),
        });

        return createSuccessResponse(purchase, 'Purchase retrieved successfully');

    } catch (error) {
        console.error('Get purchase error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * Update purchase status (for sellers to update shipping, etc.)
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The purchase ID
 * @returns JSON response with updated purchase data or error
 */
export async function PATCH(
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ purchaseId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { purchaseId } = await params;
        const { userId, role } = req.user;

        if (!purchaseId) {
            return createErrorResponse('Purchase ID is required', 400);
        }

        const requestBody = await req.json();

        if (!validateRequestSize(requestBody)) {
            return createErrorResponse('Request too large', 413);
        }

        const validationResult = UpdatePurchaseSchema.safeParse(requestBody);
        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { status, trackingNumber, notes } = validationResult.data as UpdatePurchaseRequestBody;

        const existingPurchase = await prisma.purchase.findUnique({
            where: { id: purchaseId },
            select: {
                id: true,
                status: true,
                buyerId: true,
                sellerId: true,
            }
        });

        if (!existingPurchase) {
            return createErrorResponse('Purchase not found', 404);
        }

        if (existingPurchase.sellerId !== userId && role !== Role.ADMIN) {
            logAuditEvent({
                action: 'UNAUTHORIZED_PURCHASE_UPDATE_ATTEMPT',
                userId: userId,
                ip: getClientIP(req.headers),
                userAgent: getUserAgent(req.headers),
                resource: 'purchase',
                resourceId: purchaseId,
                timestamp: new Date(),
                details: { requestedStatus: status }
            });
            return createErrorResponse('Forbidden: Only the seller can update purchase status', 403);
        }

        const validTransitions: Record<string, string[]> = {
            'PENDING': ['PAID', 'CANCELLED'],
            'PAID': ['SHIPPED', 'CANCELLED', 'REFUNDED'],
            'SHIPPED': ['DELIVERED', 'REFUNDED'],
            'DELIVERED': ['COMPLETED', 'REFUNDED'],
            'COMPLETED': [], 
            'CANCELLED': [], 
            'REFUNDED': [], 
        };

        if (!validTransitions[existingPurchase.status]?.includes(status)) {
            return createErrorResponse(
                `Invalid status transition from ${existingPurchase.status} to ${status}`,
                400
            );
        }

        const updatedPurchase = await prisma.$transaction(async (tx) => {
            const updateData: any = {
                status,
                updatedAt: new Date(),
            };

            if (trackingNumber) {
                updateData.trackingNumber = trackingNumber;
            }

            if (notes) {
                updateData.notes = notes;
            }

            if (status === 'COMPLETED' || status === 'DELIVERED') {
                updateData.completedAt = new Date();
            }

            return await tx.purchase.update({
                where: { id: purchaseId },
                data: updateData,
                include: {
                    buyer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    },
                    seller: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    },
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
                        }
                    }
                },
            });
        });

        logAuditEvent({
            action: 'PURCHASE_STATUS_UPDATED',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'purchase',
            resourceId: purchaseId,
            timestamp: new Date(),
            details: {
                previousStatus: existingPurchase.status,
                newStatus: status,
                trackingNumber,
                notes,
            },
        });

        return createSuccessResponse(updatedPurchase, `Purchase status updated to ${status}`);

    } catch (error) {
        console.error('Update purchase error:', error);
        if (error instanceof Error) {
            return createErrorResponse(error.message, 400);
        }
        return createErrorResponse('Internal server error', 500);
    }
} 