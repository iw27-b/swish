import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ForgotPasswordSchema, ForgotPasswordRequestBody } from '@/types/schemas/user_schemas';
import { createSuccessResponse, createErrorResponse, getClientIP, getUserAgent, logAuditEvent, validateRequestSize } from '@/lib/api_utils';
import { sanitizeEmail, isRateLimited, recordFailedAttempt, clearFailedAttempts } from '@/lib/auth_utils';
import crypto from 'crypto';

async function sendPasswordResetEmail(email: string, token: string) {
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;
    console.log(`Sending password reset email to ${email} with link: ${resetLink}`);

    // await emailService.send({
    //   to: email,
    //   subject: 'Reset Your Password',
    //   html: `
    //     <h2>Password Reset Request</h2>
    //     <p>You requested a password reset. Click the link below to reset your password:</p>
    //     <a href="${resetLink}">Reset Password</a>
    //     <p>This link will expire in 1 hour.</p>
    //     <p>If you didn't request this, please ignore this email.</p>
    //   `,
    // });
    
    return Promise.resolve();
}

/**
 * This route is used to send a password reset email to the user.
 * @param req NextRequest - The request object
 * @returns JSON response with success or error message
 */

export async function POST(req: NextRequest) {
    try {
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

        const requestBody = await req.json();

        const validationResult = ForgotPasswordSchema.safeParse(requestBody);
        if (!validationResult.success) {
            recordFailedAttempt(clientIP);
            return createErrorResponse(
                'Invalid request data',
                400,
                validationResult.error.flatten().fieldErrors
            );
        }

        const { email } = validationResult.data as ForgotPasswordRequestBody;
        const sanitizedEmail = sanitizeEmail(email);

        const user = await prisma.user.findUnique({
            where: { email: sanitizedEmail },
            select: { id: true, email: true, name: true }
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
            
            return createSuccessResponse(
                null,
                'If an account with that email exists, we have sent a password reset link.'
            );
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600 * 1000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: resetToken,
                resetTokenExpiry: resetTokenExpiry,
            },
        });

        try {
            await sendPasswordResetEmail(user.email, resetToken);
        } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
            // Don't reveal email sending failures to prevent information disclosure
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

        return createSuccessResponse(
            null,
            'If an account with that email exists, we have sent a password reset link.'
        );

    } catch (error) {
        console.error('Forgot password error:', error);
        return createErrorResponse('Internal server error', 500);
    }
} 