import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { withAuth, getAuthenticatedUser } from '@/lib/auth';
import { Role } from '@prisma/client';

describe('withAuth wrapper', () => {
    it('should call handler with user when authenticated via x-user-data header', async () => {
        const mockUser = {
            userId: 'user-123',
            role: Role.USER
        };

        let receivedReq: any;
        let receivedUser: any;

        const handler = async (req: any, user: any) => {
            receivedReq = req;
            receivedUser = user;
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        };

        const wrappedHandler = withAuth(handler);

        const req = new NextRequest('http://localhost:3000/api/test', {
            method: 'GET',
            headers: {
                'x-user-data': JSON.stringify(mockUser)
            }
        });

        const response = await wrappedHandler(req);
        const body = await response.json();

        expect(receivedUser).toEqual(mockUser);
        expect(receivedReq.user).toEqual(mockUser);
        expect(body).toEqual({ success: true });
        expect(response.status).toBe(200);
    });

    it('should return 401 when x-user-data header is missing', async () => {
        const handler = async (_req: any, _user: any) => {
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        };

        const wrappedHandler = withAuth(handler);

        const req = new NextRequest('http://localhost:3000/api/test', {
            method: 'GET'
        });

        const response = await wrappedHandler(req);
        const body = await response.json();

        expect(body).toEqual({
            success: false,
            message: 'Authentication required'
        });
        expect(response.status).toBe(401);
    });

    it('should provide req.user for backwards compatibility', async () => {
        const mockUser = {
            userId: 'user-456',
            role: Role.ADMIN
        };

        const handler = async (req: any, user: any) => {
            expect(req.user).toEqual(mockUser);
            expect(req.user.userId).toBe(user.userId);
            expect(req.user.role).toBe(user.role);
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        };

        const wrappedHandler = withAuth(handler);

        const req = new NextRequest('http://localhost:3000/api/test', {
            method: 'POST',
            headers: {
                'x-user-data': JSON.stringify(mockUser)
            }
        });

        const response = await wrappedHandler(req);
        expect(response.status).toBe(200);
    });

    it('should return 401 for malformed x-user-data', async () => {
        const handler = async (_req: any, _user: any) => {
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        };

        const wrappedHandler = withAuth(handler);

        const req = new NextRequest('http://localhost:3000/api/test', {
            method: 'GET',
            headers: {
                'x-user-data': 'invalid-json'
            }
        });

        const response = await wrappedHandler(req);
        const body = await response.json();

        expect(body).toEqual({
            success: false,
            message: 'Authentication required'
        });
        expect(response.status).toBe(401);
    });

    it('should handle route with params', async () => {
        const mockUser = {
            userId: 'user-789',
            role: Role.SELLER
        };

        let receivedParams: any;

        const handler = async (_req: any, _user: any, params: any) => {
            receivedParams = params;
            return new Response(JSON.stringify({ userId: 'test-id' }), { status: 200 });
        };

        const wrappedHandler = withAuth(handler);

        const req = new NextRequest('http://localhost:3000/api/users/test-id', {
            method: 'GET',
            headers: {
                'x-user-data': JSON.stringify(mockUser)
            }
        });

        const params = { params: Promise.resolve({ userId: 'test-id' }) };

        await wrappedHandler(req, params);

        expect(receivedParams).toEqual(params);
    });
});

describe('getAuthenticatedUser', () => {
    it('should extract user from x-user-data header', async () => {
        const mockUser = {
            userId: 'user-999',
            role: 'USER'
        };

        const req = new NextRequest('http://localhost:3000/api/test', {
            headers: {
                'x-user-data': JSON.stringify(mockUser)
            }
        });

        const user = await getAuthenticatedUser(req);

        expect(user).toEqual({
            userId: 'user-999',
            role: 'USER'
        });
    });

    it('should return null for malformed x-user-data header', async () => {
        const req = new NextRequest('http://localhost:3000/api/test', {
            headers: {
                'x-user-data': 'invalid-json'
            }
        });

        const user = await getAuthenticatedUser(req);

        expect(user).toBeNull();
    });

    it('should return null when x-user-data header is missing', async () => {
        const req = new NextRequest('http://localhost:3000/api/test');

        const user = await getAuthenticatedUser(req);

        expect(user).toBeNull();
    });
});
