import { vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset } from 'vitest-mock-extended';

vi.mock('@/lib/prisma', () => ({
    __esModule: true,
    default: mockDeep<PrismaClient>(),
}));

beforeEach(async () => {
    const prismaMock = (await import('@/lib/prisma')).default;
    mockReset(prismaMock);
    
    // Setup transaction mock to pass through the callback
    (prismaMock.$transaction as any).mockImplementation(async (callback: any) => {
        return await callback(prismaMock);
    });
});
