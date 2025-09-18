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
import { Role } from '@prisma/client';
import { JwtPayload } from '@/types';
import prisma from '@/lib/prisma';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'uploads', 'images');

/**
 * Verifies if a user can delete an image by checking ownership or admin role
 * @param user The authenticated user making the request
 * @param imageUrl The URL of the image to delete
 * @throws Error if user is not authorized to delete the image
 */
async function assertCanDeleteImage(user: JwtPayload, imageUrl: string): Promise<void> {
    if (user.role === Role.ADMIN) {
        return;
    }

    try {
        const [cardWithImage, collectionWithImage, userWithProfileImage] = await Promise.all([
            prisma.card.findFirst({
                where: { imageUrl },
                select: { ownerId: true }
            }),
            prisma.collection.findFirst({
                where: { imageUrl },
                select: { ownerId: true }
            }),
            prisma.user.findFirst({
                where: { profileImageUrl: imageUrl },
                select: { id: true }
            })
        ]);

        if (cardWithImage) {
            if (cardWithImage.ownerId !== user.userId) {
                throw new Error('Forbidden: You can only delete your own card images');
            }
            return;
        }

        if (collectionWithImage) {
            if (collectionWithImage.ownerId !== user.userId) {
                throw new Error('Forbidden: You can only delete your own collection images');
            }
            return;
        }

        if (userWithProfileImage) {
            if (userWithProfileImage.id !== user.userId) {
                throw new Error('Forbidden: You can only delete your own profile image');
            }
            return;
        }

        throw new Error('Forbidden: Image not found or you do not have permission to delete it');
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to verify image ownership');
    }
}

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

            try {
                await assertCanDeleteImage(authResult.user, validation.data.imageUrl);
            } catch (authError) {
                recordFailedAttempt(clientIP);
                logAuditEvent({
                    action: 'UNAUTHORIZED_IMAGE_DELETE_ATTEMPT',
                    userId: authResult.user.id,
                    ip: clientIP,
                    userAgent: getUserAgent(req.headers),
                    resource: 'images',
                    timestamp: new Date(),
                    details: {
                        imageUrl: validation.data.imageUrl,
                        error: authError instanceof Error ? authError.message : 'Unknown authorization error'
                    },
                });
                return createErrorResponse(
                    authError instanceof Error ? authError.message : 'Forbidden: You do not have permission to delete this image',
                    403
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