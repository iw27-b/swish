import { encrypt, decrypt, hashData } from './encryption';
import {
    EncryptedPaymentMethod,
    PaymentMethodMetadata,
    DecryptedPaymentMethod
} from '@/types/schemas/payment_schemas';

/**
 * Encrypt payment method for storage
 * Separates sensitive data (encrypted) from metadata (plain)
 * 
 * @param paymentMethod - Raw payment method data from frontend
 * @returns Encrypted payment method ready for database storage
 */
export function encryptPaymentMethod(paymentMethod: {
    id: string;
    cardNumber: string;
    cardholderName: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardBrand: string;
    last4: string;
    nickname?: string;
}): EncryptedPaymentMethod {
    const sensitiveData = {
        cardNumber: paymentMethod.cardNumber,
        cardholderName: paymentMethod.cardholderName,
        expiryMonth: paymentMethod.expiryMonth,
        expiryYear: paymentMethod.expiryYear,
    };
    
    const encryptedData = encrypt(JSON.stringify(sensitiveData));
    const fingerprint = hashData(paymentMethod.cardNumber);
    const cvvHash = hashData(paymentMethod.cvv);
    
    const now = new Date().toISOString();
    
    return {
        id: paymentMethod.id,
        encryptedData,
        cardBrand: paymentMethod.cardBrand,
        last4: paymentMethod.last4,
        nickname: paymentMethod.nickname,
        fingerprint,
        cvvHash,
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Decrypt payment method from storage
 * ONLY use this server-side for payment processing
 * 
 * @param encryptedPaymentMethod - Encrypted payment method from database
 * @returns Fully decrypted payment method
 */
export function decryptPaymentMethod(
    encryptedPaymentMethod: EncryptedPaymentMethod
): DecryptedPaymentMethod {
    const decryptedData = JSON.parse(decrypt(encryptedPaymentMethod.encryptedData));
    
    return {
        id: encryptedPaymentMethod.id,
        cardNumber: decryptedData.cardNumber,
        cardholderName: decryptedData.cardholderName,
        expiryMonth: decryptedData.expiryMonth,
        expiryYear: decryptedData.expiryYear,
        cardBrand: encryptedPaymentMethod.cardBrand,
        last4: encryptedPaymentMethod.last4,
        nickname: encryptedPaymentMethod.nickname,
        createdAt: encryptedPaymentMethod.createdAt,
    };
}

/**
 * Extract safe metadata from encrypted payment method
 * This is what gets sent to the frontend
 * 
 * @param encryptedPaymentMethod - Encrypted payment method from database
 * @returns Safe metadata (no sensitive data)
 */
export function getPaymentMethodMetadata(
    encryptedPaymentMethod: EncryptedPaymentMethod
): PaymentMethodMetadata {
    const decryptedData = JSON.parse(decrypt(encryptedPaymentMethod.encryptedData));
    
    return {
        id: encryptedPaymentMethod.id,
        cardBrand: encryptedPaymentMethod.cardBrand,
        last4: encryptedPaymentMethod.last4,
        expiryMonth: decryptedData.expiryMonth,
        expiryYear: decryptedData.expiryYear,
        nickname: encryptedPaymentMethod.nickname,
        cvvHash: encryptedPaymentMethod.cvvHash,
        createdAt: encryptedPaymentMethod.createdAt,
    };
}

/**
 * Verify CVV matches the stored hash
 * 
 * @param cvv - CVV to verify
 * @param cvvHash - Stored CVV hash
 * @returns True if CVV matches
 */
export function verifyCvv(cvv: string, cvvHash: string): boolean {
    const inputCvvHash = hashData(cvv);
    return inputCvvHash === cvvHash;
}

/**
 * Check if a card already exists for a user
 * Uses fingerprint to detect duplicates without decrypting
 * 
 * @param paymentMethods - User's existing payment methods
 * @param cardNumber - Card number to check
 * @returns True if card already exists
 */
export function isDuplicateCard(
    paymentMethods: EncryptedPaymentMethod[],
    cardNumber: string
): boolean {
    const fingerprint = hashData(cardNumber);
    return paymentMethods.some(pm => pm.fingerprint === fingerprint);
}

