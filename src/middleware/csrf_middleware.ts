import { NextRequest, NextResponse } from 'next/server';
import { validateCsrfForStateChange, isOriginAllowed } from '@/lib/csrf';

const CSRF_EXEMPT_PATHS = new Set([
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/verify_email',
]);

/**
 * Validates CSRF tokens for state-changing requests
 * Exempts certain authentication endpoints that issue tokens
 * @param req The incoming request
 * @returns NextResponse with error if validation fails, null to continue
 */
export function csrfMiddleware(req: NextRequest): NextResponse | null {
    const path = req.nextUrl.pathname;
    const method = req.method.toUpperCase();

    if (!path.startsWith('/api/')) {
        return null;
    }

    if (CSRF_EXEMPT_PATHS.has(path)) {
        return null;
    }

    const isStateChangingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (!isStateChangingMethod) {
        return null;
    }

    const origin = req.headers.get('origin');
    if (!isOriginAllowed(origin)) {
        return NextResponse.json(
            {
                success: false,
                message: 'Origin not allowed',
                error: 'Request origin is not in the allowed list'
            },
            { status: 403 }
        );
    }

    return validateCsrfForStateChange(req);
}
