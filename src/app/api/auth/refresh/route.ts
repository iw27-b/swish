import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, generateToken, parseTokenFromCookie } from '@/lib/auth';
import {
  createSuccessResponse,
  createErrorResponse,
  getClientIP,
  getUserAgent,
  logAuditEvent,
} from '@/lib/api_utils';
import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { generateCsrfToken, setCsrfCookie, setStrictCorsHeaders } from '@/lib/csrf';

function setCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  setStrictCorsHeaders(response, origin || null, 'POST, OPTIONS');
  return response;
}

export async function OPTIONS(req: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response, req.headers.get('origin'));
}

export async function POST(req: NextRequest) {
  try {
    const clientIP = getClientIP(req.headers);

    // ✅ 最稳：优先用 req.cookies（Next 官方方式），再 fallback 旧方法
    const refreshToken =
      req.cookies.get('refresh_token')?.value ||
      parseTokenFromCookie(req.headers.get('cookie') || '', 'refresh_token');

    if (!refreshToken) {
      const response = createErrorResponse('Refresh token required', 401);
      return setCorsHeaders(response, req.headers.get('origin'));
    }

    const decodedPayload = await verifyRefreshToken(refreshToken);
    if (!decodedPayload) {
      logAuditEvent({
        action: 'TOKEN_REFRESH_INVALID',
        ip: clientIP,
        userAgent: getUserAgent(req.headers),
        resource: 'auth',
        timestamp: new Date(),
      });

      const response = createErrorResponse('Invalid or expired refresh token', 401);
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
      return setCorsHeaders(response, req.headers.get('origin'));
    }

    const user = await prisma.user.findUnique({
      where: { id: decodedPayload.userId },
    });

    if (!user) {
      logAuditEvent({
        action: 'TOKEN_REFRESH_USER_NOT_FOUND',
        userId: decodedPayload.userId,
        ip: clientIP,
        userAgent: getUserAgent(req.headers),
        resource: 'auth',
        timestamp: new Date(),
      });

      const response = createErrorResponse('User not found', 401);
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
      return setCorsHeaders(response, req.headers.get('origin'));
    }

    const newAccessToken = await generateToken(user.id, user.role as Role);
    const csrfToken = generateCsrfToken();

    logAuditEvent({
      action: 'TOKEN_REFRESH_SUCCESS',
      userId: user.id,
      ip: clientIP,
      userAgent: getUserAgent(req.headers),
      resource: 'auth',
      timestamp: new Date(),
    });

    const response = createSuccessResponse({ csrfToken }, 'Token refreshed successfully');

    const isProduction = process.env.NODE_ENV === 'production';

    // ✅ 同站点：先用 lax 最稳（避免 cookie 被浏览器策略吞掉）
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    setCsrfCookie(response, csrfToken, isProduction);

    return setCorsHeaders(response, req.headers.get('origin'));
  } catch (error) {
    console.error('Token refresh error:', error);
    const response = createErrorResponse('Internal server error', 500);
    return setCorsHeaders(response, req.headers.get('origin'));
  }
}
