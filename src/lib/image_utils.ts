import path from 'path';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_UPLOAD_SIZE || '0', 10);

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
];

export interface ImageValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Basic image file validation (type and size only)
 */
export function validateImageFile(buffer: Buffer, mimeType: string): ImageValidationResult {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return {
            isValid: false,
            error: `Unsupported file type: ${mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        };
    }

    if (buffer.length > MAX_FILE_SIZE) {
        return {
            isValid: false,
            error: `File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        };
    }

    return { isValid: true };
}

export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase();
}