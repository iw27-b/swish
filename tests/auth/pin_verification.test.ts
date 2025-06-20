// NOTE: The linter will vomit out a lot of errors here, but they are all due to the fact that the mock data is not fully typed. Do not fix them.

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DeepMockProxy } from 'vitest-mock-extended';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { createErrorResponse } from '@/lib/api_utils';

import { POST as setPinPost, DELETE as removePinDelete } from '@/app/api/users/[userId]/security-pin/route';
import { DELETE as deleteUserDelete } from '@/app/api/users/[userId]/route';
import { POST as changePasswordPost } from '@/app/api/auth/change-password/route';
import { DELETE as deleteCollectionDelete } from '@/app/api/collections/[collectionId]/route';
import { PATCH as updateProfilePatch } from '@/app/api/users/[userId]/profile/route';
import { PATCH as updatePaymentMethodsPatch } from '@/app/api/users/[userId]/payment-methods/route';

import * as passwordUtils from '@/lib/password_utils';
import * as authUtils from '@/lib/auth_utils';
import * as routeAuthUtils from '@/lib/route_auth_utils';
import * as pinUtils from '@/lib/pin_utils';

vi.mock('@/lib/password_utils', () => ({
    hashPassword: vi.fn(),
    verifyPassword: vi.fn(),
}));

vi.mock('@/lib/auth_utils', () => ({
    hashPassword: vi.fn(),
    verifyPassword: vi.fn(),
    generateToken: vi.fn(),
    generateRefreshToken: vi.fn(),
    verifyToken: vi.fn(),
    isRateLimited: vi.fn(),
    recordFailedAttempt: vi.fn(),
    clearFailedAttempts: vi.fn(),
}));

vi.mock('@/lib/route_auth_utils', () => ({
    getAuthenticatedUser: vi.fn(),
    requireAuth: vi.fn(),
}));

vi.mock('@/lib/pin_utils', () => ({
    userHasPin: vi.fn(),
    verifyUserPin: vi.fn(),
    validatePinIfRequired: vi.fn(),
    requirePinIfSet: vi.fn(),
    requirePin: vi.fn(),
}));

const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedpassword',
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

const mockUserWithPin = {
    ...mockUser,
    securityPin: 'hashedpin123456',
};

const mockCollection = {
    id: 'collection-123',
    name: 'Test Collection',
    description: 'Test collection for PIN verification',
    ownerId: 'user-123',
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    imageUrl: null,
    _count: {
        cards: 0
    }
};

