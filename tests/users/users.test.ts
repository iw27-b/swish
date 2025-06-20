import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient, Role } from '@prisma/client';

import { GET as usersGet } from '@/app/api/users/route';
import { GET as usersMe, PATCH as usersMePatch } from '@/app/api/users/me/route';
import prisma from '@/lib/prisma';
import * as pinUtils from '@/lib/pin_utils';

// Mock PIN utilities
vi.mock('@/lib/pin_utils', () => ({
    requirePinIfSet: vi.fn(),
    requirePin: vi.fn(),
}));

const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

const mockAuthenticatedRequest = (url: string, method: string = 'GET', body?: any, user?: any): NextRequest => {
    const request = new NextRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    
    (request as any).user = user || {
        userId: 'user-123',
        role: Role.USER,
        email: 'test@example.com'
    };
    
    return request;
};

const mockUnauthenticatedRequest = (url: string, method: string = 'GET'): NextRequest => {
    return new NextRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
    });
};

const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerified: true,
    twoFactorEnabled: false,
    isSeller: false,
    sellerVerificationStatus: null,
    languagePreference: 'en',
    profileImageUrl: null,
    phoneNumber: '+1234567890',
    dateOfBirth: new Date('1990-01-01'),
    bio: 'Test bio',
    shippingAddress: { street: '123 Test St', city: 'Test City' },
    paymentMethods: [],
    securityPin: null
};

const mockAdminUser = {
    userId: 'admin-123',
    role: Role.ADMIN,
    email: 'admin@example.com'
};

