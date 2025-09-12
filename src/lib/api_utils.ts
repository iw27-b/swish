import { NextResponse } from 'next/server';
import { ApiResponse, PaginationInfo, AuditLog } from '@/types/api';
import { randomUUID } from 'crypto';

const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
} as const;

const MAX_REQUEST_BYTES = parseInt(process.env.MAX_REQUEST_BYTES || '10485760');
const ALLOW_MISSING_CONTENT_LENGTH = process.env.ALLOW_MISSING_CONTENT_LENGTH === 'true';

/**
 * Sanitize string input to prevent XSS attacks
 * @param input The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
        .replace(/[<>]/g, '') 
        .replace(/javascript:/gi, '') 
        .replace(/on\w+=/gi, '') 
        .replace(/data:/gi, '') 
        .trim();
}

/**
 * Sanitize HTML content by escaping dangerous characters
 * @param input The HTML string to sanitize
 * @returns Escaped HTML string
 */
export function escapeHtml(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize and validate email addresses
 * @param email The email to sanitize
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(email: string): string | null {
    if (typeof email !== 'string') return null;
    
    const sanitized = email.toLowerCase().trim();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) return null;
    
    if (sanitized.includes('..') || sanitized.length > 254) return null;
    
    return sanitized;
}

/**
 * Sanitize object by applying sanitization to all string values
 * @param obj The object to sanitize
 * @param deep Whether to recursively sanitize nested objects
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T, deep: boolean = false): T {
    const sanitized = { ...obj } as any;
    
    for (const [key, value] of Object.entries(sanitized)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        } else if (deep && typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sanitized[key] = sanitizeObject(value, deep);
        } else if (deep && Array.isArray(value)) {
            sanitized[key] = value.map(item => 
                typeof item === 'string' ? sanitizeString(item) : 
                typeof item === 'object' && item !== null ? sanitizeObject(item, deep) : item
            );
        }
    }
    
    return sanitized;
}

export function createSuccessResponse<T>(
    data?: T,
    message?: string,
    meta?: ApiResponse<T>['meta']
): NextResponse {
    const response: ApiResponse<T> = {
        success: true,
        data,
        message,
        meta: {
            timestamp: new Date().toISOString(),
            requestId: randomUUID(),
            ...meta,
        },
    };
    
    const nextResponse = NextResponse.json(response);
    
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        nextResponse.headers.set(key, value);
    });
    
    return nextResponse;
}

export function createErrorResponse(
    message: string,
    status: number = 400,
    errors?: Record<string, string[]>
): NextResponse {
    const response: ApiResponse = {
        success: false,
        message,
        errors,
        meta: {
            timestamp: new Date().toISOString(),
            requestId: randomUUID(),
        },
    };
    
    const nextResponse = NextResponse.json(response, { status });
    
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        nextResponse.headers.set(key, value);
    });
    
    return nextResponse;
}

export function validateRequestSize(body: any, maxSizeBytes: number = 100000): boolean {
    try {
        const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
        const size = new TextEncoder().encode(bodyString).length;
        return size <= maxSizeBytes;
    } catch (error) {
        return false;
    }
}

/**
 * Validates request content-length before parsing body
 * @param headers Request headers
 * @param endpoint The API endpoint being accessed
 * @param maxBytes Maximum allowed bytes (defaults to configured MAX_REQUEST_BYTES)
 * @returns Object with isValid flag and optional error response
 */
