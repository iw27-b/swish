import { Role } from '@prisma/client';
import { JwtPayload } from '@/types';
import { NextRequest } from 'next/server';

const rolePermissions: Record<Role, { grants: Array<{ resource: string; action: string; condition?: (req: NextRequest, user: JwtPayload) => boolean }> }> = {
    [Role.USER]: {
        grants: [
            { resource: 'profile', action: 'read:own' },
            { resource: 'profile', action: 'update:own' },
            { resource: 'auth', action: 'request:emailVerification' },
            { resource: 'auth', action: 'logout' },
            { resource: 'auth', action: 'change:password' },
            { resource: 'cards', action: 'read:own' },
            { resource: 'cards', action: 'create:own' },
            { resource: 'cards', action: 'update:own' },
            { resource: 'cards', action: 'delete:own' },
            { resource: 'search', action: 'read:own' },
            { resource: 'trades', action: 'read:own' },
            { resource: 'trades', action: 'create:own' },
            { resource: 'trades', action: 'update:own' },
            { resource: 'purchases', action: 'read:own' },
            { resource: 'purchases', action: 'create:own' },
        ],
    },
    [Role.SELLER]: {
        grants: [
            { resource: 'profile', action: 'read:own' },
            { resource: 'profile', action: 'update:own' },
            { resource: 'auth', action: 'request:emailVerification' },
            { resource: 'auth', action: 'logout' },
            { resource: 'auth', action: 'change:password' },
            { resource: 'cards', action: 'read:own' },
            { resource: 'cards', action: 'create:own' },
            { resource: 'cards', action: 'update:own' },
            { resource: 'cards', action: 'delete:own' },
            { resource: 'search', action: 'read:own' },
            { resource: 'listings', action: 'manage:own' },
            { resource: 'trades', action: 'read:own' },
            { resource: 'trades', action: 'create:own' },
            { resource: 'trades', action: 'update:own' },
            { resource: 'purchases', action: 'read:own' },
            { resource: 'purchases', action: 'create:own' },
        ],
    },
    [Role.ADMIN]: {
        grants: [
            { resource: 'profile', action: 'read:any' },
            { resource: 'profile', action: 'update:any' },
            { resource: 'profile', action: 'delete:any' },
            { resource: 'users', action: 'manage:any' },
            { resource: 'auth', action: 'request:emailVerification' },
            { resource: 'auth', action: 'logout' },
            { resource: 'auth', action: 'change:password' },
            { resource: 'cards', action: 'read:any' },
            { resource: 'cards', action: 'create:any' },
            { resource: 'cards', action: 'update:any' },
            { resource: 'cards', action: 'delete:any' },
            { resource: 'search', action: 'read:any' },
            { resource: 'trades', action: 'read:any' },
            { resource: 'trades', action: 'create:any' },
            { resource: 'trades', action: 'update:any' },
            { resource: 'purchases', action: 'read:any' },
            { resource: 'purchases', action: 'create:any' },
        ],
    },
};

/**
 * Checks if a user with a given role has permission for a specific action on a resource.
 * @param role The role of the user.
 * @param resource The resource being accessed (e.g., 'profile', 'listings').
 * @param action The action being performed (e.g., 'read:own', 'update:any').
 * @param req The NextRequest object, for conditional checks.
 * @param user The JWT payload of the authenticated user.
 * @returns True if permission is granted, false otherwise.
 */
export function hasPermission(
    role: Role,
    resource: string,
    action: string,
    req: NextRequest,
    user: JwtPayload
): boolean {
    const permissions = rolePermissions[role];
    if (!permissions) return false;

    return permissions.grants.some(grant => {
        if (grant.resource === resource && grant.action === action) {
            if (grant.condition) {
                return grant.condition(req, user);
            }
            return true;
        }
        return false;
    });
}

const isOwnProfile = (req: NextRequest, user: JwtPayload): boolean => {
    const path = req.nextUrl.pathname;
    // /api/users/me should always be allowed for authenticated users
    if (path === '/api/users/me') {
        return true;
    }
    const requestedUserId = path.split('/').pop();
    return user.userId === requestedUserId;
};

const isOwnUserForEmailVerification = (req: NextRequest, user: JwtPayload): boolean => {
    return true;
};

// Apply conditions for USER role
const userProfileReadGrant = rolePermissions[Role.USER].grants.find(g => g.action === 'read:own' && g.resource === 'profile');
if (userProfileReadGrant) {
    userProfileReadGrant.condition = isOwnProfile;
}

const userProfileUpdateGrant = rolePermissions[Role.USER].grants.find(g => g.action === 'update:own' && g.resource === 'profile');
if (userProfileUpdateGrant) {
    userProfileUpdateGrant.condition = isOwnProfile;
}

const userEmailVerificationGrant = rolePermissions[Role.USER].grants.find(g => g.action === 'request:emailVerification');
if (userEmailVerificationGrant) {
    userEmailVerificationGrant.condition = isOwnUserForEmailVerification;
}

// Apply conditions for SELLER role
const sellerProfileReadGrant = rolePermissions[Role.SELLER].grants.find(g => g.action === 'read:own' && g.resource === 'profile');
if (sellerProfileReadGrant) {
    sellerProfileReadGrant.condition = isOwnProfile;
}

const sellerProfileUpdateGrant = rolePermissions[Role.SELLER].grants.find(g => g.action === 'update:own' && g.resource === 'profile');
if (sellerProfileUpdateGrant) {
    sellerProfileUpdateGrant.condition = isOwnProfile;
}

const sellerEmailVerificationGrant = rolePermissions[Role.SELLER].grants.find(g => g.action === 'request:emailVerification');
if (sellerEmailVerificationGrant) {
    sellerEmailVerificationGrant.condition = isOwnUserForEmailVerification;
}

// Apply conditions for ADMIN role
const adminEmailVerificationGrant = rolePermissions[Role.ADMIN].grants.find(g => g.action === 'request:emailVerification');
if (adminEmailVerificationGrant) {
    adminEmailVerificationGrant.condition = isOwnUserForEmailVerification;
}
