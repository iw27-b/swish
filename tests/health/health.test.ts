import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

import { GET as healthGet } from '@/app/api/health/route';
import { GET as dbHealthGet } from '@/app/api/health/db/route';
import prisma from '@/lib/prisma';

const mockRequest = (url: string = 'http://localhost:3000/api/health'): NextRequest => {
    return new NextRequest(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
};

const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

describe('Health Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(process, 'uptime').mockReturnValue(12345.67);
        vi.stubEnv('NODE_ENV', 'test');
        vi.stubEnv('npm_package_version', '1.0.0');
    });

    describe('GET /api/health', () => {
        it('should return healthy status with service info', async () => {
            const request = mockRequest();
            const response = await healthGet(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Service is healthy');
            expect(data.data.status).toBe('healthy');
            expect(data.data.uptime).toBe(12345.67);
            expect(data.data.environment).toBe('test');
            expect(data.data.version).toBe('1.0.0');
            expect(data.data.timestamp).toBeDefined();
        });

        it('should handle errors gracefully', async () => {
            vi.spyOn(process, 'uptime').mockImplementation(() => {
                throw new Error('Process error');
            });

            const request = mockRequest();
            const response = await healthGet(request);
            const data = await response.json();

            expect(response.status).toBe(503);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Service unhealthy');
        });
    });

    describe('GET /api/health/db', () => {
        it('should return healthy database status', async () => {
            prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

            const request = mockRequest('http://localhost:3000/api/health/db');
            const response = await dbHealthGet(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Database is healthy');
            expect(data.data.status).toBe('healthy');
            expect(data.data.database).toBe('connected');
            expect(data.data.responseTime).toMatch(/^\d+ms$/);
            expect(data.data.timestamp).toBeDefined();
            expect(prismaMock.$queryRaw).toHaveBeenCalledOnce();
        });

        it('should return unhealthy status when database fails', async () => {
            prismaMock.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

            const request = mockRequest('http://localhost:3000/api/health/db');
            const response = await dbHealthGet(request);
            const data = await response.json();

            expect(response.status).toBe(503);
            expect(data.success).toBe(false);
            expect(data.message).toBe('Database unhealthy');
            expect(prismaMock.$queryRaw).toHaveBeenCalledOnce();
        });
    });
}); 