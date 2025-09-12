import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import {
    createSuccessResponse,
    createErrorResponse,
    getClientIP,
    getUserAgent,
    logAuditEvent,
    handleApiError
} from '@/lib/api_utils';
import { ImageDeleteSchema, BulkImageDeleteSchema } from '@/types/schemas/image_schemas';
import { verifyAuth } from '@/lib/auth';
import { recordFailedAttempt } from '@/lib/auth';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'uploads', 'images');

export async function DELETE(req: NextRequest) {
    try {
        const clientIP = getClientIP(req.headers);

        const authResult = await verifyAuth(req);
        if (!authResult.success) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('Authentication required', 401);
        }

        const body = await req.json();
        const deletedUrls: string[] = [];
        const failedUrls: string[] = [];

        if (Array.isArray(body.imageUrls)) {
            const validation = BulkImageDeleteSchema.safeParse(body);
            if (!validation.success) {
                recordFailedAttempt(clientIP);
                return createErrorResponse(
                    'Invalid bulk delete data',
                    400,
                    validation.error.flatten().fieldErrors
                );
            }

            for (const imageUrl of validation.data.imageUrls) {
                try {
                    await deleteImageFile(imageUrl);
                    deletedUrls.push(imageUrl);
                } catch (error) {
                    console.error(`Failed to delete image ${imageUrl}:`, error);
                    failedUrls.push(imageUrl);
                }
            }

            logAuditEvent({
                action: 'BULK_IMAGE_DELETE',
                userId: authResult.user.id,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'images',
                timestamp: new Date(),
                details: {
                    totalRequested: validation.data.imageUrls.length,
                    successCount: deletedUrls.length,
                    failedCount: failedUrls.length,
                },
            });

            return createSuccessResponse({
                deletedUrls,
                failedUrls,
                summary: {
                    total: validation.data.imageUrls.length,
                    deleted: deletedUrls.length,
                    failed: failedUrls.length,
                }
            }, failedUrls.length === 0
                ? 'All images deleted successfully'
                : `${deletedUrls.length} images deleted, ${failedUrls.length} failed`
            );

        } else {
            const validation = ImageDeleteSchema.safeParse(body);
            if (!validation.success) {
                recordFailedAttempt(clientIP);
                return createErrorResponse(
                    'Invalid delete data',
                    400,
                    validation.error.flatten().fieldErrors
                );
            }

            await deleteImageFile(validation.data.imageUrl);

            logAuditEvent({
                action: 'IMAGE_DELETED',
                userId: authResult.user.id,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'images',
                timestamp: new Date(),
                details: {
                    imageUrl: validation.data.imageUrl,
                },
            });

            return createSuccessResponse({
                deletedUrl: validation.data.imageUrl,
            }, 'Image deleted successfully');
        }

    } catch (error) {
        return handleApiError(error, 'IMAGE_DELETE');
    }
}

async function deleteImageFile(imageUrl: string): Promise<void> {
    const filename = imageUrl.split('/').pop();
    if (!filename) {
        throw new Error('Invalid image URL');
    }

    const filePath = path.join(IMAGES_DIR, filename);
    
    try {
        await fs.access(filePath);
        await fs.unlink(filePath);
    } catch (error) {
        throw new Error(`Failed to delete image file: ${filename}`);
    }
}