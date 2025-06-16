import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api_utils';

/**
 * This route is used to check the health of the service.
 * @param req NextRequest - The request object
 * @returns JSON response with success or error message
 */

export async function GET(req: NextRequest) {
    try {
        const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
        };

        return createSuccessResponse(healthData, 'Service is healthy');

    } catch (error) {
        console.error('Health check error:', error);
        return createErrorResponse('Service unhealthy', 503);
    }
} 