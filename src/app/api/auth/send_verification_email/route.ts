import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { withAuth } from '@/lib/auth';

async function sendVerificationEmail(email: string, token: string) {
    const verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/verify_email/${token}`;
    console.log(`Sending verification email to ${email} with link: ${verificationLink}`);
    return Promise.resolve();
}

/**
 * This route is used to send a verification email to the user.
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @returns JSON response with success or error message
 */

export const POST = withAuth(async (_req, user) => {
    const { userId } = user;

    try {
        const dbUser = await prisma.user.findUnique({ where: { id: userId } });

        if (!dbUser) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        if (dbUser.emailVerified) {
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

        await sendVerificationEmail(dbUser.email, emailVerificationToken);

        return NextResponse.json({ message: 'Verification email sent. Please check your inbox.' }, { status: 200 });

    } catch (error) {
        console.error('Send verification email error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}); 