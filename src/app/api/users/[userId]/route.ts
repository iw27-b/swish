import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
    try {
        const userId = params.userId;

        if (!userId) {
            return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                emailVerified: true,
                twoFactorEnabled: true,
                isSeller: true,
                sellerVerificationStatus: true,
                languagePreference: true,
            },
        });

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user, { status: 200 });
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
    try {
        const userId = params.userId;
        const body = await req.json();

        const { name, languagePreference } = body;

        if (!userId) {
            return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                name,
                languagePreference,
                // Add other updatable fields here
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                emailVerified: true,
                twoFactorEnabled: true,
                isSeller: true,
                sellerVerificationStatus: true,
                languagePreference: true,
            },
        });

        if (!user) {
            return NextResponse.json({ message: 'User not found or update failed' }, { status: 404 });
        }

        return NextResponse.json(user, { status: 200 });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
    try {
        const userId = params.userId;

        if (!userId) {
            return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id: userId },
        });

        return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
} 