import prisma from '@/lib/prisma';
import { UserListQuerySchema, UserListQuery } from '@/types/schemas/user_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, createPaginationInfo } from '@/lib/api_utils';
import { Role } from '@prisma/client';
import { withAuth } from '@/lib/auth';

/**
 * This route is used to list all users. (AS ADMIN)
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @returns JSON response with success or error message
 */

export const GET = withAuth(async (req, user) => {
    try {
        const requestingUser = user;

        if (requestingUser.role !== Role.ADMIN) {
            logAuditEvent({
                action: 'UNAUTHORIZED_USER_LIST_ATTEMPT',
                userId: requestingUser.userId,
                ip: getClientIP(req.headers),
                userAgent: getUserAgent(req.headers),
                resource: 'users',
                timestamp: new Date(),
            });
            return createErrorResponse('Forbidden: Admin access required', 403);
        }

        const url = new URL(req.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());

        const validationResult = UserListQuerySchema.safeParse(queryParams);
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
            role, 
            emailVerified, 
            sortBy, 
            sortOrder 
        } = validationResult.data as UserListQuery;

        const where: any = {};
        
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
            ];
        }
        
        if (role) {
            where.role = role;
        }
        
        if (emailVerified !== undefined) {
            where.emailVerified = emailVerified;
        }

        const offset = (page - 1) * pageSize;

        const orderBy: any = {};
        orderBy[sortBy] = sortOrder;

        const total = await prisma.user.count({ where });

        const users = await prisma.user.findMany({
            where,
            skip: offset,
            take: pageSize,
            orderBy,
            select: {
                id: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                emailVerified: true,
                twoFactorEnabled: true,
                isSeller: true,
                sellerVerificationStatus: true,
                languagePreference: true,
                profileImageUrl: true,
            },
        });

        const pagination = createPaginationInfo(page, pageSize, total);

        logAuditEvent({
            action: 'USERS_LISTED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'users',
            timestamp: new Date(),
            details: { 
                page, 
                pageSize, 
                total, 
                search, 
                filters: { role, emailVerified } 
            },
        });

        return createSuccessResponse(
            { items: users, pagination },
            'Users retrieved successfully'
        );

    } catch (error) {
        console.error('List users error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}); 