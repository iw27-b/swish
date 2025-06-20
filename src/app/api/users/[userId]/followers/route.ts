import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { FollowUserSchema, FollowUserRequestBody, FollowQuerySchema } from '@/types/schemas/user_extended_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { Role } from '@prisma/client';

/**
 * Get user's followers with pagination
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The user ID
 * @returns JSON response with followers list or error
 */
export async function GET(
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = await params;
        const requestingUser = req.user;

        const url = new URL(req.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        const validationResult = FollowQuerySchema.safeParse(queryParams);

        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid query parameters',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { page, pageSize, search } = validationResult.data;

        const where: any = { followingId: userId };
        
        if (search) {
            where.follower = {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } }
                ]
            };
        }

        const [followers, totalCount] = await Promise.all([
            prisma.userFollow.findMany({
                where,
                include: {
                    follower: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            profileImageUrl: true,
                            bio: true,
                            _count: {
                                select: {
                                    followers: true,
                                    following: true,
                                    collections: true
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.userFollow.count({ where })
        ]);

        const totalPages = Math.ceil(totalCount / pageSize);
        const followerIds = followers.map(f => f.followerId);
        const mutualFollows = requestingUser.userId !== userId ? await prisma.userFollow.findMany({
            where: {
                followerId: requestingUser.userId,
                followingId: { in: followerIds }
            },
            select: { followingId: true }
        }) : [];

        const mutualFollowIds = new Set(mutualFollows.map(f => f.followingId));

        const followersWithMutualInfo = followers.map(follow => ({
            ...follow,
            follower: {
                ...follow.follower,
                isFollowedByRequester: mutualFollowIds.has(follow.followerId)
            }
        }));

        logAuditEvent({
            action: 'USER_FOLLOWERS_VIEWED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
            details: { page, pageSize }
        });

        return createSuccessResponse({
            followers: followersWithMutualInfo,
            pagination: {
                page,
                pageSize,
                totalCount,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        }, 'Followers retrieved successfully');

    } catch (error) {
        console.error('Get followers error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * Follow a user
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The user ID to follow
 * @returns JSON response with success message or error
 */
export async function POST(
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = await params;
        const requestingUser = req.user;

        if (requestingUser.userId === userId) {
            return createErrorResponse('You cannot follow yourself', 400);
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true }
        });

        if (!targetUser) {
            return createErrorResponse('User not found', 404);
        }

        const existingFollow = await prisma.userFollow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: requestingUser.userId,
                    followingId: userId
                }
            }
        });

        if (existingFollow) {
            return createErrorResponse('You are already following this user', 409);
        }

        const follow = await prisma.userFollow.create({
            data: {
                followerId: requestingUser.userId,
                followingId: userId
            },
            include: {
                following: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profileImageUrl: true
                    }
                }
            }
        });

        logAuditEvent({
            action: 'USER_FOLLOWED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
        });

        return createSuccessResponse(follow, 'User followed successfully');

    } catch (error) {
        console.error('Follow user error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * Unfollow a user
 * @param req AuthenticatedRequest - The authenticated request
 * @param params - The user ID to unfollow
 * @returns JSON response with success message or error
 */
export async function DELETE(
    req: AuthenticatedRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = await params;
        const requestingUser = req.user;

        const existingFollow = await prisma.userFollow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: requestingUser.userId,
                    followingId: userId
                }
            }
        });

        if (!existingFollow) {
            return createErrorResponse('You are not following this user', 404);
        }

        await prisma.userFollow.delete({
            where: {
                followerId_followingId: {
                    followerId: requestingUser.userId,
                    followingId: userId
                }
            }
        });

        logAuditEvent({
            action: 'USER_UNFOLLOWED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'user',
            resourceId: userId,
            timestamp: new Date(),
        });

        return createSuccessResponse(null, 'User unfollowed successfully');

    } catch (error) {
        console.error('Unfollow user error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 