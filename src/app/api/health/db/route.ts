import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse } from '@/lib/api_utils';

/**
 * This route is used to check the health of the database.
 * @param req NextRequest - The request object
 * @returns JSON response with success or error message
 */

export async function GET(req: NextRequest) {
    try {
        const startTime = Date.now();
        
        await prisma.$queryRaw`SELECT 1`;
        
        const responseTime = Date.now() - startTime;
        
        const dbHealthData = {
            status: 'healthy',
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString(),
            database: 'connected',
        };

        return createSuccessResponse(dbHealthData, 'Database is healthy');

    } catch (error) {
        console.error('Database health check error:', error);
        
        const dbHealthData = {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: 'Database connection failed',
        };

        return createErrorResponse('Database unhealthy', 503);
    }
} 