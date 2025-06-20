import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as registerUser } from '@/app/api/auth/register/route';
import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { DeepMockProxy } from 'vitest-mock-extended';
import * as passwordUtils from '@/lib/password_utils';

vi.mock('@/lib/password_utils', () => ({
    hashPassword: vi.fn().mockResolvedValue('hashedpassword'),
}));

const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

describe('POST /api/auth/register', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (passwordUtils.hashPassword as any).mockResolvedValue('hashedpassword');
    });

    it('should register a new user successfully', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);
        prismaMock.user.create.mockResolvedValue({
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            password: 'hashedpassword',
            role: 'USER',
            createdAt: new Date(),
            updatedAt: new Date(),
            emailVerified: false,
            emailVerificationToken: null,
            emailVerificationTokenExpiry: null,
            twoFactorEnabled: false,
            isSeller: false,
            sellerVerificationStatus: null,
            languagePreference: 'en',
            resetToken: null,
            resetTokenExpiry: null,
            shippingAddress: null,
            paymentMethods: [],
            securityPin: null,
            phoneNumber: null,
            dateOfBirth: null,
            profileImageUrl: null,
            bio: null,
        });

        const req = new NextRequest('http://localhost:3000/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'ValidPassword123!',
                name: 'Test User',
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        const response = await registerUser(req);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.message).toBe('User created successfully');
        expect(body.data.user).toBeDefined();
        expect(body.data.user.email).toBe('test@example.com');
        expect(body.data.user.password).toBeUndefined();
    });

    it('should return 409 if user already exists', async () => {
        prismaMock.user.findUnique.mockResolvedValue({
            id: '1',
            email: 'existing@example.com',
            name: 'Existing User',
            password: 'hashedpassword',
            role: 'USER',
            createdAt: new Date(),
            updatedAt: new Date(),
            emailVerified: false,
            emailVerificationToken: null,
            emailVerificationTokenExpiry: null,
            twoFactorEnabled: false,
            isSeller: false,
            sellerVerificationStatus: null,
            languagePreference: 'en',
            resetToken: null,
            resetTokenExpiry: null,
            shippingAddress: null,
            paymentMethods: [],
            securityPin: null,
            phoneNumber: null,
            dateOfBirth: null,
            profileImageUrl: null,
            bio: null,
        });

        const req = new NextRequest('http://localhost:3000/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email: 'existing@example.com',
                password: 'ValidPassword123!',
                name: 'Test User',
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        const response = await registerUser(req);
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body.success).toBe(false);
        expect(body.message).toBe('User already exists');
    });

    it('should return 400 for invalid request data', async () => {
        const req = new NextRequest('http://localhost:3000/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email: 'invalid-email',
                password: 'weak',
                name: '',
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        const response = await registerUser(req);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.success).toBe(false);
        expect(body.message).toBe('Invalid request data');
        expect(body.errors).toBeDefined();
    });
}); 