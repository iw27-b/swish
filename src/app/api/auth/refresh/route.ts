import { NextRequest } from 'next/server';
import { verifyRefreshToken, generateToken, parseTokenFromCookie } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';
import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';

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
            return createErrorResponse('Refresh token required', 401);
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
            response.cookies.delete('user_data');
            return response;
        }

        const user = await prisma.user.findUnique({
            where: { id: decodedPayload.userId },
        });

        if (!user || !user.emailVerified) {
            logAuditEvent({
                action: 'TOKEN_REFRESH_USER_NOT_FOUND',
                userId: decodedPayload.userId,
                ip: clientIP,
                userAgent: getUserAgent(req.headers),
                resource: 'auth',
                timestamp: new Date(),
            });

            const response = createErrorResponse('User not found or not verified', 401);
            response.cookies.delete('access_token');
            response.cookies.delete('refresh_token');
            response.cookies.delete('user_data');
            return response;
        }

        const newAccessToken = await generateToken(user.id, user.role as Role);

        logAuditEvent({
            action: 'TOKEN_REFRESH_SUCCESS',
            userId: user.id,
            ip: clientIP,
            userAgent: getUserAgent(req.headers),
            resource: 'auth',
            timestamp: new Date(),
        });

        const response = createSuccessResponse(null, 'Token refreshed successfully');

        response.cookies.set('access_token', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60, // 15 minutes
            path: '/'
        });

        response.cookies.set('user_data', JSON.stringify({
            id: user.id,
            name: user.name,
            role: user.role,
            isEmailVerified: user.emailVerified
        }), {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60,
            path: '/'
        });

        return response;

    } catch (error) {
        console.error('Token refresh error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 