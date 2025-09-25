import { NextResponse, NextRequest } from 'next/server';
import { verifyToken, verifyRefreshToken, parseTokenFromCookie } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { JwtPayload } from '@/types';

export const ADMIN_ROLE = 'ADMIN';

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
    '/api/cards/recommended',
    '/api/marketplace', 
    '/api/search',
    '/api/search/quick',
    '/api/search/filters',
    '/api/images/banner',
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

    const decodedPayload: JwtPayload | null = await verifyToken(accessToken);
    
    if (!decodedPayload) {
        const refreshToken = parseTokenFromCookie(req.headers.get('cookie'), 'refresh_token');
        
        if (!refreshToken || !(await verifyRefreshToken(refreshToken))) {
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
        const isMeEndpoint = path === '/api/users/me';
        
        if (method === 'GET') {
            if (isMeEndpoint) {
                action = 'read:own'; // /api/users/me should always be allowed for authenticated users
            } else if (isSpecificUserPath) {
                action = 'read:own';
                if (decodedPayload.role === ADMIN_ROLE) action = 'read:any';
            } else {
                action = 'list:any';
            }
        }
        if (method === 'PATCH') action = 'update:own';
        if (method === 'DELETE') action = 'delete:any';

        if (resource === 'profile' && action === 'list:any' && decodedPayload.role === ADMIN_ROLE) {
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
    } else if (path.startsWith('/api/cart/checkout')) {
        resource = 'purchases';
        if (method === 'POST') {
            action = 'create:own';
        }
    }

    if (resource && action) {
        if (!hasPermission(decodedPayload.role, resource, action, req, decodedPayload)) {
            let message = 'Forbidden: You do not have permission to perform this action.';
            if (action.includes(':own') && resource === 'profile') {
                message = 'Forbidden: You can only perform this action on your own profile.';
            }
            if ((action.includes(':any') || action === 'delete:any') && decodedPayload.role !== ADMIN_ROLE) {
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