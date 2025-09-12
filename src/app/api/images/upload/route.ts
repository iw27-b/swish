import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
    createSuccessResponse,
    createErrorResponse,
    getClientIP,
    getUserAgent,
    logAuditEvent,
    handleApiError
} from '@/lib/api_utils';
import { ImageUploadSchema } from '@/types/schemas/image_schemas';
import { isRateLimited, recordFailedAttempt, verifyAuth } from '@/lib/auth';
// import { config } from 'dotenv';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'uploads', 'images');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_UPLOAD_SIZE || '0', 10);

const ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
];

export async function POST(req: NextRequest) {
    try {
        const clientIP = getClientIP(req.headers);

        if (isRateLimited(clientIP)) {
            logAuditEvent({
                action: 'IMAGE_UPLOAD_RATE_LIMITED',
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'images',
                timestamp: new Date(),
            });
            return createErrorResponse('Too many upload attempts. Please try again later.', 429);
        }

        const authResult = await verifyAuth(req);
        if (!authResult.success) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('Authentication required', 401);
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const alt = formData.get('alt') as string;
        const category = formData.get('category') as string || 'card';

        if (!file) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('No file provided', 400);
        }

        const uploadValidation = ImageUploadSchema.safeParse({
            file,
            alt,
            category,
        });

        if (!uploadValidation.success) {
            recordFailedAttempt(clientIP);
            return createErrorResponse(
                'Invalid upload data',
                400,
                uploadValidation.error.flatten().fieldErrors
            );
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('Invalid file type. Only JPEG, PNG, WebP and GIF are allowed.', 400);
        }

        if (file.size > MAX_FILE_SIZE) {
            recordFailedAttempt(clientIP);
            return createErrorResponse('File too large. Maximum size is 10MB.', 400);
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        const ext = path.extname(file.name).toLowerCase();
        const filename = `${hash}${ext}`;
        const filePath = path.join(IMAGES_DIR, filename);

        await fs.mkdir(IMAGES_DIR, { recursive: true });

        await fs.writeFile(filePath, buffer);

        const imageUrl = `/api/images/serve/${filename}`;

        logAuditEvent({
            action: 'IMAGE_UPLOADED',
            userId: authResult.user.id,
            ip: clientIP,
            userAgent: getUserAgent(req.headers),
            resource: 'images',
            timestamp: new Date(),
            details: {
                filename,
                originalFilename: file.name,
                size: file.size,
                type: file.type,
                category: uploadValidation.data.category,
                hash,
            },
        });

        return createSuccessResponse({
            url: imageUrl,
            filename,
            hash,
            metadata: {
                originalFilename: file.name,
                size: file.size,
                type: file.type,
                alt: uploadValidation.data.alt,
                category: uploadValidation.data.category,
                uploadedAt: new Date(),
            },
        }, 'Image uploaded successfully');

    } catch (error) {
        console.error('Image upload error:', error);
        return handleApiError(error, 'IMAGE_UPLOAD');
    }
}