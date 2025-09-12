import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { SearchQuerySchema, SearchQuery, CardSearchResult, UserSearchResult } from '@/types/schemas/search_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';

/**
 * Comprehensive search API for cards and users with fuzzy matching and filtering
 * @param req NextRequest - The request (public endpoint)
 * @returns JSON response with search results or error
 */
export async function GET(req: NextRequest) {
    try {

        const url = new URL(req.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        
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

        let cardResults: CardSearchResult[] = [];
        let userResults: UserSearchResult[] = [];
        let totalCards = 0;
        let totalUsers = 0;

        if (type === 'all' || type === 'cards') {
            const cardSearchResults = await searchCards(
                query, 
                cardFilters, 
                page, 
                pageSize, 
                sortBy, 
                sortOrder, 
                exactMatch
            );
            cardResults = cardSearchResults.results;
            totalCards = cardSearchResults.total;
        }

        if (type === 'all' || type === 'users') {
            const userSearchResults = await searchUsers(
                query, 
                userFilters, 
                page, 
                pageSize, 
                sortBy, 
                sortOrder, 
                exactMatch,
                includeInactive
            );
            userResults = userSearchResults.results;
            totalUsers = userSearchResults.total;
        }

        const totalResults = totalCards + totalUsers;
        const totalPages = Math.ceil(totalResults / pageSize);

        const filterSuggestions = await getFilterSuggestions(query, cardResults, userResults);

        const searchSuggestions = await generateSearchSuggestions(query, cardResults, userResults);

        logAuditEvent({
            action: 'SEARCH_PERFORMED',
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
 * @param query - The search query
 * @param filters - The filters to apply to the search
 * @param page - The page number
 * @param pageSize - The number of results per page
 * @param sortBy - The field to sort by
 * @param sortOrder - The order to sort in
 * @param exactMatch - Whether to use exact matching
 * @returns An object containing the search results and total count
 */
async function searchCards(
    query: string,
    filters: any,
    page: number,
    pageSize: number,
    sortBy: string,
    sortOrder: string,
    exactMatch: boolean
): Promise<{ results: CardSearchResult[], total: number }> {
    
    const searchMode = exactMatch ? 'default' : 'insensitive';
    const searchOperator = exactMatch ? 'equals' : 'contains';
    
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

    let orderBy: any = {};
    if (sortBy === 'relevance') {
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

    const results: CardSearchResult[] = cards.map(card => {
        const matchedFields: string[] = [];
        let relevanceScore = 0;

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
 * @param query - The search query
 * @param filters - The filters to apply to the search
 * @param page - The page number
 * @param pageSize - The number of results per page
 * @param sortBy - The field to sort by
 * @param sortOrder - The order to sort in
 * @param exactMatch - Whether to use exact matching
 * @param includeInactive - Whether to include inactive users
 * @returns An object containing the search results and total count
 */
async function searchUsers(
    query: string,
    filters: any,
    page: number,
    pageSize: number,
    sortBy: string,
    sortOrder: string,
    exactMatch: boolean,
    includeInactive: boolean
): Promise<{ results: UserSearchResult[], total: number }> {
    
    const searchMode = exactMatch ? 'default' : 'insensitive';
    const searchOperator = exactMatch ? 'equals' : 'contains';
    
    const where: any = {
        OR: [
            { name: { [searchOperator]: query, mode: searchMode } },
            { email: { [searchOperator]: query, mode: searchMode } },
            { bio: { [searchOperator]: query, mode: searchMode } }
        ]
    };

    if (!includeInactive) {
        where.emailVerified = true;
    }

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

    let filteredUsers = users;
    if (filters?.minFollowers !== undefined || filters?.maxFollowers !== undefined) {
        filteredUsers = users.filter(user => {
            const followerCount = user._count.followers;
            if (filters.minFollowers !== undefined && followerCount < filters.minFollowers) return false;
            if (filters.maxFollowers !== undefined && followerCount > filters.maxFollowers) return false;
            return true;
        });
    }

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
 * @param query - The search query
 * @param cardResults - The search results for cards
 * @param userResults - The search results for users
 * @returns An object containing the filter suggestions
 */
async function getFilterSuggestions(query: string, cardResults: CardSearchResult[], userResults: UserSearchResult[]) {
    const suggestions: any = {};

    if (cardResults.length > 0) {
        suggestions.availableTeams = [...new Set(cardResults.map(c => c.team))].slice(0, 10);
        suggestions.availablePlayers = [...new Set(cardResults.map(c => c.player))].slice(0, 10);
        suggestions.availableBrands = [...new Set(cardResults.map(c => c.brand))].slice(0, 10);
        
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
 * @param query - The search query
 * @param cardResults - The search results for cards
 * @param userResults - The search results for users
 * @returns An array of search suggestions
 */
async function generateSearchSuggestions(query: string, cardResults: CardSearchResult[], userResults: UserSearchResult[]): Promise<string[]> {
    const suggestions: string[] = [];
    
    if (cardResults.length + userResults.length < 5) {
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