import { Role } from '@prisma/client';
import { z } from 'zod';
const passwordSchema = z.string()
  .min(12, { message: 'Password must be at least 12 characters long' })
  .max(128, { message: 'Password must be less than 128 characters' })
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  });

const emailSchema = z.string()
    .email({ message: 'Invalid email address' })
    .min(5, { message: 'Email must be at least 5 characters long' })
    .max(254, { message: 'Email must be less than 254 characters' })
    .refine((email) => {
        return !email.includes('..') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }, { message: 'Invalid email format' });

export const RegisterSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    name: z.string()
        .min(1, { message: 'Name is required' })
        .max(100, { message: 'Name must be less than 100 characters' })
        .regex(/^[\p{L}\p{M}\s'-]+$/u, { message: 'Name can only contain letters, spaces, hyphens, and apostrophes' })
        .refine((name) => {
            // Additional validation to prevent abuse while allowing international characters
            const trimmedName = name.trim();
            return trimmedName.length > 0 && trimmedName.length <= 100;
        }, { message: 'Name must contain at least one non-whitespace character' }),
});

export type RegisterRequestBody = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, { message: 'Password is required' }),
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
