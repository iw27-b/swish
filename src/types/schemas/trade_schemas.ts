import { z } from 'zod';

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
    expiresInDays: z.number()
        .int()
        .min(1)
        .max(30)
        .optional()
        .default(7), // Default 7 days expiration
}).refine((data) => {
    const offeredSet = new Set(data.offeredCardIds);
    const requestedSet = new Set(data.requestedCardIds);
    const intersection = [...offeredSet].filter(id => requestedSet.has(id));
    return intersection.length === 0;
}, {
    message: 'A card cannot be both offered and requested in the same trade',
    path: ['requestedCardIds'],
});

export type CreateTradeRequestBody = z.infer<typeof CreateTradeSchema>;

export const UpdateTradeSchema = z.object({
    status: z.enum(['ACCEPTED', 'REJECTED', 'CANCELLED']),
    responseMessage: z.string()
        .max(500, { message: 'Response message must be less than 500 characters' })
        .optional(),
});

export type UpdateTradeRequestBody = z.infer<typeof UpdateTradeSchema>;

export const TradeListQuerySchema = z.object({
    page: z.coerce.number().min(1).optional().default(1),
    pageSize: z.coerce.number().min(1).max(100).optional().default(10),
    status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'EXPIRED']).optional(),
    type: z.enum(['sent', 'received']).optional(), 
    sortBy: z.enum(['createdAt', 'status']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type TradeListQuery = z.infer<typeof TradeListQuerySchema>;

export const CreatePurchaseSchema = z.object({
    cardId: z.string().uuid({ message: 'Valid card ID is required' }),
    paymentMethodId: z.string()
        .min(1, { message: 'Payment method is required' })
        .max(50, { message: 'Payment method ID too long' }),
    shippingAddress: z.object({
        name: z.string().min(1).max(100),
        streetAddress: z.string().min(1).max(200),
        city: z.string().min(1).max(100),
        state: z.string().min(1).max(100),
        postalCode: z.string().min(1).max(20),
        country: z.string().min(1).max(100),
    }),
    notes: z.string()
        .max(500, { message: 'Notes must be less than 500 characters' })
        .optional(),
});

export type CreatePurchaseRequestBody = z.infer<typeof CreatePurchaseSchema>;

export const UpdatePurchaseSchema = z.object({
    status: z.enum(['PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED']),
    trackingNumber: z.string()
        .max(100, { message: 'Tracking number too long' })
        .optional(),
    notes: z.string()
        .max(500, { message: 'Notes must be less than 500 characters' })
        .optional(),
});

export type UpdatePurchaseRequestBody = z.infer<typeof UpdatePurchaseSchema>;

export const CardOperationSchema = z.object({
    action: z.enum(['list-for-sale', 'list-for-trade', 'remove-from-sale', 'remove-from-trade', 'update-price']),
    price: z.number()
        .min(0, { message: 'Price must be non-negative' })
        .optional(),
});

export type CardOperationRequestBody = z.infer<typeof CardOperationSchema>; 