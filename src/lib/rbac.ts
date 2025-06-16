import { Role } from '@prisma/client';
import { JwtPayload } from '@/types';
import { NextRequest } from 'next/server';

const rolePermissions: Record<Role, { grants: Array<{ resource: string; action: string; condition?: (req: NextRequest, user: JwtPayload) => boolean }> }> = {
    [Role.USER]: {
        grants: [
            { resource: 'profile', action: 'read:own' },
            { resource: 'profile', action: 'update:own' },
            { resource: 'auth', action: 'request:emailVerification' },
        ],
    },
    [Role.SELLER]: {
        grants: [
            { resource: 'profile', action: 'read:own' },
            { resource: 'profile', action: 'update:own' },
            { resource: 'auth', action: 'request:emailVerification' },
            { resource: 'listings', action: 'manage:own' },
        ],
    },
    [Role.ADMIN]: {
        grants: [
            { resource: 'profile', action: 'read:any' },
            { resource: 'profile', action: 'update:any' },
            { resource: 'profile', action: 'delete:any' },
            { resource: 'users', action: 'manage:any' },
            { resource: 'auth', action: 'request:emailVerification' },
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
    const requestedUserId = req.nextUrl.pathname.split('/').pop();
    return user.userId === requestedUserId;
};

const isOwnUserForEmailVerification = (req: NextRequest, user: JwtPayload): boolean => {
    return true;
};

rolePermissions[Role.USER].grants.find(g => g.action === 'read:own')!.condition = isOwnProfile;
rolePermissions[Role.USER].grants.find(g => g.action === 'update:own')!.condition = isOwnProfile;
rolePermissions[Role.USER].grants.find(g => g.action === 'request:emailVerification')!.condition = isOwnUserForEmailVerification;

rolePermissions[Role.SELLER].grants.find(g => g.action === 'read:own')!.condition = isOwnProfile;
rolePermissions[Role.SELLER].grants.find(g => g.action === 'update:own')!.condition = isOwnProfile;
rolePermissions[Role.SELLER].grants.find(g => g.action === 'request:emailVerification')!.condition = isOwnUserForEmailVerification;

rolePermissions[Role.ADMIN].grants.find(g => g.action === 'request:emailVerification')!.condition = isOwnUserForEmailVerification;
