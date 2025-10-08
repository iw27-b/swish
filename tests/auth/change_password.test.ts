import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as changePassword } from '@/app/api/auth/change-password/route';
import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { DeepMockProxy } from 'vitest-mock-extended';
import * as authUtils from '@/lib/auth';
import { Role } from '@prisma/client';

vi.mock('@/lib/auth', async () => {
    const actual = await vi.importActual('@/lib/auth');
    return {
        ...actual,
        getAuthenticatedUser: vi.fn(),
        hashPassword: vi.fn(),
        verifyPassword: vi.fn(),
    };
});

const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: '$2a$12$hashedOldPassword',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerified: true,
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

describe('POST /api/auth/change-password', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should change password successfully with awaited hash', async () => {
        (authUtils.getAuthenticatedUser as any).mockResolvedValue({
            userId: 'user-123',
            role: Role.USER
        });

        prismaMock.user.findUnique.mockResolvedValue(mockUser);
        (authUtils.verifyPassword as any)
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false);
        (authUtils.hashPassword as any).mockResolvedValue('$2a$12$hashedNewPassword');

        prismaMock.user.update.mockResolvedValue({
            ...mockUser,
            password: '$2a$12$hashedNewPassword',
        });

        const req = new NextRequest('http://localhost:3000/api/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                currentPassword: 'OldPassword123!',
                newPassword: 'NewPassword456!',
                confirmPassword: 'NewPassword456!',
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        const response = await changePassword(req);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.message).toBe('Password changed successfully');

        expect(authUtils.hashPassword).toHaveBeenCalledWith('NewPassword456!');
        expect(prismaMock.user.update).toHaveBeenCalledWith({
            where: { id: 'user-123' },
            data: {
                password: '$2a$12$hashedNewPassword',
                updatedAt: expect.any(Date)
            }
        });

        const updateCall = (prismaMock.user.update as any).mock.calls[0][0];
        expect(typeof updateCall.data.password).toBe('string');
        expect(updateCall.data.password).not.toMatch(/\[object Promise\]/);
    });

    it('should return 401 if user is not authenticated', async () => {
        (authUtils.getAuthenticatedUser as any).mockResolvedValue(null);

        const req = new NextRequest('http://localhost:3000/api/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                currentPassword: 'OldPassword123!',
                newPassword: 'NewPassword456!',
                confirmPassword: 'NewPassword456!',
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        const response = await changePassword(req);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error).toBe('Unauthorized');
    });

    it('should return 400 if current password is incorrect', async () => {
        (authUtils.getAuthenticatedUser as any).mockResolvedValue({
            userId: 'user-123',
            role: Role.USER
        });

        prismaMock.user.findUnique.mockResolvedValue(mockUser);
        (authUtils.verifyPassword as any).mockResolvedValue(false);

        const req = new NextRequest('http://localhost:3000/api/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                currentPassword: 'WrongPassword123!',
                newPassword: 'NewPassword456!',
                confirmPassword: 'NewPassword456!',
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        const response = await changePassword(req);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe('Current password is incorrect');
    });

    it('should return 400 if new password is same as current password', async () => {
        (authUtils.getAuthenticatedUser as any).mockResolvedValue({
            userId: 'user-123',
            role: Role.USER
        });

        prismaMock.user.findUnique.mockResolvedValue(mockUser);
        (authUtils.verifyPassword as any).mockResolvedValue(true);

        const req = new NextRequest('http://localhost:3000/api/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                currentPassword: 'SamePassword123!',
                newPassword: 'SamePassword123!',
                confirmPassword: 'SamePassword123!',
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        const response = await changePassword(req);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe('New password must be different from current password');
    });
});
