import { NextResponse } from 'next/server';
import { ApiResponse, PaginationInfo, AuditLog } from '@/types/api';
import { randomUUID } from 'crypto';

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
    return NextResponse.json(response);
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
    return NextResponse.json(response, { status });
}

export function validateRequestSize(body: any, maxSizeBytes: number = 100000): boolean {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    return Buffer.byteLength(bodyString, 'utf8') <= maxSizeBytes;
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