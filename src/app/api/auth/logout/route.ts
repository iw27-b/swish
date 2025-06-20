import { NextRequest } from 'next/server';
import { AuthenticatedRequest } from '@/types';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';

/**
 * Handles user logout by clearing all authentication cookies
 * @param req AuthenticatedRequest - The user object that is authenticated
 * @returns JSON response with success message and clears cookies
 */
export async function POST(req: AuthenticatedRequest) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = req.user;

        logAuditEvent({
            action: 'USER_LOGOUT',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'auth',
            timestamp: new Date(),
        });

        const response = createSuccessResponse(
            null, 
            'Logged out successfully'
        );

        // Clear all authentication cookies
        response.cookies.set('access_token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0,
            path: '/'
        });

        response.cookies.set('refresh_token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0,
            path: '/'
        });

        response.cookies.set('user_data', '', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0,
            path: '/'
        });

        return response;

    } catch (error) {
        console.error('Logout error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 