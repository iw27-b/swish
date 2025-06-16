import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest } from '@/types';
import { SearchQuerySchema, SearchQuery, CardSearchResult, UserSearchResult } from '@/types/schemas/search_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';

/**
 * Comprehensive search API for cards and users with fuzzy matching and filtering
 * @param req AuthenticatedRequest - The authenticated request
 * @returns JSON response with search results or error
 */
export async function GET(req: AuthenticatedRequest) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const url = new URL(req.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        
        // Parse complex filter objects from query string
        if (queryParams.cardFilters && typeof queryParams.cardFilters === 'string') {
            try {
                queryParams.cardFilters = JSON.parse(queryParams.cardFilters);
            } catch {
                delete queryParams.cardFilters;
            }
        }
        
        if (queryParams.userFilters && typeof queryParams.userFilters === 'string') {
            try {
                queryParams.userFilters = JSON.parse(queryParams.userFilters);
            } catch {
                delete queryParams.userFilters;
            }
        }

        const validationResult = SearchQuerySchema.safeParse(queryParams);
        if (!validationResult.success) {
            return createErrorResponse(
                'Invalid search parameters',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const searchParams = validationResult.data as SearchQuery;
        const { 
            query, 
            type, 
            page, 
            pageSize, 
            sortBy, 
            sortOrder, 
            cardFilters, 
            userFilters, 
            exactMatch,
            includeInactive 
        } = searchParams;

        const requestingUser = req.user;
        let cardResults: CardSearchResult[] = [];
        let userResults: UserSearchResult[] = [];
        let totalCards = 0;
        let totalUsers = 0;

        // Search cards if requested
        if (type === 'all' || type === 'cards') {
            const cardSearchResults = await searchCards(
                query, 
                cardFilters, 
                page, 
                pageSize, 
                sortBy, 
                sortOrder, 
                exactMatch,
                requestingUser.userId
            );
            cardResults = cardSearchResults.results;
            totalCards = cardSearchResults.total;
        }

        // Search users if requested
        if (type === 'all' || type === 'users') {
            const userSearchResults = await searchUsers(
                query, 
                userFilters, 
                page, 
                pageSize, 
                sortBy, 
                sortOrder, 
                exactMatch,
                includeInactive,
                requestingUser.userId
            );
            userResults = userSearchResults.results;
            totalUsers = userSearchResults.total;
        }

        // Calculate pagination for combined results
        const totalResults = totalCards + totalUsers;
        const totalPages = Math.ceil(totalResults / pageSize);

        // Get filter suggestions based on current results
        const filterSuggestions = await getFilterSuggestions(query, cardResults, userResults);

        // Generate search suggestions for typos/similar terms
        const searchSuggestions = await generateSearchSuggestions(query, cardResults, userResults);

        logAuditEvent({
            action: 'SEARCH_PERFORMED',
            userId: requestingUser.userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'search',
            timestamp: new Date(),
            details: { 
                query, 
                type, 
                cardCount: cardResults.length, 
                userCount: userResults.length,
                hasFilters: !!(cardFilters || userFilters)
            }
        });

        return createSuccessResponse({
            query,
            type,
            results: {
                cards: cardResults,
                users: userResults
            },
            counts: {
                totalCards,
                totalUsers,
                total: totalResults
            },
            pagination: {
                page,
                pageSize,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            suggestions: searchSuggestions,
            filters: filterSuggestions
        }, 'Search completed successfully');

    } catch (error) {
        console.error('Search error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

/**
 * Search cards with fuzzy matching and filtering
 */
async function searchCards(
    query: string,
    filters: any,
    page: number,
    pageSize: number,
    sortBy: string,
    sortOrder: string,
    exactMatch: boolean,
    requestingUserId: string
): Promise<{ results: CardSearchResult[], total: number }> {
    
    const searchMode = exactMatch ? 'default' : 'insensitive';
    const searchOperator = exactMatch ? 'equals' : 'contains';
    
    // Build where clause for fuzzy search
    const where: any = {
        OR: [
            { name: { [searchOperator]: query, mode: searchMode } },
            { player: { [searchOperator]: query, mode: searchMode } },
            { team: { [searchOperator]: query, mode: searchMode } },
            { brand: { [searchOperator]: query, mode: searchMode } },
            { cardNumber: { [searchOperator]: query, mode: searchMode } },
            { description: { [searchOperator]: query, mode: searchMode } }
        ]
    };

    // Apply filters
    if (filters) {
        if (filters.teams?.length) {
            where.team = { in: filters.teams };
        }
        if (filters.players?.length) {
            where.player = { in: filters.players };
        }
        if (filters.brands?.length) {
            where.brand = { in: filters.brands };
        }
        if (filters.years?.length) {
            where.year = { in: filters.years };
        }
        if (filters.conditions?.length) {
            where.condition = { in: filters.conditions };
        }
        if (filters.rarities?.length) {
            where.rarity = { in: filters.rarities };
        }
        if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
            where.price = {};
            if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
            if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
        }
        if (filters.isForSale !== undefined) {
            where.isForSale = filters.isForSale;
        }
        if (filters.isForTrade !== undefined) {
            where.isForTrade = filters.isForTrade;
        }
        if (filters.ownerId) {
            where.ownerId = filters.ownerId;
        }
    }

    // Build order by clause
    let orderBy: any = {};
    if (sortBy === 'relevance') {
        // For relevance, we'll sort by multiple factors
        orderBy = [
            { name: sortOrder },
            { createdAt: 'desc' }
        ];
    } else if (sortBy === 'name') {
        orderBy = { name: sortOrder };
    } else if (sortBy === 'price') {
        orderBy = { price: sortOrder };
    } else {
        orderBy = { [sortBy]: sortOrder };
    }

    const [cards, total] = await Promise.all([
        prisma.card.findMany({
            where,
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profileImageUrl: true,
                        isSeller: true
                    }
                }
            },
            orderBy,
            skip: (page - 1) * Math.floor(pageSize / 2), // Split pageSize between cards and users
            take: Math.floor(pageSize / 2),
        }),
        prisma.card.count({ where })
    ]);

    // Calculate relevance scores and matched fields
    const results: CardSearchResult[] = cards.map(card => {
        const matchedFields: string[] = [];
        let relevanceScore = 0;

        // Calculate relevance based on field matches
        const queryLower = query.toLowerCase();
        if (card.name.toLowerCase().includes(queryLower)) {
            matchedFields.push('name');
            relevanceScore += card.name.toLowerCase() === queryLower ? 10 : 5;
        }
        if (card.player.toLowerCase().includes(queryLower)) {
            matchedFields.push('player');
            relevanceScore += card.player.toLowerCase() === queryLower ? 8 : 4;
        }
        if (card.team.toLowerCase().includes(queryLower)) {
            matchedFields.push('team');
            relevanceScore += 3;
        }
        if (card.brand.toLowerCase().includes(queryLower)) {
            matchedFields.push('brand');
            relevanceScore += 2;
        }
        if (card.cardNumber.toLowerCase().includes(queryLower)) {
            matchedFields.push('cardNumber');
            relevanceScore += 6;
        }
        if (card.description?.toLowerCase().includes(queryLower)) {
            matchedFields.push('description');
            relevanceScore += 1;
        }

        return {
            ...card,
            relevanceScore,
            matchedFields
        };
    });

    return { results, total };
}

/**
 * Search users with fuzzy matching and filtering
 */
async function searchUsers(
    query: string,
    filters: any,
    page: number,
    pageSize: number,
    sortBy: string,
    sortOrder: string,
    exactMatch: boolean,
    includeInactive: boolean,
    requestingUserId: string
): Promise<{ results: UserSearchResult[], total: number }> {
    
    const searchMode = exactMatch ? 'default' : 'insensitive';
    const searchOperator = exactMatch ? 'equals' : 'contains';
    
    // Build where clause for fuzzy search
    const where: any = {
        OR: [
            { name: { [searchOperator]: query, mode: searchMode } },
            { email: { [searchOperator]: query, mode: searchMode } },
            { bio: { [searchOperator]: query, mode: searchMode } }
        ]
    };

    // Exclude inactive users unless specifically requested
    if (!includeInactive) {
        where.emailVerified = true;
    }

    // Apply filters
    if (filters) {
        if (filters.roles?.length) {
            where.role = { in: filters.roles };
        }
        if (filters.isSeller !== undefined) {
            where.isSeller = filters.isSeller;
        }
        if (filters.emailVerified !== undefined) {
            where.emailVerified = filters.emailVerified;
        }
        if (filters.languagePreference) {
            where.languagePreference = filters.languagePreference;
        }
        if (filters.hasCollections) {
            where.collections = { some: {} };
        }
    }

    // Build order by clause
    let orderBy: any = {};
    if (sortBy === 'relevance') {
        orderBy = [
            { name: sortOrder },
            { createdAt: 'desc' }
        ];
    } else if (sortBy === 'name') {
        orderBy = { name: sortOrder };
    } else {
        orderBy = { [sortBy]: sortOrder };
    }

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                profileImageUrl: true,
                bio: true,
                isSeller: true,
                emailVerified: true,
                languagePreference: true,
                createdAt: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                        collections: true,
                        cards: true
                    }
                }
            },
            orderBy,
            skip: (page - 1) * Math.ceil(pageSize / 2), // Give remainder to users
            take: Math.ceil(pageSize / 2),
        }),
        prisma.user.count({ where })
    ]);

    // Apply follower count filters (post-query since Prisma doesn't support count filters directly)
    let filteredUsers = users;
    if (filters?.minFollowers !== undefined || filters?.maxFollowers !== undefined) {
        filteredUsers = users.filter(user => {
            const followerCount = user._count.followers;
            if (filters.minFollowers !== undefined && followerCount < filters.minFollowers) return false;
            if (filters.maxFollowers !== undefined && followerCount > filters.maxFollowers) return false;
            return true;
        });
    }

    // Calculate relevance scores and matched fields
    const results: UserSearchResult[] = filteredUsers.map(user => {
        const matchedFields: string[] = [];
        let relevanceScore = 0;

        const queryLower = query.toLowerCase();
        if (user.name?.toLowerCase().includes(queryLower)) {
            matchedFields.push('name');
            relevanceScore += user.name.toLowerCase() === queryLower ? 10 : 5;
        }
        if (user.email.toLowerCase().includes(queryLower)) {
            matchedFields.push('email');
            relevanceScore += user.email.toLowerCase() === queryLower ? 8 : 4;
        }
        if (user.bio?.toLowerCase().includes(queryLower)) {
            matchedFields.push('bio');
            relevanceScore += 2;
        }

        return {
            ...user,
            stats: {
                followers: user._count.followers,
                following: user._count.following,
                collections: user._count.collections,
                cards: user._count.cards
            },
            relevanceScore,
            matchedFields
        };
    });

    return { results, total: filteredUsers.length };
}

