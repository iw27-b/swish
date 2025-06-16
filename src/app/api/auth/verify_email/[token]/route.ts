import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * This route is used to verify the email of the user.
 * @param req NextRequest - The request object
 * @param params - The token to verify the email
 * @returns JSON response with success or error message
 */

export async function GET(
    req: NextRequest,
    { params }: { params: { token: string } }
) {
    const { token } = params;

    if (!token) {
        return NextResponse.json({ message: 'Verification token is required' }, { status: 400 });
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                emailVerificationToken: token,
                emailVerificationTokenExpiry: { gt: new Date() },
            },
        });

        if (!user) {
            return NextResponse.json({ message: 'Invalid or expired verification token' }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerificationToken: null,
                emailVerificationTokenExpiry: null,
            },
        });

        return NextResponse.json({ message: 'Email verified successfully' }, { status: 200 });

    } catch (error) {
        console.error('Email verification error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
} 