import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { POST as loginUser } from '@/app/api/auth/login/route';
import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { DeepMockProxy } from 'vitest-mock-extended';
import * as authUtils from '@/lib/auth_utils';
import * as passwordUtils from '@/lib/password_utils';
import { Role } from '@prisma/client';

vi.mock('@/lib/password_utils', () => ({
    verifyPassword: vi.fn(),
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
};

let generateTokenSpy = vi.spyOn(authUtils, 'generateToken');

describe('POST /api/auth/login', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (passwordUtils.verifyPassword as any).mockReset();
        generateTokenSpy.mockReturnValue('mocked.jwt.token');
    });

    afterEach(() => {
        generateTokenSpy.mockRestore();
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
        expect(body.data.token).toBe('mocked.jwt.token');
        expect(body.data.user).toBeDefined();
        expect(body.data.user.email).toBe('test@example.com');
        expect(body.data.user.password).toBeUndefined(); // Password should not be returned
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