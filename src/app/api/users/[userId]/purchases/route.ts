import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { PurchaseQuerySchema } from '@/types/schemas/user_extended_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';
import { withAuth } from '@/lib/auth';
import { Role } from '@prisma/client';

/**
 * Get user's purchase history with pagination and filtering
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @param params - The user ID
 * @returns JSON response with purchase history or error
 */
export const GET = withAuth(async (
    req,
    user,
    { params }: { params: Promise<{ userId: string }> }
) => {
    try {
        const { userId } = await params;
        const requestingUser = user;

        if (requestingUser.userId !== userId && requestingUser.role !== Role.ADMIN) {
            return createErrorResponse('Forbidden: You can only view your own purchase history', 403);
        }

        const url = new URL(req.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        const validationResult = PurchaseQuerySchema.safeParse(queryParams);

        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid query parameters',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { page, pageSize, status, startDate, endDate, sortBy, sortOrder } = validationResult.data;

        const ALLOWED_SORT_FIELDS = {
            'createdAt': 'createdAt',
            'price': 'price',
            'status': 'status'
        } as const;

        const safeSortBy = ALLOWED_SORT_FIELDS[sortBy as keyof typeof ALLOWED_SORT_FIELDS] || 'createdAt';

        const purchaseWhere: any = { buyerId: userId };
        if (status) purchaseWhere.status = status;
        if (startDate) purchaseWhere.createdAt = { ...purchaseWhere.createdAt, gte: startDate };
        if (endDate) purchaseWhere.createdAt = { ...purchaseWhere.createdAt, lte: endDate };

        const salesWhere: any = { sellerId: userId };
        if (status) salesWhere.status = status;
        if (startDate) salesWhere.createdAt = { ...salesWhere.createdAt, gte: startDate };
        if (endDate) salesWhere.createdAt = { ...salesWhere.createdAt, lte: endDate };

        const [purchases, sales, purchaseCount, salesCount] = await Promise.all([
            prisma.purchase.findMany({
                where: purchaseWhere,
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
                            imageUrl: true
                        }
                    },
                    seller: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { [safeSortBy]: sortOrder },
                skip: (page - 1) * Math.floor(pageSize / 2), 
                take: Math.floor(pageSize / 2),
            }),
            prisma.purchase.findMany({
                where: salesWhere,
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
                            imageUrl: true
                        }
                    },
                    buyer: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { [safeSortBy]: sortOrder },
                skip: (page - 1) * Math.floor(pageSize / 2),
                take: Math.ceil(pageSize / 2), 
            }),
            prisma.purchase.count({ where: purchaseWhere }),
            prisma.purchase.count({ where: salesWhere })
        ]);

        const allTransactions = [
            ...purchases.map(p => ({ ...p, type: 'purchase' as const })),
            ...sales.map(s => ({ ...s, type: 'sale' as const }))
        ].sort((a, b) => {
            if (safeSortBy === 'createdAt') {
                return sortOrder === 'desc' 
                    ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }
            if (safeSortBy === 'price') {
                return sortOrder === 'desc' ? b.price - a.price : a.price - b.price;
            }
            return 0;
        });

        const totalCount = purchaseCount + salesCount;
        const totalPages = Math.ceil(totalCount / pageSize);

        const summary = {
            totalPurchases: purchaseCount,
            totalSales: salesCount,
            totalSpent: purchases.reduce((sum, p) => sum + p.price, 0),
            totalEarned: sales.reduce((sum, s) => sum + s.price, 0),
            netAmount: sales.reduce((sum, s) => sum + s.price, 0) - purchases.reduce((sum, p) => sum + p.price, 0)
        };

        logAuditEvent({
            action: 'USER_PURCHASE_HISTORY_VIEWED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
            details: { page, pageSize, status }
        });

        return createSuccessResponse({
            transactions: allTransactions,
            summary,
            pagination: {
                page,
                pageSize,
                totalCount,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }, 'Purchase history retrieved successfully');

    } catch (error) {
        console.error('Get purchase history error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}); 