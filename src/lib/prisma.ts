import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

declare global {
    var prisma: PrismaClient | undefined;
}

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient();
    }
    prisma = global.prisma;
}

/**
 * Initialize database connection
 * Ensures Prisma client is connected and ready
 */
export async function initDatabase() {
    try {
        await prisma.$connect();
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Error connecting to database:', error);
        throw error;
    }
}

/**
 * Gracefully disconnect from database
 * Should be called on application shutdown
 */
export async function disconnectDatabase() {
    try {
        await prisma.$disconnect();
        console.log('Database disconnected successfully');
    } catch (error) {
        console.error('Error disconnecting from database:', error);
        throw error;
    }
}

/**
 * Check database health
 * Returns true if database is accessible, false otherwise
 */
export async function isDatabaseHealthy(): Promise<boolean> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}

export default prisma; 