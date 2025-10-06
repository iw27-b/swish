import { z } from 'zod';

/**
 * Schema for adding a new payment method
 * Validates card details before encryption
 */
export const AddPaymentMethodSchema = z.object({
    paymentMethods: z.array(z.object({
        id: z.string().min(1, 'Payment method ID is required'),
        cardNumber: z.string()
            .min(13, 'Card number must be at least 13 digits')
            .max(19, 'Card number must be at most 19 digits')
            .regex(/^\d+$/, 'Card number must contain only digits'),
        expiryMonth: z.string()
            .regex(/^(0[1-9]|1[0-2])$/, 'Invalid expiry month (must be 01-12)'),
        expiryYear: z.string()
            .regex(/^\d{2}$/, 'Invalid expiry year (must be 2 digits)'),
        cvv: z.string()
            .min(3, 'CVV must be at least 3 digits')
            .max(4, 'CVV must be at most 4 digits')
            .regex(/^\d+$/, 'CVV must be numeric'),
        cardholderName: z.string()
            .min(1, 'Cardholder name is required')
            .max(100, 'Cardholder name is too long'),
        cardBrand: z.string()
            .min(1, 'Card brand is required'),
        last4: z.string()
            .length(4, 'Last 4 digits must be exactly 4 characters')
            .regex(/^\d{4}$/, 'Last 4 must be numeric'),
        nickname: z.string()
            .max(50, 'Nickname is too long')
            .optional(),
    })).length(1, 'Exactly one payment method must be provided')
});

/**
 * Type for validated payment method input
 */
export type AddPaymentMethodInput = z.infer<typeof AddPaymentMethodSchema>;

/**
 * Encrypted payment method stored in database
 */
export interface EncryptedPaymentMethod {
    id: string;
    encryptedData: string; // cardNumber, expiryMonth, expiryYear, cardholderName
    cardBrand: string;
    last4: string;
    nickname?: string;
    fingerprint: string;
    cvvHash: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Payment method metadata returned to frontend (safe, no sensitive data)
 */
export interface PaymentMethodMetadata {
    id: string;
    cardBrand: string;
    last4: string;
    expiryMonth: string;
    expiryYear: string;
    nickname?: string;
    cvvHash: string;
    createdAt: string;
}

/**
 * Full decrypted payment method (NEVER send to frontend)
 */
export interface DecryptedPaymentMethod {
    id: string;
    cardNumber: string;
    cardholderName: string;
    expiryMonth: string;
    expiryYear: string;
    cardBrand: string;
    last4: string;
    nickname?: string;
    createdAt: string;
}

