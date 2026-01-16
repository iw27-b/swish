import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ForgotPasswordSchema, ForgotPasswordRequestBody } from '@/types/schemas/user_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, sanitizeEmail } from '@/lib/api_utils';
import crypto from 'crypto';

async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;
  console.log(`Sending password reset email to ${email} with link: ${resetLink}`);
  return Promise.resolve();
}

export async function POST(req: NextRequest) {
  try {
    // ✅ 关键：动态 import，避免 build 阶段就执行 '@/lib/auth'
    const { isRateLimited, recordFailedAttempt, clearFailedAttempts } = await import('@/lib/auth');

    const clientIP = getClientIP(req.headers);

    if (isRateLimited(clientIP)) {
      logAuditEvent({
        action: 'PASSWORD_RESET_RATE_LIMITED',
        ip: clientIP,
        userAgent: getUserAgent(req.headers),
        resource: 'auth',
        timestamp: new Date(),
      });
      return createErrorResponse('Too many password reset attempts. Please try again later.', 429);
    }

    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 100000) {
      recordFailedAttempt(clientIP);
      return createErrorResponse('Request too large', 413);
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      recordFailedAttempt(clientIP);
      logAuditEvent({
        action: 'PASSWORD_RESET_INVALID_JSON',
        ip: clientIP,
        userAgent: getUserAgent(req.headers),
        resource: 'auth',
        timestamp: new Date(),
        details: { error: 'Invalid JSON format' },
      });
      return createErrorResponse('Invalid JSON format in request body', 400);
    }

    const validationResult = ForgotPasswordSchema.safeParse(requestBody);
    if (!validationResult.success) {
      recordFailedAttempt(clientIP);
      return createErrorResponse('Invalid request data', 400, validationResult.error.flatten().fieldErrors);
    }

    const { email } = validationResult.data as ForgotPasswordRequestBody;
    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      recordFailedAttempt(clientIP);
      return createErrorResponse('Invalid email format', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      logAuditEvent({
        action: 'PASSWORD_RESET_NONEXISTENT_USER',
        ip: clientIP,
        userAgent: getUserAgent(req.headers),
        resource: 'auth',
        timestamp: new Date(),
        details: { email: sanitizedEmail },
      });

      return createSuccessResponse(null, 'If an account with that email exists, we have sent a password reset link.');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    try {
      await sendPasswordResetEmail(user.email, resetToken);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    clearFailedAttempts(clientIP);

    logAuditEvent({
      action: 'PASSWORD_RESET_REQUESTED',
      userId: user.id,
      ip: clientIP,
      userAgent: getUserAgent(req.headers),
      resource: 'auth',
      timestamp: new Date(),
      details: { email: sanitizedEmail },
    });

    return createSuccessResponse(null, 'If an account with that email exists, we have sent a password reset link.');
  } catch (error) {
    console.error('Forgot password error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
