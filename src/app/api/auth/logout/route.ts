import { NextRequest } from 'next/server';
import { AuthenticatedRequest } from '@/types';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';

/**
 * This route is used to logout the authenticated user.
 * @param req AuthenticatedRequest - The user object that is authenticated
 * @returns JSON response with success or error message
 */

export async function POST(req: AuthenticatedRequest) {
    try {
        if (!req.user) {
            return createErrorResponse('Authentication required', 401);
        }

        const { userId } = req.user;

        const authHeader = req.headers.get('authorization');
        const token = authHeader?.split(' ')?.[1];

        logAuditEvent({
            action: 'USER_LOGOUT',
            userId: userId,
            ip: getClientIP(req.headers),
            userAgent: getUserAgent(req.headers),
            resource: 'auth',
            timestamp: new Date(),
            details: { 
                tokenUsed: token ? `${token.substring(0, 10)}...` : 'unknown' 
            },
        });

        return createSuccessResponse(
            null, 
            'Logged out successfully. Please discard your token.'
        );

    } catch (error) {
        console.error('Logout error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 