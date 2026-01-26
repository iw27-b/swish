import { NextRequest, NextResponse } from 'next/server';
import { validateCsrfForStateChange, isOriginAllowed } from '@/lib/csrf';

const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify_email',
  '/api/auth/refresh',
]);

/**
 * 允许来源判定（增强版）
 * - 继续复用你原来的 isOriginAllowed()
 * - 但额外允许：当前站点 req.nextUrl.origin、Vercel URL、以及环境变量 ALLOWED_ORIGINS
 */
function isOriginAllowedEnhanced(req: NextRequest, origin: string | null): boolean {
  // 1) 先走你原来的白名单逻辑（不破坏现有规则）
  if (origin && isOriginAllowed(origin)) return true;

  // 2) 允许同源（当前请求所在站点）
  //    你的前端页面和 /api 同域时，这个是最应该放行的
  const sameSiteOrigin = req.nextUrl.origin;
  if (origin && origin === sameSiteOrigin) return true;

  // 3) 允许 Vercel 自动域名（preview / prod）
  const vercelUrl = process.env.VERCEL_URL; // e.g. "swish-chi.vercel.app"
  if (origin && vercelUrl && origin === `https://${vercelUrl}`) return true;

  // 4) 允许显式配置的额外 origins（推荐在 Vercel 上配）
  //    ALLOWED_ORIGINS="https://swish-chi.vercel.app,https://yourdomain.com"
  const extra = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (origin && extra.includes(origin)) return true;

  // 5) 兜底：有些请求可能没有 Origin，但会有 Referer（少数情况）
  //    用 Referer 的 origin 再判断一次
  const referer = req.headers.get('referer');
  if (!origin && referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (isOriginAllowed(refererOrigin)) return true;
      if (refererOrigin === sameSiteOrigin) return true;
      if (vercelUrl && refererOrigin === `https://${vercelUrl}`) return true;
      if (extra.includes(refererOrigin)) return true;
    } catch {
      // ignore
    }
  }

  return false;
}

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

  // ✅ 用增强版 origin 校验
  if (!isOriginAllowedEnhanced(req, origin)) {
    return NextResponse.json(
      {
        success: false,
        message: 'Origin not allowed',
        error: 'Request origin is not in the allowed list',
        // ✅ 临时调试信息（确认修好后你可以删掉 debug）
        debug: {
          origin,
          sameSiteOrigin: req.nextUrl.origin,
          vercelUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
          allowedOriginsEnv: process.env.ALLOWED_ORIGINS ?? '',
        },
      },
      { status: 403 }
    );
  }

  return validateCsrfForStateChange(req);
}

