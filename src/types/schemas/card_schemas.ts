import { z } from 'zod';

export const CreateCardSchema = z.object({
    name: z.string()
        .min(1, { message: 'Card name is required' })
        .max(100, { message: 'Card name must be less than 100 characters' }),
    player: z.string()
        .min(1, { message: 'Player name is required' })
        .max(50, { message: 'Player name must be less than 50 characters' }),
    team: z.string()
        .min(1, { message: 'Team is required' })
        .max(30, { message: 'Team must be less than 30 characters' }),
    year: z.number()
        .int()
        .min(1950, { message: 'Year must be 1950 or later' })
        .max(new Date().getFullYear(), { message: 'Year cannot be in the future' }),
    brand: z.string()
        .min(1, { message: 'Brand is required' })
        .max(30, { message: 'Brand must be less than 30 characters' }),
    cardNumber: z.string()
        .min(1, { message: 'Card number is required' })
        .max(20, { message: 'Card number must be less than 20 characters' }),
    condition: z.enum(['POOR', 'FAIR', 'GOOD', 'VERY_GOOD', 'EXCELLENT', 'NEAR_MINT', 'MINT']),
    rarity: z.enum(['COMMON', 'UNCOMMON', 'RARE', 'ULTRA_RARE', 'LEGENDARY']),
    description: z.string()
        .max(500, { message: 'Description must be less than 500 characters' })
        .optional(),
    imageUrl: z.string()
        .url({ message: 'Invalid image URL' })
        .optional(),
    isForTrade: z.boolean().default(false),
    isForSale: z.boolean().default(false),
    price: z.number()
        .min(0, { message: 'Price must be non-negative' })
        .optional(),
});

export type CreateCardRequestBody = z.infer<typeof CreateCardSchema>;

export const UpdateCardSchema = CreateCardSchema.partial();
export type UpdateCardRequestBody = z.infer<typeof UpdateCardSchema>;

export const CardListQuerySchema = z.object({
    page: z.coerce.number().min(1).optional().default(1),
    pageSize: z.coerce.number().min(1).max(100).optional().default(10),
    search: z.string().max(100).optional(),
    player: z.string().max(50).optional(),
    team: z.string().max(30).optional(),
    brand: z.string().max(30).optional(),
    year: z.coerce.number().int().min(1950).max(new Date().getFullYear()).optional(),
    condition: z.enum(['POOR', 'FAIR', 'GOOD', 'VERY_GOOD', 'EXCELLENT', 'NEAR_MINT', 'MINT']).optional(),
    rarity: z.enum(['COMMON', 'UNCOMMON', 'RARE', 'ULTRA_RARE', 'LEGENDARY']).optional(),
    isForTrade: z.coerce.boolean().optional(),
    isForSale: z.coerce.boolean().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sortBy: z.enum(['createdAt', 'name', 'player', 'year', 'price']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CardListQuery = z.infer<typeof CardListQuerySchema>;

export const CreateTradeSchema = z.object({
    offeredCardIds: z.array(z.string().uuid())
        .min(1, { message: 'At least one card must be offered' })
        .max(10, { message: 'Cannot offer more than 10 cards' }),
    requestedCardIds: z.array(z.string().uuid())
        .min(1, { message: 'At least one card must be requested' })
        .max(10, { message: 'Cannot request more than 10 cards' }),
    recipientUserId: z.string().uuid({ message: 'Valid recipient user ID is required' }),
    message: z.string()
        .max(500, { message: 'Message must be less than 500 characters' })
        .optional(),
});

export type CreateTradeRequestBody = z.infer<typeof CreateTradeSchema>;

export const UpdateTradeSchema = z.object({
    status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED']),
    responseMessage: z.string()
        .max(500, { message: 'Response message must be less than 500 characters' })
        .optional(),
});

export type UpdateTradeRequestBody = z.infer<typeof UpdateTradeSchema>;

export const TradeListQuerySchema = z.object({
    page: z.coerce.number().min(1).optional().default(1),
    pageSize: z.coerce.number().min(1).max(100).optional().default(10),
    status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED']).optional(),
    type: z.enum(['sent', 'received']).optional(), // Filter by trades sent or received
    sortBy: z.enum(['createdAt', 'status']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type TradeListQuery = z.infer<typeof TradeListQuerySchema>;

export const CreateCollectionSchema = z.object({
    name: z.string()
        .min(1, { message: 'Collection name is required' })
        .max(100, { message: 'Collection name must be less than 100 characters' }),
    description: z.string()
        .max(500, { message: 'Description must be less than 500 characters' })
        .optional(),
    isPublic: z.boolean().default(false),
    cardIds: z.array(z.string().uuid()).optional(),
});

export type CreateCollectionRequestBody = z.infer<typeof CreateCollectionSchema>;

export const UpdateCollectionSchema = CreateCollectionSchema.partial();
export type UpdateCollectionRequestBody = z.infer<typeof UpdateCollectionSchema>;

export const CollectionListQuerySchema = z.object({
    page: z.coerce.number().min(1).optional().default(1),
    pageSize: z.coerce.number().min(1).max(100).optional().default(10),
    search: z.string().max(100).optional(),
    isPublic: z.coerce.boolean().optional(),
    userId: z.string().uuid().optional(), // For viewing other users' public collections
    sortBy: z.enum(['createdAt', 'name']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CollectionListQuery = z.infer<typeof CollectionListQuerySchema>; 