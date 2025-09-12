import { z } from 'zod';

export const ImageUploadSchema = z.object({
    file: z.any(),
    alt: z.string()
        .min(1, 'Alt text is required')
        .max(200, 'Alt text must be less than 200 characters')
        .optional(),
    category: z.enum(['card', 'profile', 'collection'], {
        errorMap: () => ({ message: 'Category must be card, profile, or collection' })
    }).optional().default('card'),
});

export type ImageUploadRequest = z.infer<typeof ImageUploadSchema>;

export const ImageMetadataSchema = z.object({
    originalFilename: z.string().min(1),
    size: z.number().int().positive(),
    type: z.string().min(1),
    hash: z.string().min(1),
    filename: z.string().min(1),
    alt: z.string().optional(),
    category: z.enum(['card', 'profile', 'collection']).optional(),
    uploadedAt: z.date().optional(),
});

export type ImageMetadata = z.infer<typeof ImageMetadataSchema>;

export const ImageDeleteSchema = z.object({
    imageUrl: z.string()
        .min(1, 'Image URL is required')
        .refine((url) => {
            return url.startsWith('/api/images/serve/') || url.startsWith('http');
        }, 'Invalid image URL format'),
});

export type ImageDeleteRequest = z.infer<typeof ImageDeleteSchema>;

export const ImageListQuerySchema = z.object({
    page: z.coerce.number().min(1).optional().default(1),
    pageSize: z.coerce.number().min(1).max(100).optional().default(20),
    category: z.enum(['card', 'profile', 'collection']).optional(),
    sortBy: z.enum(['uploadedAt', 'size', 'filename']).optional().default('uploadedAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ImageListQuery = z.infer<typeof ImageListQuerySchema>;

export const BulkImageDeleteSchema = z.object({
    imageUrls: z.array(z.string().min(1)).min(1).max(50),
});

export type BulkImageDeleteRequest = z.infer<typeof BulkImageDeleteSchema>;
