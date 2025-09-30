import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, generateToken, parseTokenFromCookie } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';
import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { generateCsrfToken, setCsrfCookie, setStrictCorsHeaders } from '@/lib/csrf';

/**
 * Sets CORS headers for cross-origin requests with credentials
 * Uses strict origin checking for refresh endpoint
 * @param response The NextResponse object to add headers to
 * @param origin The origin header from the request
 * @returns The response with CORS headers
 */
function setCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
    setStrictCorsHeaders(response, origin || null, 'POST, OPTIONS');
    return response;
}

/**
 * Handles CORS preflight requests
 * @param req The Next.js request object
 * @returns Response with CORS headers
 */
export async function OPTIONS(req: NextRequest) {
    const response = new NextResponse(null, { status: 204 });
    return setCorsHeaders(response, req.headers.get('origin'));
}

/**
 * Handles token refresh using HttpOnly refresh token
 * @param req The Next.js request object
 * @returns JSON response with success status and sets new access token cookie
 */
export async function POST(req: NextRequest) {
    try {
        const clientIP = getClientIP(req.headers);
        const refreshToken = parseTokenFromCookie(req.headers.get('cookie'), 'refresh_token');

        if (!refreshToken) {
            const response = createErrorResponse('Refresh token required', 401);
            return setCorsHeaders(response, req.headers.get('origin'));
        }

        const decodedPayload = await verifyRefreshToken(refreshToken);
        if (!decodedPayload) {
            logAuditEvent({
                action: 'TOKEN_REFRESH_INVALID',
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
            });

            const response = createErrorResponse('Invalid or expired refresh token', 401);
            response.cookies.delete('access_token');
            response.cookies.delete('refresh_token');
            return setCorsHeaders(response, req.headers.get('origin'));
        }

        const user = await prisma.user.findUnique({
            where: { id: decodedPayload.userId },
        });

        if (!user) {
            logAuditEvent({
                action: 'TOKEN_REFRESH_USER_NOT_FOUND',
                userId: decodedPayload.userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
            });

            const response = createErrorResponse('User not found', 401);
            response.cookies.delete('access_token');
            response.cookies.delete('refresh_token');
            return setCorsHeaders(response, req.headers.get('origin'));
        }

        const newAccessToken = await generateToken(user.id, user.role as Role);
        const csrfToken = generateCsrfToken();

        logAuditEvent({
            action: 'TOKEN_REFRESH_SUCCESS',
            userId: user.id,
            ip: clientIP,
            userAgent: getUserAgent(req.headers),
            resource: 'auth',
            timestamp: new Date(),
        });

        const response = createSuccessResponse({ csrfToken }, 'Token refreshed successfully');

        const isProduction = process.env.NODE_ENV === 'production';

        response.cookies.set('access_token', newAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 15 * 60,
            path: '/'
        });

        setCsrfCookie(response, csrfToken, isProduction);

        return setCorsHeaders(response, req.headers.get('origin'));

    } catch (error) {
        console.error('Token refresh error:', error);
        const response = createErrorResponse('Internal server error', 500);
        return setCorsHeaders(response, req.headers.get('origin'));
    }
} 