import { z } from 'zod';

export const ImageCategorySchema = z.enum(['card', 'profile', 'collection'], {
    errorMap: () => ({ message: 'Category must be card, profile, or collection' })
});

export const FileSchema = z.custom<File>((data) => {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    
    const hasRequiredProperties = 
        typeof (data as any).name === 'string' &&
        typeof (data as any).size === 'number' &&
        typeof (data as any).type === 'string';
    
    return hasRequiredProperties;
}, {
    message: 'File must be a valid File object with name, size, and type properties'
});

export type ImageCategory = z.infer<typeof ImageCategorySchema>;

export const ImageUploadSchema = z.object({
    file: FileSchema,
    alt: z.string()
        .min(1, 'Alt text is required')
        .max(200, 'Alt text must be less than 200 characters')
        .optional(),
    category: ImageCategorySchema.optional().default('card'),
});

export type ImageUploadRequest = z.infer<typeof ImageUploadSchema>;

export const ImageMetadataSchema = z.object({
    originalFilename: z.string().min(1),
    size: z.number().int().positive(),
    type: z.string().min(1),
    hash: z.string().min(1),
    filename: z.string().min(1),
    alt: z.string().optional(),
    category: ImageCategorySchema.optional(),
    uploadedAt: z.date().optional(),
});

export type ImageMetadata = z.infer<typeof ImageMetadataSchema>;

export const ImageDeleteSchema = z.object({
    imageUrl: z.string()
        .min(1, 'Image URL is required')
        .refine((url) => {
            return url.startsWith('/api/images/serve/');
        }, 'Image URL must be a server-internal path starting with /api/images/serve/'),
}).strict();

export type ImageDeleteRequest = z.infer<typeof ImageDeleteSchema>;

export const ImageDeleteByIdSchema = z.object({
    imageId: z.string()
        .min(1, 'Image ID is required')
        .refine((id) => {
            const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return ulidRegex.test(id) || uuidRegex.test(id);
        }, 'Image ID must be a valid ULID or UUID'),
}).strict();

export type ImageDeleteByIdRequest = z.infer<typeof ImageDeleteByIdSchema>;

export const ImageListQuerySchema = z.object({
    page: z.coerce.number().min(1).optional().default(1),
    pageSize: z.coerce.number().min(1).max(100).optional().default(20),
    category: ImageCategorySchema.optional(),
    sortBy: z.enum(['uploadedAt', 'size', 'filename']).optional().default('uploadedAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ImageListQuery = z.infer<typeof ImageListQuerySchema>;

export const BulkImageDeleteSchema = z.object({
    imageUrls: z.array(z.string().min(1)).min(1).max(50),
});

export type BulkImageDeleteRequest = z.infer<typeof BulkImageDeleteSchema>;
