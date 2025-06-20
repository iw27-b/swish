import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { QuickSearchSchema, QuickSearchQuery } from '@/types/schemas/search_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';
import { isRateLimitedForOperation, recordAttemptForOperation } from '@/lib/auth_utils';

/**
 * Quick search API for autocomplete and real-time suggestions
 * @param req AuthenticatedRequest - The authenticated request
 * @returns JSON response with quick search suggestions or error
 */
export async function GET(req: AuthenticatedRequest) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const clientIP = getClientIP(req.headers);

        recordAttemptForOperation(clientIP, 'search');
        if (isRateLimitedForOperation(clientIP, 'search')) {
            logAuditEvent({
                action: 'SEARCH_RATE_LIMITED',
                userId: req.user.userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'search',
                timestamp: new Date(),
            });
            return createErrorResponse('Too many search requests. Please try again later.', 429);
        }

        const url = new URL(req.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        
        const validationResult = QuickSearchSchema.safeParse(queryParams);
        if (!validationResult.success) {
            recordAttemptForOperation(clientIP, 'search');
            return createErrorResponse(
                'Invalid search parameters',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { query, limit, type } = validationResult.data as QuickSearchQuery;
        const requestingUser = req.user;

        const suggestions: Array<{
            text: string;
            type: 'card' | 'user' | 'team' | 'player' | 'brand';
            count?: number;
            imageUrl?: string;
        }> = [];

        if (type === 'all' || type === 'cards') {
            const cardSuggestions = await getCardSuggestions(query, Math.ceil(limit / 2));
            suggestions.push(...cardSuggestions);
        }

        if (type === 'all' || type === 'users') {
            const userSuggestions = await getUserSuggestions(query, Math.floor(limit / 2));
            suggestions.push(...userSuggestions);
        }

        if (type === 'all' || type === 'suggestions') {
            const generalSuggestions = await getGeneralSuggestions(query, limit);
            suggestions.push(...generalSuggestions);
        }

        const sortedSuggestions = suggestions
            .sort((a, b) => (b.count || 0) - (a.count || 0))
            .slice(0, limit);

        logAuditEvent({
            action: 'QUICK_SEARCH_PERFORMED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'search',
            timestamp: new Date(),
            details: { 
                query, 
                type, 
                suggestionCount: sortedSuggestions.length 
            }
        });

        return createSuccessResponse({
            suggestions: sortedSuggestions
        }, 'Quick search completed successfully');

    } catch (error) {
        console.error('Quick search error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * Get card-based suggestions
 * @param query - The search query
 * @param limit - The maximum number of suggestions to return
 * @returns An array of card suggestions
 */
async function getCardSuggestions(query: string, limit: number) {
    const cards = await prisma.card.findMany({
        where: {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { player: { contains: query, mode: 'insensitive' } },
                { cardNumber: { contains: query, mode: 'insensitive' } }
            ]
        },
        select: {
            name: true,
            player: true,
            imageUrl: true
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
    });

    return cards.map(card => ({
        text: `${card.name} - ${card.player}`,
        type: 'card' as const,
        imageUrl: card.imageUrl || undefined
    }));
}

/**
 * Get user-based suggestions
 * @param query - The search query
 * @param limit - The maximum number of suggestions to return
 * @returns An array of user suggestions
 */
async function getUserSuggestions(query: string, limit: number) {
    const users = await prisma.user.findMany({
        where: {
            AND: [
                { emailVerified: true },
                {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { email: { contains: query, mode: 'insensitive' } }
                    ]
                }
            ]
        },
        select: {
            name: true,
            email: true,
            profileImageUrl: true,
            _count: {
                select: {
                    followers: true
                }
            }
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
    });

    return users.map(user => ({
        text: user.name || user.email,
        type: 'user' as const,
        count: user._count.followers,
        imageUrl: user.profileImageUrl || undefined
    }));
}

/**
 * Get general suggestions (teams, players, brands)
 * @param query - The search query
 * @param limit - The maximum number of suggestions to return
 * @returns An array of general suggestions
 */
async function getGeneralSuggestions(query: string, limit: number) {
    const suggestions: Array<{
        text: string;
        type: 'team' | 'player' | 'brand';
        count: number;
    }> = [];

    const teamSuggestions = await prisma.card.groupBy({
        by: ['team'],
        where: {
            team: { contains: query, mode: 'insensitive' }
        },
        _count: {
            team: true
        },
        orderBy: {
            _count: {
                team: 'desc'
            }
        },
        take: Math.ceil(limit / 3)
    });

    suggestions.push(...teamSuggestions.map(t => ({
        text: t.team,
        type: 'team' as const,
        count: t._count.team
    })));

    const playerSuggestions = await prisma.card.groupBy({
        by: ['player'],
        where: {
            player: { contains: query, mode: 'insensitive' }
        },
        _count: {
            player: true
        },
        orderBy: {
            _count: {
                player: 'desc'
            }
        },
        take: Math.ceil(limit / 3)
    });

    suggestions.push(...playerSuggestions.map(p => ({
        text: p.player,
        type: 'player' as const,
        count: p._count.player
    })));

    const brandSuggestions = await prisma.card.groupBy({
        by: ['brand'],
        where: {
            brand: { contains: query, mode: 'insensitive' }
        },
        _count: {
            brand: true
        },
        orderBy: {
            _count: {
                brand: 'desc'
            }
        },
        take: Math.floor(limit / 3)
    });

    suggestions.push(...brandSuggestions.map(b => ({
        text: b.brand,
        type: 'brand' as const,
        count: b._count.brand
    })));

    return suggestions;
} 