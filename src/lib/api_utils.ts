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