import { vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset } from 'vitest-mock-extended';

// Mock the Prisma client
vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

// Reset the mock before each test
beforeEach(() => {
  const prismaMock = require('@/lib/prisma').default;
  mockReset(prismaMock);
});