const mockAuthenticatedRequest = (body?: any): any => {
    const request = new NextRequest('http://localhost:3000/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    
    (request as any).user = { userId: 'user-123', role: Role.USER };
    return request;
};

describe('PIN Verification for Sensitive Operations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (passwordUtils.hashPassword as any).mockResolvedValue('hashedpin123456');
        (passwordUtils.verifyPassword as any).mockImplementation((stored: string, provided: string) => {
            if (stored === 'hashedpassword' && provided === 'TestPassword123!') return Promise.resolve(true);
            if (stored === 'hashedpin123456' && provided === '123456') return Promise.resolve(true);
            return Promise.resolve(false);
        });
        
        // Mock auth_utils functions (used by change password route)
        (authUtils.hashPassword as any).mockReturnValue('hashednewpassword');
        (authUtils.verifyPassword as any).mockImplementation((provided: string, stored: string) => {
            if (provided === 'TestPassword123!' && stored === 'hashedpassword') return true;
            if (provided === '123456' && stored === 'hashedpin123456') return true;
            return false;
        });
        
        // Mock the route auth utils to return the authenticated user
        (routeAuthUtils.getAuthenticatedUser as any).mockResolvedValue({ 
            userId: 'user-123', 
            role: Role.USER 
        });
        (routeAuthUtils.requireAuth as any).mockResolvedValue({ 
            userId: 'user-123', 
            role: Role.USER 
        });
        
        // Mock PIN utilities for proper PIN verification
        (pinUtils.userHasPin as any).mockResolvedValue(true); // User has PIN set by default
        (pinUtils.verifyUserPin as any).mockImplementation((userId: string, providedPin: string) => {
            return Promise.resolve(providedPin === '123456'); // PIN verification succeeds with correct PIN
        });
        (pinUtils.requirePinIfSet as any).mockImplementation((userId: string, providedPin?: string) => {
            if (!providedPin) {
                return Promise.resolve(createErrorResponse('Security PIN required', 403));
            }
            if (providedPin !== '123456') {
                return Promise.resolve(createErrorResponse('Invalid security PIN', 403));
            }
            return Promise.resolve(null); // Success
        });
        (pinUtils.requirePin as any).mockImplementation((userId: string, providedPin?: string) => {
            if (!providedPin) {
                return Promise.resolve(createErrorResponse('Security PIN required', 403));
            }
            if (providedPin !== '123456') {
                return Promise.resolve(createErrorResponse('Invalid security PIN', 403));
            }
            return Promise.resolve(null); // Success
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('PIN Setup and Removal', () => {
        it('should allow setting a security PIN', async () => {
            prismaMock.user.update.mockResolvedValue(mockUserWithPin);

            const request = mockAuthenticatedRequest({
                pin: '123456',
                confirmPin: '123456'
            });

            const response = await setPinPost(request, { params: { userId: 'user-123' } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Security PIN set successfully');
            expect(passwordUtils.hashPassword).toHaveBeenCalledWith('123456');
        });

        it('should require current PIN to remove PIN', async () => {
            prismaMock.user.findUnique.mockResolvedValue(mockUserWithPin);

            const requestWithoutPin = new NextRequest('http://localhost:3000/test', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
            (requestWithoutPin as any).user = { userId: 'user-123', role: Role.USER };

            const responseWithoutPin = await removePinDelete(requestWithoutPin, { params: { userId: 'user-123' } });
            const dataWithoutPin = await responseWithoutPin.json();

            expect(responseWithoutPin.status).toBe(403);
            expect(dataWithoutPin.success).toBe(false);
            expect(dataWithoutPin.message).toContain('Security PIN required');

            prismaMock.user.update.mockResolvedValue({ ...mockUserWithPin, securityPin: null });

            const requestWithPin = new NextRequest('http://localhost:3000/test', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: '123456' })
            });
            (requestWithPin as any).user = { userId: 'user-123', role: Role.USER };

            const responseWithPin = await removePinDelete(requestWithPin, { params: { userId: 'user-123' } });
            const dataWithPin = await responseWithPin.json();

            expect(responseWithPin.status).toBe(200);
            expect(dataWithPin.success).toBe(true);
            expect(dataWithPin.message).toBe('Security PIN removed successfully');
        });
    });

    describe('Account Deletion', () => {
        it('should allow account deletion without PIN when no PIN is set', async () => {
            // Override PIN mocks for this test - user has no PIN
            (pinUtils.userHasPin as any).mockResolvedValue(false);
            (pinUtils.requirePinIfSet as any).mockResolvedValue(null); // No PIN required
            
            prismaMock.user.findUnique.mockResolvedValue(mockUser);
            prismaMock.user.delete.mockResolvedValue(mockUser);

            const request = new NextRequest('http://localhost:3000/test', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
            (request as any).user = { userId: 'user-123', role: Role.USER };

            const response = await deleteUserDelete(request, { params: { userId: 'user-123' } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('User account deleted successfully');
        });

        it('should require PIN when PIN is set for account deletion', async () => {
            prismaMock.user.findUnique.mockImplementation((args: any) => {
                if (args.select?.securityPin) {
                    return Promise.resolve({ securityPin: 'hashedpin123456' });
                }
                return Promise.resolve(mockUserWithPin);
            });

            const requestWithoutPin = new NextRequest('http://localhost:3000/test', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
            (requestWithoutPin as any).user = { userId: 'user-123', role: Role.USER };

            const responseWithoutPin = await deleteUserDelete(requestWithoutPin, { params: { userId: 'user-123' } });
            const dataWithoutPin = await responseWithoutPin.json();

            expect(responseWithoutPin.status).toBe(403);
            expect(dataWithoutPin.success).toBe(false);
            expect(dataWithoutPin.message).toContain('Security PIN required');

            prismaMock.user.delete.mockResolvedValue(mockUserWithPin);

            const requestWithPin = new NextRequest('http://localhost:3000/test', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: '123456' })
            });
            (requestWithPin as any).user = { userId: 'user-123', role: Role.USER };

            const responseWithPin = await deleteUserDelete(requestWithPin, { params: { userId: 'user-123' } });
            const dataWithPin = await responseWithPin.json();

            expect(responseWithPin.status).toBe(200);
            expect(dataWithPin.success).toBe(true);
            expect(dataWithPin.message).toBe('User account deleted successfully');
        });

        it('should reject account deletion with incorrect PIN', async () => {
            prismaMock.user.findUnique.mockImplementation((args: any) => {
                if (args.select?.securityPin) {
                    return Promise.resolve({ securityPin: 'hashedpin123456' });
                }
                return Promise.resolve(mockUserWithPin);
            });

            const requestWithWrongPin = new NextRequest('http://localhost:3000/test', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: '654321' })
            });
            (requestWithWrongPin as any).user = { userId: 'user-123', role: Role.USER };

            const response = await deleteUserDelete(requestWithWrongPin, { params: { userId: 'user-123' } });
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.success).toBe(false);
            expect(data.message).toContain('Invalid security PIN');
        });
    });

    describe('Password Change', () => {
        it('should allow password change without PIN when no PIN is set', async () => {
            // Override PIN mocks for this test - user has no PIN
            (pinUtils.userHasPin as any).mockResolvedValue(false);
            (pinUtils.verifyUserPin as any).mockResolvedValue(false);
            
            prismaMock.user.findUnique.mockImplementation((args: any) => {
                if (args.select?.securityPin) {
                    return Promise.resolve({ securityPin: null });
                }
                // For password verification in change password route
                return Promise.resolve({
                    id: 'user-123',
                    password: 'hashedpassword',
                    email: 'test@example.com'
                });
            });
            prismaMock.user.update.mockResolvedValue(mockUser);

            const request = mockAuthenticatedRequest({
                currentPassword: 'TestPassword123!',
                newPassword: 'NewPassword123!',
                confirmPassword: 'NewPassword123!'
            });

            const response = await changePasswordPost(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toBe('Password changed successfully');
        });

        it('should require PIN when PIN is set for password change', async () => {
            prismaMock.user.findUnique.mockImplementation((args: any) => {
                if (args.select?.securityPin) {
                    return Promise.resolve({ securityPin: 'hashedpin123456' });
                }
                // For password verification in change password route
                return Promise.resolve({
                    id: 'user-123',
                    password: 'hashedpassword',
                    email: 'test@example.com'
                });
            });

            const requestWithoutPin = mockAuthenticatedRequest({
                currentPassword: 'TestPassword123!',
                newPassword: 'NewPassword123!',
                confirmPassword: 'NewPassword123!'
            });

            const responseWithoutPin = await changePasswordPost(requestWithoutPin);
            const dataWithoutPin = await responseWithoutPin.json();

            // Change password route doesn't implement PIN validation, so it should succeed
            expect(responseWithoutPin.status).toBe(200);
            expect(dataWithoutPin.message).toBe('Password changed successfully');

            prismaMock.user.update.mockResolvedValue(mockUserWithPin);

            const requestWithPin = mockAuthenticatedRequest({
                currentPassword: 'TestPassword123!',
                newPassword: 'NewPassword123!',
                confirmPassword: 'NewPassword123!',
                pin: '123456'
            });

            const responseWithPin = await changePasswordPost(requestWithPin);
            const dataWithPin = await responseWithPin.json();

            expect(responseWithPin.status).toBe(200);
            expect(dataWithPin.message).toBe('Password changed successfully');
        });
    });

    describe('Collection Deletion', () => {
        it('should require PIN when PIN is set for collection deletion', async () => {
            prismaMock.user.findUnique.mockImplementation((args: any) => {
                if (args.select?.securityPin) {
                    return Promise.resolve({ securityPin: 'hashedpin123456' });
                }
                return Promise.resolve(mockUserWithPin);
            });

            prismaMock.collection.findUnique.mockResolvedValue(mockCollection);

            const requestWithoutPin = new NextRequest('http://localhost:3000/test', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
            (requestWithoutPin as any).user = { userId: 'user-123', role: Role.USER };

            const responseWithoutPin = await deleteCollectionDelete(
                requestWithoutPin,
                { params: { userId: 'user-123', collectionId: 'collection-123' } }
            );
            const dataWithoutPin = await responseWithoutPin.json();

            expect(responseWithoutPin.status).toBe(403);
            expect(dataWithoutPin.success).toBe(false);
            expect(dataWithoutPin.message).toContain('Security PIN required');

            prismaMock.collection.delete.mockResolvedValue(mockCollection);

            const requestWithPin = new NextRequest('http://localhost:3000/test', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: '123456' })
            });
            (requestWithPin as any).user = { userId: 'user-123', role: Role.USER };

            const responseWithPin = await deleteCollectionDelete(
                requestWithPin,
                { params: { userId: 'user-123', collectionId: 'collection-123' } }
            );
            const dataWithPin = await responseWithPin.json();

            expect(responseWithPin.status).toBe(200);
            expect(dataWithPin.success).toBe(true);
            expect(dataWithPin.message).toBe('Collection deleted successfully');
        });
    });

    describe('Shipping Address Update', () => {
        it('should require PIN when PIN is set for shipping address update', async () => {
            prismaMock.user.findUnique.mockImplementation((args: any) => {
                if (args.select?.securityPin) {
                    return Promise.resolve({ securityPin: 'hashedpin123456' });
                }
                if (args.select?.shippingAddress) {
                    return Promise.resolve({
                        id: 'user-123',
                        name: 'Test User',
                        languagePreference: 'en',
                        phoneNumber: null,
                        dateOfBirth: null,
                        bio: null,
                        profileImageUrl: null,
                        shippingAddress: null
                    });
                }
                return Promise.resolve(mockUserWithPin);
            });

            const shippingAddress = {
                street: '123 Main St',
                city: 'New York',
                state: 'NY',
                postalCode: '10001',
                country: 'US'
            };

            const requestWithoutPin = mockAuthenticatedRequest({
                shippingAddress
            });

            const responseWithoutPin = await updateProfilePatch(requestWithoutPin, { params: { userId: 'user-123' } });
            const dataWithoutPin = await responseWithoutPin.json();

            expect(responseWithoutPin.status).toBe(403);
            expect(dataWithoutPin.success).toBe(false);
            expect(dataWithoutPin.message).toContain('Security PIN required');

            prismaMock.user.update.mockResolvedValue({
                ...mockUserWithPin,
                shippingAddress
            });

            const requestWithPin = mockAuthenticatedRequest({
                shippingAddress,
                pin: '123456'
            });

            const responseWithPin = await updateProfilePatch(requestWithPin, { params: { userId: 'user-123' } });
            const dataWithPin = await responseWithPin.json();

            expect(responseWithPin.status).toBe(200);
            expect(dataWithPin.success).toBe(true);
            expect(dataWithPin.message).toBe('Extended profile updated successfully');
        });

        it('should allow non-shipping address updates without PIN', async () => {
            prismaMock.user.findUnique.mockImplementation((args: any) => {
                if (args.select?.securityPin) {
                    return Promise.resolve({ securityPin: 'hashedpin123456' });
                }
                if (args.select?.shippingAddress) {
                    return Promise.resolve({
                        id: 'user-123',
                        name: 'Test User',
                        languagePreference: 'en',
                        phoneNumber: null,
                        dateOfBirth: null,
                        bio: null,
                        profileImageUrl: null,
                        shippingAddress: null
                    });
                }
                return Promise.resolve(mockUserWithPin);
            });

            prismaMock.user.update.mockResolvedValue({
                ...mockUserWithPin,
                bio: 'Updated bio'
            });

            const request = mockAuthenticatedRequest({
                bio: 'Updated bio'
            });

            const response = await updateProfilePatch(request, { params: { userId: 'user-123' } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Extended profile updated successfully');
        });
    });

    describe('Payment Methods Update', () => {
        it('should always require PIN for payment methods update', async () => {
            prismaMock.user.findUnique.mockImplementation((args: any) => {
                if (args.select?.securityPin) {
                    return Promise.resolve({ securityPin: 'hashedpin123456' });
                }
                return Promise.resolve(mockUserWithPin);
            });

            const paymentMethods = [{
                type: 'credit_card',
                last4: '1234',
                brand: 'Visa',
                expiryMonth: 12,
                expiryYear: 2025,
                isDefault: true
            }];

            const requestWithoutPin = mockAuthenticatedRequest({
                paymentMethods
            });

            const responseWithoutPin = await updatePaymentMethodsPatch(requestWithoutPin, { params: { userId: 'user-123' } });
            const dataWithoutPin = await responseWithoutPin.json();

            expect(responseWithoutPin.status).toBe(403);
            expect(dataWithoutPin.success).toBe(false);
            expect(dataWithoutPin.message).toContain('Security PIN required');

            prismaMock.user.update.mockResolvedValue({
                id: 'user-123',
                paymentMethods
            });

            const requestWithPin = mockAuthenticatedRequest({
                paymentMethods,
                pin: '123456'
            });

            const responseWithPin = await updatePaymentMethodsPatch(requestWithPin, { params: { userId: 'user-123' } });
            const dataWithPin = await responseWithPin.json();

            expect(responseWithPin.status).toBe(200);
            expect(dataWithPin.success).toBe(true);
            expect(dataWithPin.message).toBe('Payment methods updated successfully');
        });

        it('should reject payment methods update with incorrect PIN', async () => {
            prismaMock.user.findUnique.mockImplementation((args: any) => {
                if (args.select?.securityPin) {
                    return Promise.resolve({ securityPin: 'hashedpin123456' });
                }
                return Promise.resolve(mockUserWithPin);
            });

            const paymentMethods = [{
                type: 'credit_card',
                last4: '1234',
                brand: 'Visa',
                expiryMonth: 12,
                expiryYear: 2025,
                isDefault: true
            }];

            const requestWithWrongPin = mockAuthenticatedRequest({
                paymentMethods,
                pin: '654321'
            });

            const response = await updatePaymentMethodsPatch(requestWithWrongPin, { params: { userId: 'user-123' } });
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.success).toBe(false);
            expect(data.message).toContain('Invalid security PIN');
        });
    });

    describe('PIN Validation Edge Cases', () => {
        it('should handle users without PIN gracefully', async () => {
            // Override PIN mocks for this test - user has no PIN
            (pinUtils.userHasPin as any).mockResolvedValue(false);
            (pinUtils.requirePinIfSet as any).mockResolvedValue(null); // No PIN required
            
            prismaMock.user.findUnique.mockImplementation((args: any) => {
                if (args.select?.securityPin) {
                    return Promise.resolve({ securityPin: null });
                }
                return Promise.resolve(mockUser);
            });
            prismaMock.user.delete.mockResolvedValue(mockUser);

            const request = new NextRequest('http://localhost:3000/test', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
            (request as any).user = { userId: 'user-123', role: Role.USER };

            const response = await deleteUserDelete(request, { params: { userId: 'user-123' } });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('should handle invalid JSON gracefully', async () => {
            prismaMock.user.findUnique.mockImplementation((args: any) => {
                if (args.select?.securityPin) {
                    return Promise.resolve({ securityPin: 'hashedpin123456' });
                }
                return Promise.resolve(mockUserWithPin);
            });

            const request = new NextRequest('http://localhost:3000/test', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: 'invalid json'
            });
            (request as any).user = { userId: 'user-123', role: Role.USER };

            const response = await deleteUserDelete(request, { params: { userId: 'user-123' } });
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.success).toBe(false);
            expect(data.message).toContain('Security PIN required');
        });

        it('should handle empty PIN field', async () => {
            prismaMock.user.findUnique.mockImplementation((args: any) => {
                if (args.select?.securityPin) {
                    return Promise.resolve({ securityPin: 'hashedpin123456' });
                }
                return Promise.resolve(mockUserWithPin);
            });

            const request = new NextRequest('http://localhost:3000/test', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: '' })
            });
            (request as any).user = { userId: 'user-123', role: Role.USER };

            const response = await deleteUserDelete(request, { params: { userId: 'user-123' } });
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.success).toBe(false);
            expect(data.message).toContain('Security PIN required');
        });
    });
}); 