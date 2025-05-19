import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { RegisterSchema, RegisterRequestBody } from '@/types/schemas/auth_schemas';

export async function POST(req: NextRequest) {
    try {
        const requestBody = await req.json();
        const validationResult = RegisterSchema.safeParse(requestBody);

        if (!validationResult.success) {
            return NextResponse.json(
                { 
                    message: 'Invalid request data', 
                    errors: validationResult.error.flatten().fieldErrors 
                },
                { status: 400 }
            );
        }
        
        const { email, password, name } = validationResult.data as RegisterRequestBody;

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ message: 'User already exists' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
        });

        const { password: _, ...userWithoutPassword } = user;

        return NextResponse.json({ message: 'User created successfully', user: userWithoutPassword }, { status: 201 });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
} 