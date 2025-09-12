'use server';

import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { Role } from '@prisma/client';

export interface AuthenticatedUser {
    userId: string;
    role: Role;
    email?: string;
}

export interface AuthResult {
    success: boolean;
    user?: AuthenticatedUser;
    error?: string;
}

/**
 * Get authenticated user from server action context
 */
export async function getAuthenticatedUser(): Promise<AuthResult> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;

        if (!accessToken) {
            return { success: false, error: 'No authentication token found' };
        }

        const decodedPayload = await verifyToken(accessToken);

        if (!decodedPayload) {
            return { success: false, error: 'Invalid authentication token' };
        }

        return {
            success: true,
            user: {
                userId: decodedPayload.userId,
                role: decodedPayload.role,
                email: decodedPayload.email
            }
        };
    } catch (error) {
        console.error('Server action auth error:', error);
        return { success: false, error: 'Authentication failed' };
    }
}

/**
 * Require authentication for server action
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
    const auth = await getAuthenticatedUser();

    if (!auth.success || !auth.user) {
        throw new Error(auth.error || 'Authentication required');
    }

    return auth.user;
}

/**
 * Require specific role for server action
 */
export async function requireRole(requiredRole: Role): Promise<AuthenticatedUser> {
    const user = await requireAuth();

    if (user.role !== requiredRole && user.role !== Role.ADMIN) {
        throw new Error(`${requiredRole} role required`);
    }

    return user;
}

/**
 * Check if user owns a resource
 */
export async function requireOwnership(resourceOwnerId: string): Promise<AuthenticatedUser> {
    const user = await requireAuth();

    if (user.userId !== resourceOwnerId && user.role !== Role.ADMIN) {
        throw new Error('You can only access your own resources');
    }

    return user;
}

/**
 * Check if user can modify a resource (owner or seller/admin)
 */
export async function requireModifyPermission(resourceOwnerId: string): Promise<AuthenticatedUser> {
    const user = await requireAuth();

    if (user.userId !== resourceOwnerId &&
        user.role !== Role.SELLER &&
        user.role !== Role.ADMIN) {
        throw new Error('Insufficient permissions to modify this resource');
    }

    return user;
}

/**
 * Optional auth - returns user if authenticated, null if not
 */
export async function getOptionalAuth(): Promise<AuthenticatedUser | null> {
    const auth = await getAuthenticatedUser();
    return auth.success ? auth.user! : null;
}
