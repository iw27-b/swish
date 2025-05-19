import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { AuthenticatedRequest } from '@/types';

// Mock email sending function - implement something like Resend or SendGrid later.
async function sendVerificationEmail(email: string, token: string) {
    const verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/verify_email/${token}`;
    console.log(`Sending verification email to ${email} with link: ${verificationLink}`);
    // await emailService.send({
    //   to: email,
    //   subject: 'Verify Your Email Address',
    //   html: `<p>Please click this link to verify your email: <a href="${verificationLink}">${verificationLink}</a></p><p>This link will expire in 1 hour.</p>`,
    // });
    return Promise.resolve();
}

export async function POST(req: AuthenticatedRequest) {
    if (!req.user) {
        return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { userId } = req.user;

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        if (user.emailVerified) {
            return NextResponse.json({ message: 'Email already verified' }, { status: 400 });
        }

        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerificationTokenExpiry = new Date(Date.now() + 3600 * 1000);

        await prisma.user.update({
            where: { id: userId },
            data: {
                emailVerificationToken,
                emailVerificationTokenExpiry,
            },
        });

        await sendVerificationEmail(user.email, emailVerificationToken);

        return NextResponse.json({ message: 'Verification email sent. Please check your inbox.' }, { status: 200 });

    } catch (error) {
        console.error('Send verification email error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
} 