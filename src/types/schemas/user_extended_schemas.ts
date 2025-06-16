import { z } from 'zod';

// Define PurchaseStatus enum locally until Prisma generates it
enum PurchaseStatus {
    PENDING = 'PENDING',
    PAID = 'PAID',
    SHIPPED = 'SHIPPED',
    DELIVERED = 'DELIVERED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    REFUNDED = 'REFUNDED'
}

// Address schema for shipping addresses
export const AddressSchema = z.object({
    street: z.string().min(1, { message: 'Street address is required' }).max(200),
    city: z.string().min(1, { message: 'City is required' }).max(100),
    state: z.string().min(1, { message: 'State/Province is required' }).max(100),
    postalCode: z.string().min(1, { message: 'Postal code is required' }).max(20),
    country: z.string().min(1, { message: 'Country is required' }).max(100),
    isDefault: z.boolean().default(false),
    label: z.string().max(50).optional(), // e.g., "Home", "Work"
});

export type Address = z.infer<typeof AddressSchema>;

// Payment method schema
export const PaymentMethodSchema = z.object({
    type: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'BANK_TRANSFER']),
    label: z.string().max(50), // e.g., "Visa ending in 1234"
    isDefault: z.boolean().default(false),
    lastFour: z.string().length(4).optional(), // Last 4 digits for cards
    expiryMonth: z.number().min(1).max(12).optional(),
    expiryYear: z.number().min(2024).max(2050).optional(),
    provider: z.string().max(50).optional(), // e.g., "Visa", "PayPal"
});

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

// Extended user profile update schema
export const UpdateExtendedUserSchema = z.object({
    name: z.string()
        .min(1, { message: 'Name is required' })
        .max(100, { message: 'Name must be less than 100 characters' })
        .regex(/^[\p{L}\p{M}\s'-]+$/u, { message: 'Name can only contain letters, spaces, hyphens, and apostrophes' })
        .optional(),
    languagePreference: z.enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'])
        .default('en')
        .optional(),
    phoneNumber: z.string()
        .regex(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
        .optional(),
    dateOfBirth: z.coerce.date()
        .refine((date) => {
            const age = new Date().getFullYear() - date.getFullYear();
            return age >= 13 && age <= 120;
        }, { message: 'Age must be between 13 and 120 years' })
        .optional(),
    bio: z.string().max(500, { message: 'Bio must be less than 500 characters' }).optional(),
    profileImageUrl: z.string().url({ message: 'Invalid image URL' }).optional(),
    shippingAddress: AddressSchema.optional(),
});

export type UpdateExtendedUserRequestBody = z.infer<typeof UpdateExtendedUserSchema>;

// Security PIN schema
export const SetSecurityPinSchema = z.object({
    pin: z.string()
        .length(6, { message: 'PIN must be exactly 6 digits' })
        .regex(/^\d{6}$/, { message: 'PIN must contain only numbers' }),
    confirmPin: z.string().length(6, { message: 'PIN confirmation must be exactly 6 digits' }),
}).refine((data) => data.pin === data.confirmPin, {
    message: "PINs don't match",
    path: ["confirmPin"],
});

export type SetSecurityPinRequestBody = z.infer<typeof SetSecurityPinSchema>;

// Collection schemas
export const CreateCollectionSchema = z.object({
    name: z.string().min(1, { message: 'Collection name is required' }).max(100),
    description: z.string().max(500).optional(),
    isPublic: z.boolean().default(false),
    imageUrl: z.string().url().optional(),
});

export type CreateCollectionRequestBody = z.infer<typeof CreateCollectionSchema>;

export const UpdateCollectionSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    isPublic: z.boolean().optional(),
    imageUrl: z.string().url().optional(),
});

export type UpdateCollectionRequestBody = z.infer<typeof UpdateCollectionSchema>;

export const AddCardToCollectionSchema = z.object({
    cardId: z.string().cuid({ message: 'Invalid card ID' }),
    notes: z.string().max(200).optional(),
});

export type AddCardToCollectionRequestBody = z.infer<typeof AddCardToCollectionSchema>;

export const ShareCollectionSchema = z.object({
    userId: z.string().cuid({ message: 'Invalid user ID' }),
    canEdit: z.boolean().default(false),
});

export type ShareCollectionRequestBody = z.infer<typeof ShareCollectionSchema>;

// Follow schemas
export const FollowUserSchema = z.object({
    userId: z.string().cuid({ message: 'Invalid user ID' }),
});

export type FollowUserRequestBody = z.infer<typeof FollowUserSchema>;

// Card tracking schemas
export const TrackCardSchema = z.object({
    cardId: z.string().cuid({ message: 'Invalid card ID' }),
    targetPrice: z.number().positive().optional(),
    notifyOnSale: z.boolean().default(true),
    notifyOnPriceChange: z.boolean().default(true),
});

export type TrackCardRequestBody = z.infer<typeof TrackCardSchema>;

export const UpdateCardTrackingSchema = z.object({
    targetPrice: z.number().positive().optional(),
    notifyOnSale: z.boolean().optional(),
    notifyOnPriceChange: z.boolean().optional(),
});

export type UpdateCardTrackingRequestBody = z.infer<typeof UpdateCardTrackingSchema>;

// Purchase history schemas
export const PurchaseQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(50).default(10),
    status: z.nativeEnum(PurchaseStatus).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    sortBy: z.enum(['createdAt', 'price', 'status']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PurchaseQuery = z.infer<typeof PurchaseQuerySchema>;

// Payment method management schemas
export const AddPaymentMethodSchema = z.object({
    type: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'BANK_TRANSFER']),
    label: z.string().min(1).max(50),
    isDefault: z.boolean().default(false),
    lastFour: z.string().length(4).optional(),
    expiryMonth: z.number().min(1).max(12).optional(),
    expiryYear: z.number().min(2024).max(2050).optional(),
    provider: z.string().max(50).optional(),
});

export type AddPaymentMethodRequestBody = z.infer<typeof AddPaymentMethodSchema>;

export const UpdatePaymentMethodSchema = z.object({
    label: z.string().min(1).max(50).optional(),
    isDefault: z.boolean().optional(),
    expiryMonth: z.number().min(1).max(12).optional(),
    expiryYear: z.number().min(2024).max(2050).optional(),
});

export type UpdatePaymentMethodRequestBody = z.infer<typeof UpdatePaymentMethodSchema>;

// Query schemas for lists
export const CollectionQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(50).default(10),
    search: z.string().max(100).optional(),
    isPublic: z.coerce.boolean().optional(),
    sortBy: z.enum(['createdAt', 'name', 'updatedAt']).default('updatedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CollectionQuery = z.infer<typeof CollectionQuerySchema>;

export const FollowQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(50).default(10),
    search: z.string().max(100).optional(),
});

export type FollowQuery = z.infer<typeof FollowQuerySchema>;

export const FavoriteQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(50).default(10),
    sortBy: z.enum(['createdAt', 'name', 'price']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type FavoriteQuery = z.infer<typeof FavoriteQuerySchema>; 