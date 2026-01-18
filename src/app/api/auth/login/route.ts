import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sanitizeEmail } from '@/lib/api_utils';
import {
  createSuccessResponse,
  createErrorResponse,
  getClientIP,
  getUserAgent,
  logAuditEvent,
  validateRequestSize,
} from '@/lib/api_utils';
import { Role } from '@prisma/client';
import { LoginSchema, LoginRequestBody } from '@/types/schemas/auth_schemas';
import { generateCsrfToken, setCsrfCookie, setStrictCorsHeaders } from '@/lib/csrf';

/**
 * Sets CORS headers for cross-origin requests with credentials
 * Uses strict origin checking for login endpoint
 */
function setCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  setStrictCorsHeaders(response, origin || null, 'POST, OPTIONS');
  return response;
}

/**
 * Handles CORS preflight requests
 */
export async function OPTIONS(req: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response, req.headers.get('origin'));
}

/**
 * Handles user login with secure HttpOnly cookie authentication
 */
export async function POST(req: NextRequest) {
  try {
    const isProd = process.env.NODE_ENV === 'production';

    // ✅ 动态 import，避免 build 阶段就加载 '@/lib/auth' 顶层检查
    const {
      verifyPassword,
      generateToken,
      generateRefreshToken,
      isRateLimited,
      recordFailedAttempt,
      clearFailedAttempts,
    } = await import('@/lib/auth');

    const origin = req.headers.get('origin');
    const clientIP = getClientIP(req.headers);

    if (isRateLimited(clientIP)) {
      logAuditEvent({
        action: 'LOGIN_RATE_LIMITED',
        ip: clientIP,
        userAgent: getUserAgent(req.headers),
        resource: 'auth',
        timestamp: new Date(),
      });
      const response = createErrorResponse('Too many login attempts. Please try again later.', 429);
      return setCorsHeaders(response, origin);
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      recordFailedAttempt(clientIP);
      logAuditEvent({
        action: 'LOGIN_INVALID_JSON',
        ip: clientIP,
        userAgent: getUserAgent(req.headers),
        resource: 'auth',
        timestamp: new Date(),
        details: { error: 'Invalid JSON format' },
      });
      const response = createErrorResponse('Invalid JSON format in request body', 400);
      return setCorsHeaders(response, origin);
    }

    if (!validateRequestSize(requestBody)) {
      recordFailedAttempt(clientIP);
      const response = createErrorResponse('Request too large', 413);
      return setCorsHeaders(response, origin);
    }

    const validationResult = LoginSchema.safeParse(requestBody);
    if (!validationResult.success) {
      recordFailedAttempt(clientIP);
      logAuditEvent({
        action: 'LOGIN_VALIDATION_FAILED',
        ip: clientIP,
        userAgent: getUserAgent(req.headers),
        resource: 'auth',
        timestamp: new Date(),
        details: { errors: validationResult.error.flatten().fieldErrors },
      });
      const response = createErrorResponse(
        'Invalid request data',
        400,
        validationResult.error.flatten().fieldErrors
      );
      return setCorsHeaders(response, origin);
    }

    const { email, password } = validationResult.data as LoginRequestBody;

    const sanitized = sanitizeEmail(email);
    if (!sanitized) {
      recordFailedAttempt(clientIP);
      const response = createErrorResponse('Invalid email format', 400);
      return setCorsHeaders(response, origin);
    }

    // ✅ Debug: 基础信息（不包含密码）
    if (!isProd) {
      console.log('[LOGIN] attempt', {
        email: sanitized,
        ip: clientIP,
        origin,
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: sanitized },
    });

    if (!user) {
      if (!isProd) console.log('[LOGIN] user not found', { email: sanitized });

      recordFailedAttempt(clientIP);
      logAuditEvent({
        action: 'LOGIN_USER_NOT_FOUND',
        ip: clientIP,
        userAgent: getUserAgent(req.headers),
        resource: 'auth',
        timestamp: new Date(),
        details: { email: sanitized },
      });
      const response = createErrorResponse('Invalid credentials', 401);
      return setCorsHeaders(response, origin);
    }

    // ✅ Debug: 看数据库里 password 到底是不是 bcrypt hash
    if (!isProd) {
      const pwHash = String(user.password ?? '');
      console.log('[LOGIN] user found', {
        userId: user.id,
        // bcrypt 通常以 $2a$ / $2b$ / $2y$ 开头，长度一般 60 左右
        hashPrefix: pwHash.slice(0, 4),
        hashLen: pwHash.length,
      });
    }

    // ✅ verifyPassword(hashedPassword, plainPassword)  ← 你 lib/auth.ts 是这么定义的
    const isPasswordValid = await verifyPassword(user.password, password);

    if (!isProd) {
      console.log('[LOGIN] password valid?', { userId: user.id, isPasswordValid });
    }

    if (!isPasswordValid) {
      recordFailedAttempt(clientIP);
      logAuditEvent({
        action: 'LOGIN_INVALID_PASSWORD',
        userId: user.id,
        ip: clientIP,
        userAgent: getUserAgent(req.headers),
        resource: 'auth',
        timestamp: new Date(),
      });
      const response = createErrorResponse('Invalid credentials', 401);
      return setCorsHeaders(response, origin);
    }

    clearFailedAttempts(clientIP);

    const accessToken = await generateToken(user.id, user.role as Role);
    const refreshToken = await generateRefreshToken(user.id, user.role as Role);
    const csrfToken = generateCsrfToken();

    logAuditEvent({
      action: 'LOGIN_SUCCESS',
      userId: user.id,
      ip: clientIP,
      userAgent: getUserAgent(req.headers),
      resource: 'auth',
      timestamp: new Date(),
    });

    const response = createSuccessResponse({ loginSuccess: true, csrfToken }, 'Login successful');

    const isHttps = req.headers.get('x-forwarded-proto') === 'https';

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    setCsrfCookie(response, csrfToken, isHttps);

    return setCorsHeaders(response, origin);
  } catch (error) {
    console.error('Login error:', error);
    const response = createErrorResponse('Internal server error', 500);
    return setCorsHeaders(response, req.headers.get('origin'));
  }
}
