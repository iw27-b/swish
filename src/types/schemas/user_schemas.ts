import { z } from 'zod';
import { Role } from '@prisma/client';

export const UpdateUserSchema = z.object({
    name: z.string()
        .min(1, { message: 'Name is required' })
        .max(100, { message: 'Name must be less than 100 characters' })
        .regex(/^[\p{L}\p{M}\s'-]+$/u, { message: 'Name can only contain letters, spaces, hyphens, and apostrophes' })
        .optional(),
    languagePreference: z.enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'])
        .default('en')
        .optional(),
});

export type UpdateUserRequestBody = z.infer<typeof UpdateUserSchema>;

export const UpdateSensitiveUserSchema = z.object({
    name: z.string()
        .min(1, { message: 'Name is required' })
        .max(100, { message: 'Name must be less than 100 characters' })
        .regex(/^[\p{L}\p{M}\s'-]+$/u, { message: 'Name can only contain letters, spaces, hyphens, and apostrophes' })
        .optional(),
    languagePreference: z.enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'])
        .default('en')
        .optional(),
    profileImageUrl: z.string().url().optional().or(z.literal('')),
    
    email: z.string()
        .email({ message: 'Invalid email address' })
        .min(5, { message: 'Email must be at least 5 characters long' })
        .max(254, { message: 'Email must be less than 254 characters' })
        .optional(),
    phoneNumber: z.string()
        .regex(/^\+?[\d\s\-\(\)]{7,20}$/, { message: 'Invalid phone number format' })
        .optional()
        .or(z.literal('')),
    dateOfBirth: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date of birth must be in YYYY-MM-DD format' })
        .optional()
        .or(z.literal('')),
    bio: z.string()
        .max(500, { message: 'Bio must be less than 500 characters' })
        .optional()
        .or(z.literal('')),
    
    shippingAddress: z.object({
        street: z.string().min(1, { message: 'Street address is required' }),
        city: z.string().min(1, { message: 'City is required' }),
        state: z.string().min(1, { message: 'State is required' }),
        zipCode: z.string().min(5, { message: 'ZIP code must be at least 5 characters' }),
        country: z.string().min(2, { message: 'Country is required' }),
    }).optional(),
    
    securityPin: z.string()
        .regex(/^\d{4,6}$/, { message: 'Security PIN must be 4-6 digits' })
        .optional(),
});

export type UpdateSensitiveUserRequestBody = z.infer<typeof UpdateSensitiveUserSchema>;

export const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1, { message: 'Current password is required' }),
    newPassword: z.string()
        .min(12, { message: 'New password must be at least 12 characters long' })
        .max(128, { message: 'New password must be less than 128 characters' })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
            message: 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
        }),
    confirmPassword: z.string().min(1, { message: 'Password confirmation is required' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export type ChangePasswordRequestBody = z.infer<typeof ChangePasswordSchema>;

export const ForgotPasswordSchema = z.object({
    email: z.string()
        .email({ message: 'Invalid email address' })
        .min(5, { message: 'Email must be at least 5 characters long' })
        .max(254, { message: 'Email must be less than 254 characters' }),
});

export type ForgotPasswordRequestBody = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
    token: z.string().min(1, { message: 'Reset token is required' }),
    password: z.string()
        .min(12, { message: 'Password must be at least 12 characters long' })
        .max(128, { message: 'Password must be less than 128 characters' })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
            message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
        }),
    confirmPassword: z.string().min(1, { message: 'Password confirmation is required' }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export type ResetPasswordRequestBody = z.infer<typeof ResetPasswordSchema>;

export const UserListQuerySchema = z.object({
    page: z.coerce.number().min(1).optional().default(1),
    pageSize: z.coerce.number().min(1).max(100).optional().default(10),
    search: z.string().max(100).optional(),
    role: z.nativeEnum(Role).optional(),
    emailVerified: z.coerce.boolean().optional(),
    sortBy: z.enum(['createdAt', 'name', 'email', 'role']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type UserListQuery = z.infer<typeof UserListQuerySchema>;

export const UserResponseSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().nullable(),
    role: z.nativeEnum(Role),
    createdAt: z.date(),
    updatedAt: z.date(),
    emailVerified: z.boolean(),
    twoFactorEnabled: z.boolean(),
    isSeller: z.boolean(),
    sellerVerificationStatus: z.string().nullable(),
    languagePreference: z.string(),
    // Extended profile fields
    phoneNumber: z.string().nullable(),
    dateOfBirth: z.date().nullable(),
    profileImageUrl: z.string().nullable(),
    bio: z.string().nullable(),
    shippingAddress: z.any().nullable(),
    paymentMethods: z.array(z.any()).nullable(),
    hasSecurityPin: z.boolean().optional(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>; 