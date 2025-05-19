import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { POST as loginUser } from '@/app/api/auth/login/route';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { DeepMockProxy } from 'vitest-mock-extended';
import * as authUtils from '@/lib/auth_utils';
import { Role } from '@prisma/client';

vi.mock('bcryptjs', async (importOriginal) => {
  const actual = await importOriginal<typeof bcrypt>();
  return {
    ...actual,
    compare: vi.fn(),
  };
});

const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;

const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashedpassword',
  role: Role.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
  emailVerified: false,
  emailVerificationToken: null,
  emailVerificationTokenExpiry: null,
  twoFactorEnabled: false,
  isSeller: false,
  sellerVerificationStatus: null,
  languagePreference: 'en',
};

let generateTokenSpy: ReturnType<typeof vi.spyOn>;

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (bcrypt.compare as vi.Mock).mockReset();
    if (generateTokenSpy) generateTokenSpy.mockRestore();
    generateTokenSpy = vi.spyOn(authUtils, 'generateToken').mockReturnValue('mocked.jwt.token');
  });

  afterEach(() => {
    if (generateTokenSpy) generateTokenSpy.mockRestore();
  });

  it('should login a user and return a token successfully', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    (bcrypt.compare as vi.Mock).mockResolvedValue(true);
    
    const requestBody = { email: 'test@example.com', password: 'password123' };
    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await loginUser(req as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('Login successful');
    expect(body.token).toBe('mocked.jwt.token');
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('test@example.com');
    expect(body.user.password).toBeUndefined();

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
    expect(generateTokenSpy).toHaveBeenCalledWith(mockUser.id, mockUser.role);
  });

  it('should return 401 for non-existent user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const requestBody = { email: 'nouser@example.com', password: 'password123' };
    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await loginUser(req as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toBe('Invalid credentials');
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(generateTokenSpy).not.toHaveBeenCalled();
  });

  it('should return 401 for incorrect password', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    (bcrypt.compare as vi.Mock).mockResolvedValue(false);

    const requestBody = { email: 'test@example.com', password: 'wrongpassword' };
    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await loginUser(req as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.message).toBe('Invalid credentials');
    expect(generateTokenSpy).not.toHaveBeenCalled();
  });

  it('should return 400 if email or password are not provided', async () => {
    const requestBody = { email: 'test@example.com' };
    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await loginUser(req as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe('Email and password are required');
    expect(generateTokenSpy).not.toHaveBeenCalled();
  });
}); 