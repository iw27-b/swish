import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { POST as loginUser } from '@/app/api/auth/login/route';
import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { DeepMockProxy } from 'vitest-mock-extended';
import * as edgeAuthUtils from '@/lib/edge_auth_utils';
import * as passwordUtils from '@/lib/password_utils';
import { Role } from '@prisma/client';

vi.mock('@/lib/password_utils', () => ({
    verifyPassword: vi.fn(),
}));

vi.mock('@/lib/edge_auth_utils', () => ({
    generateEdgeToken: vi.fn(),
    generateEdgeRefreshToken: vi.fn(),
}));

const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedpassword',
    role: Role.USER,
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
};

describe('POST /api/auth/login', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (passwordUtils.verifyPassword as any).mockReset();
        (edgeAuthUtils.generateEdgeToken as any).mockResolvedValue('mocked.jwt.token');
        (edgeAuthUtils.generateEdgeRefreshToken as any).mockResolvedValue('mocked.refresh.token');
    });

    it('should login a user and return a token successfully', async () => {
        prismaMock.user.findUnique.mockResolvedValue(mockUser);
        (passwordUtils.verifyPassword as any).mockResolvedValue(true);

        const req = new NextRequest('http://localhost:3000/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'ValidPassword123!',
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        const response = await loginUser(req);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.message).toBe('Login successful');
        expect(body.data.loginSuccess).toBe(true);
        
        // Check cookies are set
        const cookies = response.headers.get('set-cookie');
        expect(cookies).toContain('access_token=');
        expect(cookies).toContain('refresh_token=');
        expect(cookies).toContain('user_data=');
    });

    it('should return 401 for non-existent user', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        const req = new NextRequest('http://localhost:3000/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'nouser@example.com',
                password: 'ValidPassword123!',
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        const response = await loginUser(req);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.success).toBe(false);
        expect(body.message).toBe('Invalid credentials');
    });

    it('should return 401 for incorrect password', async () => {
        prismaMock.user.findUnique.mockResolvedValue(mockUser);
        (passwordUtils.verifyPassword as any).mockResolvedValue(false);

        const req = new NextRequest('http://localhost:3000/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'WrongPassword123!',
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        const response = await loginUser(req);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.success).toBe(false);
        expect(body.message).toBe('Invalid credentials');
    });

    it('should return 400 for invalid request data', async () => {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'invalid-email',
                password: '',
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        const response = await loginUser(req);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.success).toBe(false);
        expect(body.message).toBe('Invalid request data');
        expect(body.errors).toBeDefined();
    });
}); 