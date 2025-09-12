import { NextRequest } from 'next/server';
import {
    createSuccessResponse,
    createErrorResponse,
    sanitizePaginationParams,
    createPaginationInfo,
    getClientIP,
    getUserAgent,
    logAuditEvent,
    handleApiError
} from '@/lib/api_utils';
import { ImageListQuerySchema, ImageCategory } from '@/types/schemas/image_schemas';
import { verifyAuth } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'uploads', 'images');

export async function GET(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult.success) {
            return createErrorResponse('Authentication required', 401);
        }

        const { searchParams } = new URL(req.url);
        const queryData = {
            page: searchParams.get('page'),
            pageSize: searchParams.get('pageSize'),
            category: searchParams.get('category'),
            sortBy: searchParams.get('sortBy'),
            sortOrder: searchParams.get('sortOrder'),
        };

        const validation = ImageListQuerySchema.safeParse(queryData);
        if (!validation.success) {
            return createErrorResponse(
                'Invalid query parameters',
                400,
                validation.error.flatten().fieldErrors
            );
        }

        const { page, pageSize, category, sortBy, sortOrder } = validation.data;

        try {
            await fs.access(IMAGES_DIR);
        } catch {
            return createSuccessResponse({
                images: [],
                pagination: createPaginationInfo(page, pageSize, 0),
            });
        }

        const files = await fs.readdir(IMAGES_DIR);
        let imageFiles = files.filter(file =>
            /\.(jpg|jpeg|png|webp|gif)$/i.test(file)
        );

        if (category) {
            imageFiles = imageFiles.filter(file => {
                const categoryPrefix = `${category}_`;
                return file.includes(categoryPrefix) || (!file.includes('_') && category === 'card');
            });
        }

        const imagePromises = imageFiles.map(async (file) => {
            const filePath = path.join(IMAGES_DIR, file);
            const stats = await fs.stat(filePath);

            return {
                filename: file,
                url: `/api/images/serve/${file}`,
                size: stats.size,
                uploadedAt: stats.birthtime,
                category: determineCategory(file),
            };
        });

        const images = await Promise.all(imagePromises);

        if (sortBy === 'uploadedAt') {
            images.sort((a, b) => {
                const comparison = a.uploadedAt.getTime() - b.uploadedAt.getTime();
                return sortOrder === 'desc' ? -comparison : comparison;
            });
        } else if (sortBy === 'size') {
            images.sort((a, b) => {
                const comparison = a.size - b.size;
                return sortOrder === 'desc' ? -comparison : comparison;
            });
        } else if (sortBy === 'filename') {
            images.sort((a, b) => {
                const comparison = a.filename.localeCompare(b.filename);
                return sortOrder === 'desc' ? -comparison : comparison;
            });
        }

        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedImages = images.slice(startIndex, endIndex);

        logAuditEvent({
            action: 'IMAGES_LISTED',
            userId: authResult.user.id,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'images',
            timestamp: new Date(),
            details: {
                page,
                pageSize,
                category,
                total: images.length,
            },
        });

        return createSuccessResponse({
            images: paginatedImages,
            pagination: createPaginationInfo(page, pageSize, images.length),
        });

    } catch (error) {
        return handleApiError(error, 'IMAGE_LIST');
    }
}

function determineCategory(filename: string): ImageCategory {
    if (filename.includes('profile_')) return 'profile';
    if (filename.includes('collection_')) return 'collection';
    if (filename.includes('card_')) return 'card';
    return 'card';
}