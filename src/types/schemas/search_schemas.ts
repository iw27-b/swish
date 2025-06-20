import { z } from 'zod';
import { CardCondition, CardRarity, Role } from '@prisma/client';

export const SearchQuerySchema = z.object({
    query: z.string().min(1, { message: 'Search query is required' }).max(200),
    type: z.enum(['all', 'cards', 'users']).default('all'),
    
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(50).default(20),
    
    sortBy: z.enum(['relevance', 'name', 'price', 'createdAt', 'updatedAt']).default('relevance'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    
    cardFilters: z.object({
        teams: z.array(z.string()).optional(),
        players: z.array(z.string()).optional(),
        brands: z.array(z.string()).optional(),
        years: z.array(z.coerce.number().min(1800).max(2100)).optional(),
        conditions: z.array(z.nativeEnum(CardCondition)).optional(),
        rarities: z.array(z.nativeEnum(CardRarity)).optional(),
        minPrice: z.coerce.number().min(0).optional(),
        maxPrice: z.coerce.number().min(0).optional(),
        isForSale: z.coerce.boolean().optional(),
        isForTrade: z.coerce.boolean().optional(),
        ownerId: z.string().cuid().optional(), // Search cards by specific owner
    }).optional(),
    
    userFilters: z.object({
        roles: z.array(z.nativeEnum(Role)).optional(),
        isSeller: z.coerce.boolean().optional(),
        emailVerified: z.coerce.boolean().optional(),
        hasCollections: z.coerce.boolean().optional(),
        minFollowers: z.coerce.number().min(0).optional(),
        maxFollowers: z.coerce.number().min(0).optional(),
        languagePreference: z.enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh']).optional(),
    }).optional(),
    
    exactMatch: z.coerce.boolean().default(false), 
    includeInactive: z.coerce.boolean().default(false), 
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const CardSearchResultSchema = z.object({
    id: z.string(),
    name: z.string(),
    player: z.string(),
    team: z.string(),
    year: z.number(),
    brand: z.string(),
    cardNumber: z.string(),
    condition: z.nativeEnum(CardCondition),
    rarity: z.nativeEnum(CardRarity),
    description: z.string().nullable(),
    imageUrl: z.string().nullable(),
    isForTrade: z.boolean(),
    isForSale: z.boolean(),
    price: z.number().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    owner: z.object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string(),
        profileImageUrl: z.string().nullable(),
        isSeller: z.boolean().nullable(),
    }),
    relevanceScore: z.number().optional(),
    matchedFields: z.array(z.string()).optional(),
});

export type CardSearchResult = z.infer<typeof CardSearchResultSchema>;

export const UserSearchResultSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    role: z.nativeEnum(Role),
    profileImageUrl: z.string().nullable(),
    bio: z.string().nullable(),
    isSeller: z.boolean().nullable(),
    emailVerified: z.boolean().nullable(),
    languagePreference: z.string().nullable(),
    createdAt: z.date(),
    // Social stats
    stats: z.object({
        followers: z.number(),
        following: z.number(),
        collections: z.number(),
        cards: z.number(),
    }),
    relevanceScore: z.number().optional(),
    matchedFields: z.array(z.string()).optional(),
});

export type UserSearchResult = z.infer<typeof UserSearchResultSchema>;

export const SearchResultsSchema = z.object({
    query: z.string(),
    type: z.enum(['all', 'cards', 'users']),
    results: z.object({
        cards: z.array(CardSearchResultSchema),
        users: z.array(UserSearchResultSchema),
    }),
    counts: z.object({
        totalCards: z.number(),
        totalUsers: z.number(),
        total: z.number(),
    }),
    pagination: z.object({
        page: z.number(),
        pageSize: z.number(),
        totalPages: z.number(),
        hasNext: z.boolean(),
        hasPrev: z.boolean(),
    }),
    suggestions: z.array(z.string()).optional(), // Search suggestions for typos/similar terms
    filters: z.object({
        availableTeams: z.array(z.string()).optional(),
        availablePlayers: z.array(z.string()).optional(),
        availableBrands: z.array(z.string()).optional(),
        priceRange: z.object({
            min: z.number(),
            max: z.number(),
        }).optional(),
    }).optional(),
});

export type SearchResults = z.infer<typeof SearchResultsSchema>;

// Quick search schema for autocomplete/suggestions
export const QuickSearchSchema = z.object({
    query: z.string().min(1).max(100),
    limit: z.coerce.number().min(1).max(20).default(10),
    type: z.enum(['all', 'cards', 'users', 'suggestions']).default('all'),
});

export type QuickSearchQuery = z.infer<typeof QuickSearchSchema>;

export const QuickSearchResultSchema = z.object({
    suggestions: z.array(z.object({
        text: z.string(),
        type: z.enum(['card', 'user', 'team', 'player', 'brand']),
        count: z.number().optional(),
        imageUrl: z.string().optional(),
    })),
});

export type QuickSearchResult = z.infer<typeof QuickSearchResultSchema>; 