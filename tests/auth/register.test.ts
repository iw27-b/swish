import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as registerUser } from '@/app/api/auth/register/route';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { DeepMockProxy } from 'vitest-mock-extended';

vi.mock('bcryptjs', async (importOriginal) => {
  const actual = await importOriginal<typeof bcrypt>();
  return {
    ...actual,
    hash: vi.fn().mockResolvedValue('hashedpassword'),
  };
});

const prismaMock = prisma as unknown as DeepMockProxy<typeof prisma>;


describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (bcrypt.hash as vi.Mock).mockResolvedValue('hashedpassword');
  });

  it('should register a new user successfully', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedpassword',
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: false,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
      twoFactorEnabled: false,
      isSeller: false,
      sellerVerificationStatus: null,
      languagePreference: 'en',
    });

    const requestBody = { email: 'test@example.com', password: 'password123', name: 'Test User' };
    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await registerUser(req as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.message).toBe('User created successfully');
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('test@example.com');
    expect(body.user.password).toBeUndefined();
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
      },
    });
  });

  it('should return 409 if user already exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: '1',
      email: 'existing@example.com',
      name: 'Existing User',
      password: 'hashedpassword',
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: false,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
      twoFactorEnabled: false,
      isSeller: false,
      sellerVerificationStatus: null,
      languagePreference: 'en',
    });

    const requestBody = { email: 'existing@example.com', password: 'password123' };
    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await registerUser(req as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.message).toBe('User already exists');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('should return 400 if email or password are not provided', async () => {
    const requestBody = { name: 'Test User' };
    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await registerUser(req as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe('Email and password are required');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

}); 