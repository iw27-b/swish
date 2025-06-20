import { NextRequest } from 'next/server';
import { verifyEdgeToken, parseTokenFromCookie } from '@/lib/edge_auth_utils';
import { JwtPayload } from '@/types';

/**
 * Extract authenticated user from request tokens (for use in API routes)
 * Since Next.js middleware doesn't pass req.user to routes, we need to re-extract the user
 * @param req NextRequest object
 * @returns Promise<JwtPayload | null> The authenticated user payload or null
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<JwtPayload | null> {
    try {
        let accessToken = parseTokenFromCookie(req.headers.get('cookie'), 'access_token');
        
        if (!accessToken) {
            const authHeader = req.headers.get('authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                accessToken = authHeader.substring(7);
            }
        }
        
        if (!accessToken) {
            return null;
        }
        
        const decodedPayload = await verifyEdgeToken(accessToken);
        return decodedPayload;
    } catch (error) {
        console.error('Error extracting authenticated user:', error);
        return null;
    }
}

/**
 * Require authentication in an API route
 * @param req NextRequest object
 * @returns Promise<JwtPayload> The authenticated user payload
 * @throws Error if not authenticated
 */
export async function requireAuth(req: NextRequest): Promise<JwtPayload> {
    const user = await getAuthenticatedUser(req);
    if (!user) {
        throw new Error('Authentication required');
    }
    return user;
} 