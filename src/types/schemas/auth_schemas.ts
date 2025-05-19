import { Role } from '@prisma/client';
import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  name: z.string().optional(),
});

export type RegisterRequestBody = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string(),
});

export type LoginRequestBody = z.infer<typeof LoginSchema>;

export const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.nativeEnum(Role),
});

export const RegisterResponseSchema = z.object({
  message: z.string(),
  user: UserResponseSchema,
});

export const LoginResponseSchema = z.object({
  message: z.string(),
  token: z.string(),
  user: UserResponseSchema,
}); 