export function validateContentLength(
    headers: Headers,
    endpoint: string,
    maxBytes: number = MAX_REQUEST_BYTES
): { isValid: boolean; errorResponse?: NextResponse } {
    const contentLengthHeader = headers.get('content-length');
    const contentType = headers.get('content-type') || 'unknown';
    const clientIP = getClientIP(headers);
    
    if (!contentLengthHeader) {
        if (ALLOW_MISSING_CONTENT_LENGTH) {
            logAuditEvent({
                action: 'REQUEST_MISSING_CONTENT_LENGTH_ALLOWED',
                details: {
                    endpoint,
                    contentType,
                    clientIP,
                    policy: 'allow_with_caution'
                },
                timestamp: new Date(),
                ip: clientIP,
                userAgent: headers.get('user-agent') || 'unknown'
            });
            return { isValid: true };
        } else {
            logAuditEvent({
                action: 'REQUEST_MISSING_CONTENT_LENGTH_REJECTED',
                details: {
                    endpoint,
                    contentType,
                    clientIP,
                    policy: 'reject'
                },
                timestamp: new Date(),
                ip: clientIP,
                userAgent: headers.get('user-agent') || 'unknown'
            });
            return {
                isValid: false,
                errorResponse: createErrorResponse('Content-Length header required', 400)
            };
        }
    }
    
    const contentLength = parseInt(contentLengthHeader, 10);
    
    if (isNaN(contentLength) || contentLength < 0) {
        logAuditEvent({
            action: 'REQUEST_INVALID_CONTENT_LENGTH',
            details: {
                endpoint,
                contentType,
                clientIP,
                declaredLength: contentLengthHeader,
                reason: 'invalid_format'
            },
            timestamp: new Date(),
            ip: clientIP,
            userAgent: headers.get('user-agent') || 'unknown'
        });
        return {
            isValid: false,
            errorResponse: createErrorResponse('Invalid Content-Length header', 400)
        };
    }
    
    if (contentLength > maxBytes) {
        logAuditEvent({
            action: 'REQUEST_SIZE_EXCEEDED',
            details: {
                endpoint,
                contentType,
                clientIP,
                declaredLength: contentLength,
                maxAllowed: maxBytes,
                exceededBy: contentLength - maxBytes
            },
            timestamp: new Date(),
            ip: clientIP,
            userAgent: headers.get('user-agent') || 'unknown'
        });
        return {
            isValid: false,
            errorResponse: createErrorResponse('Payload too large', 413)
        };
    }
    
    return { isValid: true };
}

export function getClientIP(headers: Headers): string {
    return (
        headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headers.get('x-real-ip') ||
        headers.get('cf-connecting-ip') ||
        'unknown'
    );
}

export function getUserAgent(headers: Headers): string {
    return headers.get('user-agent') || 'unknown';
}

export function createPaginationInfo(
    page: number,
    pageSize: number,
    total: number
): PaginationInfo {
    const totalPages = Math.ceil(total / pageSize);
    return {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
}

export function sanitizePaginationParams(
    page?: string | number,
    pageSize?: string | number
): { page: number; pageSize: number } {
    const sanitizedPage = Math.max(1, parseInt(String(page || 1), 10) || 1);
    const sanitizedPageSize = Math.min(
        100,
        Math.max(1, parseInt(String(pageSize || 10), 10) || 10)
    );

    return {
        page: sanitizedPage,
        pageSize: sanitizedPageSize,
    };
}

export function logAuditEvent(auditLog: AuditLog): void {
    console.log('[AUDIT]', JSON.stringify(auditLog, null, 2));
}

/**
 * Enhanced error handler for API routes
 * @param error The error to handle
 * @param context Additional context for logging
 * @returns Standardized error response
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
    const requestId = randomUUID();
    
    console.error(`[API_ERROR:${requestId}]${context ? ` ${context}:` : ''}`, error);
    
    if (error instanceof Error) {
        if (error.message.includes('Unique constraint failed')) {
            return createErrorResponse('Resource already exists', 409);
        }
        if (error.message.includes('Record to update not found')) {
            return createErrorResponse('Resource not found', 404);
        }
        if (error.message.includes('Foreign key constraint failed')) {
            return createErrorResponse('Invalid reference to related resource', 400);
        }
    }
    
    return createErrorResponse('Internal server error', 500);
}

/**
 * Sleep utility for retry delays
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * @param fn Function to retry
 * @param maxAttempts Maximum number of attempts (default: 3)
 * @param baseDelay Base delay in milliseconds (default: 1000)
 * @returns Promise with the result of the function or throws the last error
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            if (attempt === maxAttempts) {
                throw lastError;
            }
            
            const delay = baseDelay * Math.pow(2, attempt - 1);
            await sleep(delay);
        }
    }
    
    throw lastError!;
}

/**
 * Log structured error events for observability systems
 * @param event Error event details
 */
export function logObservabilityError(event: {
    operation: string;
    error: unknown;
    context: Record<string, any>;
    severity?: 'low' | 'medium' | 'high' | 'critical';
}): void {
    const requestId = randomUUID();
    const timestamp = new Date().toISOString();
    
    const structuredLog = {
        level: 'error',
        operation: event.operation,
        requestId,
        timestamp,
        severity: event.severity || 'medium',
        error: {
            message: event.error instanceof Error ? event.error.message : String(event.error),
            stack: event.error instanceof Error ? event.error.stack : undefined,
            name: event.error instanceof Error ? event.error.name : 'UnknownError'
        },
        context: event.context,
        tags: {
            component: 'api',
            environment: process.env.NODE_ENV || 'development'
        }
    };
    
    console.error('[OBSERVABILITY_ERROR]', JSON.stringify(structuredLog, null, 2));
} 