import { NextResponse, NextRequest } from 'next/server';
import { verifyToken, verifyRefreshToken, parseTokenFromCookie } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { JwtPayload } from '@/types';
import { csrfMiddleware } from '@/middleware/csrf_middleware';
import { setStrictCorsHeaders } from '@/lib/csrf';

export const ADMIN_ROLE = 'ADMIN';

const PUBLIC_EXACT = new Set([
    '/api/health',
    '/api/health/db',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/verify_email',
    '/api/auth/refresh',
    '/api/marketplace',
    '/api/search',
    '/api/search/quick',
    '/api/search/filters',
    '/api/images/banner'
]);

function isPublicCardsGet(path: string, method: string) {
    if (method !== 'GET') return false;
    if (path === '/api/cards') return true;
    return path.startsWith('/api/cards/');
}

interface RouteRule {
    pattern: RegExp;
    methods: string[];
    resolve: (req: NextRequest, payload: JwtPayload) => { resource?: string; action?: string };
}

const ROUTE_RULES: RouteRule[] = [
    {
        pattern: /^\/api\/users$/,
        methods: ['GET'],
        resolve: (req, payload) => ({ resource: 'users', action: 'manage:any' })
    },
    {
        pattern: /^\/api\/users\/me$/,
        methods: ['GET', 'PATCH'],
        resolve: (req, payload) => ({ resource: 'profile', action: req.method === 'GET' ? 'read:own' : 'update:own' })
    },
    {
        pattern: /^\/api\/users\/me\/payment-methods$/,
        methods: ['GET', 'POST'],
        resolve: (req, payload) => ({ resource: 'payment_methods', action: req.method === 'GET' ? 'read:own' : 'create:own' })
    },
    {
        pattern: /^\/api\/users\/me\/payment-methods\/([^/]+)$/,
        methods: ['DELETE'],
        resolve: (req, payload) => ({ resource: 'payment_methods', action: 'delete:own' })
    },
    {
        pattern: /^\/api\/users\/([^/]+)$/,
        methods: ['GET', 'PATCH', 'DELETE'],
        resolve: (req, payload) => {
            if (req.method === 'GET') {
                return { resource: 'profile', action: payload.role === ADMIN_ROLE ? 'read:any' : 'read:own' };
            }
            if (req.method === 'PATCH') return { resource: 'profile', action: 'update:own' };
            if (req.method === 'DELETE') return { resource: 'profile', action: 'delete:any' };
            return {};
        }
    },
    {
        pattern: /^\/api\/users\/([^/]+)\/favorites$/,
        methods: ['GET', 'POST', 'DELETE'],
        resolve: (req, payload) => {
            if (req.method === 'GET') return { resource: 'favorites', action: payload.role === ADMIN_ROLE ? 'read:any' : 'read:own' };
            if (req.method === 'POST') return { resource: 'favorites', action: payload.role === ADMIN_ROLE ? 'create:any' : 'create:own' };
            if (req.method === 'DELETE') return { resource: 'favorites', action: payload.role === ADMIN_ROLE ? 'delete:any' : 'delete:own' };
            return {};
        }
    },
    {
        pattern: /^\/api\/auth\/send_verification_email$/,
        methods: ['POST'],
        resolve: () => ({ resource: 'auth', action: 'request:emailVerification' })
    },
    {
        pattern: /^\/api\/auth\/logout$/,
        methods: ['POST'],
        resolve: () => ({ resource: 'auth', action: 'logout' })
    },
    {
        pattern: /^\/api\/auth\/change-password$/,
        methods: ['POST'],
        resolve: () => ({ resource: 'auth', action: 'change:password' })
    },
    {
        pattern: /^\/api\/cards(\/.*)?$/,
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        resolve: (req, payload) => {
            if (req.method === 'GET') return { resource: 'cards', action: payload.role === ADMIN_ROLE ? 'read:any' : 'read:own' };
            if (req.method === 'POST') return { resource: 'cards', action: payload.role === ADMIN_ROLE ? 'create:any' : 'create:own' };
            if (req.method === 'PATCH') return { resource: 'cards', action: payload.role === ADMIN_ROLE ? 'update:any' : 'update:own' };
            if (req.method === 'DELETE') return { resource: 'cards', action: payload.role === ADMIN_ROLE ? 'delete:any' : 'delete:own' };
            return {};
        }
    },
    {
        pattern: /^\/api\/trades(\/.*)?$/,
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        resolve: (req, payload) => {
            if (req.method === 'GET') return { resource: 'trades', action: payload.role === ADMIN_ROLE ? 'read:any' : 'read:own' };
            if (req.method === 'POST') return { resource: 'trades', action: payload.role === ADMIN_ROLE ? 'create:any' : 'create:own' };
            if (req.method === 'PATCH') return { resource: 'trades', action: payload.role === ADMIN_ROLE ? 'update:any' : 'update:own' };
            if (req.method === 'DELETE') return { resource: 'trades', action: payload.role === ADMIN_ROLE ? 'delete:any' : 'delete:own' };
            return {};
        }
    },
    {
        pattern: /^\/api\/purchases(\/.*)?$/,
        methods: ['GET', 'POST', 'PATCH'],
        resolve: (req, payload) => {
            if (req.method === 'GET') return { resource: 'purchases', action: payload.role === ADMIN_ROLE ? 'read:any' : 'read:own' };
            if (req.method === 'POST') return { resource: 'purchases', action: payload.role === ADMIN_ROLE ? 'create:any' : 'create:own' };
            if (req.method === 'PATCH') return { resource: 'purchases', action: payload.role === ADMIN_ROLE ? 'update:any' : 'update:own' };
            return {};
        }
    },
    {
        pattern: /^\/api\/cart\/checkout$/,
        methods: ['POST'],
        resolve: (req, payload) => ({ resource: 'purchases', action: payload.role === ADMIN_ROLE ? 'create:any' : 'create:own' })
    },
    {
        pattern: /^\/api\/cart(\/.*)?$/,
        methods: ['GET', 'POST', 'DELETE'],
        resolve: (req, payload) => {
            if (req.method === 'GET') return { resource: 'cart', action: 'read:own' };
            if (req.method === 'POST') return { resource: 'cart', action: 'create:own' };
            if (req.method === 'DELETE') return { resource: 'cart', action: 'delete:own' };
            return {};
        }
    }
];

