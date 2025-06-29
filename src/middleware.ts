import { NextResponse, NextRequest } from 'next/server';
import { verifyEdgeToken, parseTokenFromCookie } from '@/lib/edge_auth_utils';
import { hasPermission } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { JwtPayload } from '@/types';

const publicPaths: string[] = [
    '/api/health',
    '/api/health/db',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/verify_email',
    '/api/auth/refresh', 
    '/api/cards', 
    '/api/marketplace', 
];

export async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;
    const method = req.method;

    if (!path.startsWith('/api/')) {
        return NextResponse.next();
    }

    const isPublic = publicPaths.some(p => {
        if (p === '/api/cards' && method === 'GET') {
            return path === '/api/cards'; 
        }
        return path.startsWith(p);
    });

    if (isPublic) {
        return NextResponse.next();
    }

    let accessToken = parseTokenFromCookie(req.headers.get('cookie'), 'access_token');

    if (!accessToken) {
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            accessToken = authHeader.substring(7);
        }
    }

    if (!accessToken) {
        return NextResponse.json({ 
            success: false,
            message: 'Authentication required' 
        }, { status: 401 });
    }

    const decodedPayload: JwtPayload | null = await verifyEdgeToken(accessToken);
    
    if (!decodedPayload) {
        const refreshToken = parseTokenFromCookie(req.headers.get('cookie'), 'refresh_token');
        
        if (!refreshToken || !(await verifyEdgeToken(refreshToken))) {
            const response = NextResponse.json({ 
                success: false,
                message: 'Invalid or expired token' 
            }, { status: 401 });
            
            response.cookies.delete('access_token');
            response.cookies.delete('refresh_token');
            response.cookies.delete('user_data');
            
            return response;
        }
        
        const refreshUrl = new URL('/api/auth/refresh', req.url);
        refreshUrl.searchParams.set('redirect', path);
        return NextResponse.redirect(refreshUrl);
    }

    let resource = '';
    let action = '';

    if (path.startsWith('/api/users')) {
        resource = 'profile';
        const isSpecificUserPath = path.split('/').length > 3;
        
        if (method === 'GET') {
            action = isSpecificUserPath ? 'read:own' : 'list:any';
            if (decodedPayload.role === Role.ADMIN && isSpecificUserPath) action = 'read:any';
        }
        if (method === 'PATCH') action = 'update:own';
        if (method === 'DELETE') action = 'delete:any';

        if (resource === 'profile' && action === 'list:any' && decodedPayload.role === Role.ADMIN) {
            resource = 'users';
            action = 'manage:any';
        } 
    } else if (path.startsWith('/api/auth/send_verification_email')) {
        resource = 'auth';
        action = 'request:emailVerification';
    } else if (path.startsWith('/api/auth/logout')) {
        resource = 'auth';
        action = 'logout';
    } else if (path.startsWith('/api/auth/change-password')) {
        resource = 'auth';
        action = 'change:password';
    } else if (path.startsWith('/api/cards')) {
        if (method === 'GET') {
            resource = 'cards';
            action = 'read:own';
        } else if (method === 'POST') {
            resource = 'cards';
            action = 'create:own';
        } else if (method === 'PATCH' || method === 'DELETE') {
            resource = 'cards';
            action = method === 'PATCH' ? 'update:own' : 'delete:own';
        }
    } else if (path.startsWith('/api/search')) {
        resource = 'search';
        action = 'read:own';
    } else if (path.startsWith('/api/trades')) {
        resource = 'trades';
        if (method === 'GET') {
            action = 'read:own';
        } else if (method === 'POST') {
            action = 'create:own';
        } else if (method === 'PATCH' || method === 'DELETE') {
            action = 'update:own';
        }
    } else if (path.startsWith('/api/purchases')) {
        resource = 'purchases';
        if (method === 'GET') {
            action = 'read:own';
        } else if (method === 'POST') {
            action = 'create:own';
        } else if (method === 'PATCH') {
            action = 'update:own';
        }
    }

    if (resource && action) {
        if (!hasPermission(decodedPayload.role, resource, action, req, decodedPayload)) {
            let message = 'Forbidden: You do not have permission to perform this action.';
            if (action.includes(':own') && resource === 'profile') {
                message = 'Forbidden: You can only perform this action on your own profile.';
            }
            if ((action.includes(':any') || action === 'delete:any') && decodedPayload.role !== Role.ADMIN) {
                message = 'Forbidden: Admin access required.';
            }
            return NextResponse.json({ 
                success: false,
                message 
            }, { status: 403 });
        }
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/api/:path*', 
    ],
}; 