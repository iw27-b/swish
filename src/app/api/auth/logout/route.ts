import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent } from '@/lib/api_utils';
import { deleteCsrfCookie } from '@/lib/csrf';
import { withAuth } from '@/lib/auth';

/**
 * Handles user logout by clearing all authentication cookies
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @returns JSON response with success message and clears cookies
 */
export const POST = withAuth(async (req, user) => {
    try {
        const { userId } = user;

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

        deleteCsrfCookie(response);

        return response;

    } catch (error) {
        console.error('Logout error:', error);
        return createErrorResponse('Internal server error', 500);
    }
}); 