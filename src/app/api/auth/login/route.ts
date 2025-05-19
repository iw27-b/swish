import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth_utils';
import { Role } from '@prisma/client';
import { LoginSchema, LoginRequestBody } from '@/types/schemas/auth_schemas';

export async function POST(req: NextRequest) {
    try {
        const requestBody = await req.json();
        const validationResult = LoginSchema.safeParse(requestBody);

        if (!validationResult.success) {
            return NextResponse.json(
                { 
                    message: 'Invalid request data',
                    errors: validationResult.error.flatten().fieldErrors 
                },
                { status: 400 }
            );
        }

        const { email, password } = validationResult.data as LoginRequestBody;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
        }

        const token = generateToken(user.id, user.role as Role);

        const { password: _, ...userWithoutPassword } = user;

        return NextResponse.json({
            message: 'Login successful',
            token,
            user: userWithoutPassword,
        }, { status: 200 });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
} 