export async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;
    const method = req.method.toUpperCase();

    if (!path.startsWith('/api/')) {
        return NextResponse.next();
    }

    const csrfError = csrfMiddleware(req);
    if (csrfError) {
        return csrfError;
    }

    if (method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 204 });
        const origin = req.headers.get('origin');
        setStrictCorsHeaders(response, origin, 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        return response;
    }

    const isPublic = PUBLIC_EXACT.has(path) || isPublicCardsGet(path, method);
    if (isPublic) {
        return NextResponse.next();
    }

    let accessToken = parseTokenFromCookie(req.headers.get('cookie'), 'access_token');
    // console.log(`[Middleware] ${method} ${path} - Access token found:`, !!accessToken);
    
    if (!accessToken) {
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            accessToken = authHeader.substring(7);
        }
    }

    if (!accessToken) {
        // console.log(`[Middleware] ${method} ${path} - No access token, returning 401`);
        return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const decodedPayload: JwtPayload | null = await verifyToken(accessToken);

    if (!decodedPayload) {
        const refreshToken = parseTokenFromCookie(req.headers.get('cookie'), 'refresh_token');
        if (!refreshToken || !(await verifyRefreshToken(refreshToken))) {
            const response = NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
            response.cookies.delete('access_token');
            response.cookies.delete('refresh_token');
            return response;
        }
        const refreshUrl = new URL('/api/auth/refresh', req.url);
        refreshUrl.searchParams.set('redirect', path);
        return NextResponse.redirect(refreshUrl);
    }

    const matched = ROUTE_RULES.find(r => r.pattern.test(path));
    if (!matched) {
        return NextResponse.json({ success: false, message: 'Not Found' }, { status: 404 });
    }

    if (matched.methods.length && !matched.methods.includes(method)) {
        return NextResponse.json({ success: false, message: 'Method Not Allowed' }, { status: 405 });
    }

    const resolved = matched.resolve(req, decodedPayload) || {};
    const resource = resolved.resource;
    const action = resolved.action;

    if (!resource || !action) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const permitted = hasPermission(decodedPayload.role, resource, action, req, decodedPayload);
    if (!permitted) {
        let message = 'Forbidden';
        if (resource === 'profile' && action.includes(':own')) message = 'Forbidden: profile ownership required';
        else if (resource === 'favorites' && action.includes(':own')) message = 'Forbidden: favorites ownership required';
        else if (action.includes(':any') && decodedPayload.role !== ADMIN_ROLE) message = 'Forbidden: admin required';
        return NextResponse.json({ success: false, message }, { status: 403 });
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-data', JSON.stringify({ userId: decodedPayload.userId, role: decodedPayload.role }));
    if (!requestHeaders.get('x-request-id')) {
        requestHeaders.set('x-request-id', crypto.randomUUID());
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ['/api/:path*'] };