/**
 * Generate filter suggestions based on search results
 */
async function getFilterSuggestions(query: string, cardResults: CardSearchResult[], userResults: UserSearchResult[]) {
    const suggestions: any = {};

    if (cardResults.length > 0) {
        // Get unique teams, players, brands from results
        suggestions.availableTeams = [...new Set(cardResults.map(c => c.team))].slice(0, 10);
        suggestions.availablePlayers = [...new Set(cardResults.map(c => c.player))].slice(0, 10);
        suggestions.availableBrands = [...new Set(cardResults.map(c => c.brand))].slice(0, 10);
        
        // Get price range
        const prices = cardResults.filter(c => c.price !== null).map(c => c.price!);
        if (prices.length > 0) {
            suggestions.priceRange = {
                min: Math.min(...prices),
                max: Math.max(...prices)
            };
        }
    }

    return suggestions;
}

/**
 * Generate search suggestions for typos and similar terms
 */
async function generateSearchSuggestions(query: string, cardResults: CardSearchResult[], userResults: UserSearchResult[]): Promise<string[]> {
    const suggestions: string[] = [];
    
    // If we have few results, suggest similar terms
    if (cardResults.length + userResults.length < 5) {
        // Get popular teams, players, brands that are similar to the query
        const similarTerms = await prisma.$queryRaw<Array<{term: string, count: number}>>`
            SELECT term, count FROM (
                SELECT team as term, COUNT(*) as count FROM "Card" 
                WHERE team ILIKE ${'%' + query + '%'} 
                GROUP BY team
                UNION ALL
                SELECT player as term, COUNT(*) as count FROM "Card" 
                WHERE player ILIKE ${'%' + query + '%'} 
                GROUP BY player
                UNION ALL
                SELECT brand as term, COUNT(*) as count FROM "Card" 
                WHERE brand ILIKE ${'%' + query + '%'} 
                GROUP BY brand
            ) combined
            ORDER BY count DESC
            LIMIT 5
        `;
        
        suggestions.push(...similarTerms.map(t => t.term));
    }
    
    return suggestions;
} 