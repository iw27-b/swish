import path from 'path';
import * as imageType from 'image-type';

const DEFAULT_MAX_FILE_SIZE = 10485760;
const envValue = parseInt(process.env.MAX_FILE_UPLOAD_SIZE || '', 10);
const MAX_FILE_SIZE = isNaN(envValue) ? DEFAULT_MAX_FILE_SIZE : envValue;

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
export function validateImageFile(buffer: Buffer): ImageValidationResult {
    const detected = imageType.default(buffer);
    
    if (detected === null) {
        return {
            isValid: false,
            error: 'Unknown/unsupported file type',
        };
    }
    
    if (!ALLOWED_MIME_TYPES.includes(detected.mime)) {
        return {
            isValid: false,
            error: `Unsupported file type: ${detected.mime}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
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