describe('Users Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock PIN utilities to pass by default
        (pinUtils.requirePinIfSet as any).mockResolvedValue(null);
        (pinUtils.requirePin as any).mockResolvedValue(null);
    });

    describe('GET /api/users (Admin only)', () => {
        it('should require authentication', async () => {
            const request = mockUnauthenticatedRequest('http://localhost:3000/api/users');
            const response = await usersGet(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Authentication required');
        });

        it('should require admin role', async () => {
            const request = mockAuthenticatedRequest('http://localhost:3000/api/users', 'GET', null, {
                userId: 'user-123',
                role: Role.USER,
                email: 'user@example.com'
            });
            const response = await usersGet(request);
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Forbidden: Admin access required');
        });

        it('should list users for admin', async () => {
            const mockUsers = [
                {
                    id: 'user-1',
                    name: 'User One',
                    role: Role.USER,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    emailVerified: true,
                    twoFactorEnabled: false,
                    isSeller: false,
                    sellerVerificationStatus: null,
                    languagePreference: 'en',
                    profileImageUrl: null
                },
                {
                    id: 'user-2',
                    name: 'User Two',
                    role: Role.SELLER,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    emailVerified: true,
                    twoFactorEnabled: false,
                    isSeller: true,
                    sellerVerificationStatus: 'VERIFIED',
                    languagePreference: 'es',
                    profileImageUrl: 'https://example.com/avatar.jpg'
                }
            ];

            prismaMock.user.count.mockResolvedValue(2);
            prismaMock.user.findMany.mockResolvedValue(mockUsers);

            const request = mockAuthenticatedRequest('http://localhost:3000/api/users', 'GET', null, mockAdminUser);
            const response = await usersGet(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Users retrieved successfully');
            expect(data.data.items).toHaveLength(2);
            expect(data.data.pagination).toBeDefined();
        });

        it('should filter users by search term', async () => {
            prismaMock.user.count.mockResolvedValue(1);
            prismaMock.user.findMany.mockResolvedValue([mockUser]);

            const request = mockAuthenticatedRequest('http://localhost:3000/api/users?search=Test', 'GET', null, mockAdminUser);
            const response = await usersGet(request);

            expect(response.status).toBe(200);
            expect(prismaMock.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: [
                            { name: { contains: 'Test', mode: 'insensitive' } }
                        ]
                    })
                })
            );
        });

        it('should filter users by role', async () => {
            prismaMock.user.count.mockResolvedValue(1);
            prismaMock.user.findMany.mockResolvedValue([mockUser]);

            const request = mockAuthenticatedRequest('http://localhost:3000/api/users?role=USER', 'GET', null, mockAdminUser);
            const response = await usersGet(request);

            expect(response.status).toBe(200);
            expect(prismaMock.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        role: 'USER'
                    })
                })
            );
        });

        it('should handle pagination', async () => {
            prismaMock.user.count.mockResolvedValue(50);
            prismaMock.user.findMany.mockResolvedValue([mockUser]);

            const request = mockAuthenticatedRequest('http://localhost:3000/api/users?page=2&pageSize=10', 'GET', null, mockAdminUser);
            const response = await usersGet(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.data.pagination.page).toBe(2);
            expect(data.data.pagination.pageSize).toBe(10);
            expect(prismaMock.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 10, // (page 2 - 1) * pageSize 10
                    take: 10
                })
            );
        });
    });

    describe('GET /api/users/me', () => {
        it('should require authentication', async () => {
            const request = mockUnauthenticatedRequest('http://localhost:3000/api/users/me');
            const response = await usersMe(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Authentication required');
        });

        it('should return current user profile', async () => {
            prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
            prismaMock.user.findUnique.mockResolvedValueOnce({ securityPin: null });

            const request = mockAuthenticatedRequest('http://localhost:3000/api/users/me');
            const response = await usersMe(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Complete profile retrieved successfully');
            expect(data.data.id).toBe('user-123');
            expect(data.data.email).toBe('test@example.com');
            expect(data.data.hasSecurityPin).toBe(false);
        });

        it('should return 404 if user not found', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);

            const request = mockAuthenticatedRequest('http://localhost:3000/api/users/me');
            const response = await usersMe(request);
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.success).toBe(false);
            expect(data.message).toBe('User not found');
        });
    });

    describe('PATCH /api/users/me', () => {
        it('should require authentication', async () => {
            const request = mockUnauthenticatedRequest('http://localhost:3000/api/users/me', 'PATCH');
            const response = await usersMePatch(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Authentication required');
        });

        it('should update basic user fields without PIN', async () => {
            const updateData = {
                name: 'Updated Name',
                languagePreference: 'es'
            };

            prismaMock.user.findUnique.mockResolvedValue(mockUser);
            prismaMock.$transaction.mockImplementation(async (callback: any) => {
                return await callback(prismaMock);
            });
            prismaMock.user.update.mockResolvedValue({ ...mockUser, ...updateData });

            const request = mockAuthenticatedRequest('http://localhost:3000/api/users/me', 'PATCH', updateData);
            const response = await usersMePatch(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Profile updated successfully');
            expect(pinUtils.requirePinIfSet).not.toHaveBeenCalled();
        });

        it('should require PIN for sensitive fields when user has PIN', async () => {
            const updateData = {
                email: 'newemail@example.com',
                securityPin: '1234'
            };

            const userWithPin = { ...mockUser, securityPin: 'hashed_pin' };
            prismaMock.user.findUnique.mockResolvedValue(userWithPin);

            const request = mockAuthenticatedRequest('http://localhost:3000/api/users/me', 'PATCH', updateData);
            const response = await usersMePatch(request);

            expect(pinUtils.requirePinIfSet).toHaveBeenCalledWith('user-123', '1234', 'update sensitive information');
        });

        it('should always require PIN for financial fields', async () => {
            const updateData = {
                shippingAddress: { 
                    street: '456 New St', 
                    city: 'New City',
                    state: 'NY',
                    zipCode: '12345',
                    country: 'US'
                },
                securityPin: '1234'
            };

            prismaMock.user.findUnique.mockResolvedValue(mockUser);
            prismaMock.$transaction.mockImplementation(async (callback: any) => {
                return await callback(prismaMock);
            });
            prismaMock.user.update.mockResolvedValue({ ...mockUser, ...updateData });

            const request = mockAuthenticatedRequest('http://localhost:3000/api/users/me', 'PATCH', updateData);
            const response = await usersMePatch(request);

            expect(pinUtils.requirePin).toHaveBeenCalledWith('user-123', '1234', 'update financial information');
        });

        it('should return 400 for invalid data', async () => {
            const invalidData = {
                email: 'invalid-email', // Invalid email format
                name: ''  // Empty name
            };

            const request = mockAuthenticatedRequest('http://localhost:3000/api/users/me', 'PATCH', invalidData);
            const response = await usersMePatch(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Invalid request data');
        });

        it('should return 404 if user not found', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);

            const updateData = { name: 'New Name' };
            const request = mockAuthenticatedRequest('http://localhost:3000/api/users/me', 'PATCH', updateData);
            const response = await usersMePatch(request);
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.success).toBe(false);
            expect(data.message).toBe('User not found');
        });



        it('should handle request too large', async () => {
            const largeData = {
                bio: 'x'.repeat(100000) // Very large bio
            };

            const request = mockAuthenticatedRequest('http://localhost:3000/api/users/me', 'PATCH', largeData);
            const response = await usersMePatch(request);
            const data = await response.json();

            expect(response.status).toBe(413);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Request too large');
        });
    });
}); 