import { NextRequest, NextResponse } from 'next/server';
import { parseTokenFromCookie } from '@/lib/auth';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_MAX_AGE = 15 * 60;

/**
 * Generates a cryptographically secure CSRF token using Web Crypto API
 * Edge Runtime compatible
 * @returns A random hex string of CSRF_TOKEN_LENGTH bytes
 */
export function generateCsrfToken(): string {
    const randomBytes = new Uint8Array(CSRF_TOKEN_LENGTH);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Timing-safe string comparison using constant-time algorithm
 * Edge Runtime compatible alternative to crypto.timingSafeEqual
 * @param a First string to compare
 * @param b Second string to compare
 * @returns True if strings match, false otherwise
 */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
}

/**
 * Verifies that the CSRF token in the header matches the one in the cookie
 * @param req The incoming request
 * @returns True if tokens match, false otherwise
 */
export function verifyCsrfToken(req: NextRequest): boolean {
    const tokenFromHeader = req.headers.get(CSRF_HEADER_NAME);
    const tokenFromCookie = parseTokenFromCookie(req.headers.get('cookie'), CSRF_COOKIE_NAME);

    if (!tokenFromHeader || !tokenFromCookie) {
        return false;
    }

    return timingSafeEqual(tokenFromHeader, tokenFromCookie);
}

/**
 * Sets a CSRF cookie on the response
 * @param response The NextResponse object to modify
 * @param token The CSRF token to set
 * @param isProduction Whether running in production mode
 */
export function setCsrfCookie(response: NextResponse, token: string, isProduction: boolean = false): void {
    response.cookies.set(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: CSRF_TOKEN_MAX_AGE,
        path: '/'
    });
}

/**
 * Deletes the CSRF cookie from the response
 * @param response The NextResponse object to modify
 */
export function deleteCsrfCookie(response: NextResponse): void {
    response.cookies.delete(CSRF_COOKIE_NAME);
}

/**
 * Gets allowed origins for CORS validation
 * @returns Array of allowed origin URLs
 */
export function getAllowedOrigins(): string[] {
    return [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://swish-cards.vercel.app',
        process.env.NEXT_PUBLIC_APP_URL
    ].filter((origin): origin is string => Boolean(origin));
}

/**
 * Validates if the request origin is allowed
 * @param origin The origin header from the request
 * @returns True if origin is allowed or if no origin (same-origin request)
 */
export function isOriginAllowed(origin: string | null): boolean {
    if (!origin) return true;
    return getAllowedOrigins().includes(origin);
}

/**
 * Sets strict CORS headers for state-changing endpoints
 * Only allows requests from trusted origins
 * @param response The NextResponse object to modify
 * @param origin The origin header from the request
 * @param allowedMethods HTTP methods to allow
 */
export function setStrictCorsHeaders(
    response: NextResponse,
    origin: string | null,
    allowedMethods: string = 'POST, PUT, PATCH, DELETE, OPTIONS'
): void {
    const allowedOrigins = getAllowedOrigins();
    const isAllowed = origin && allowedOrigins.includes(origin);

    if (!isAllowed) {
        return;
    }

    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', allowedMethods);
    response.headers.set('Access-Control-Allow-Headers', `Content-Type, Authorization, Cookie, ${CSRF_HEADER_NAME}`);
    response.headers.set('Access-Control-Max-Age', '86400');
}

/**
 * Validates CSRF token for state-changing requests
 * Returns error response if validation fails
 * @param req The incoming request
 * @returns NextResponse with error if validation fails, null otherwise
 */
export function validateCsrfForStateChange(req: NextRequest): NextResponse | null {
    const method = req.method.toUpperCase();
    const isStateChangingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (!isStateChangingMethod) {
        return null;
    }

    const isValid = verifyCsrfToken(req);
    
    if (!isValid) {
        const tokenFromHeader = req.headers.get(CSRF_HEADER_NAME);
        const cookieHeader = req.headers.get('cookie');
        
        console.error('[CSRF] Validation failed:', {
            path: req.nextUrl.pathname,
            method,
            hasHeader: !!tokenFromHeader,
            hasCookie: cookieHeader?.includes(CSRF_COOKIE_NAME),
            origin: req.headers.get('origin'),
        });
        
        return NextResponse.json(
            {
                success: false,
                message: 'CSRF token validation failed',
                error: 'Invalid or missing CSRF token'
            },
            { status: 403 }
        );
    }

    return null;
}
