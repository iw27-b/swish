import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): Buffer {
    const key = process.env.AES_ENC_SECRET;
    
    if (!key) {
        throw new Error('AES_ENC_SECRET environment variable is not set');
    }
    
    const keyBuffer = Buffer.from(key, 'hex');
    
    if (keyBuffer.length !== KEY_LENGTH) {
        throw new Error(`AES_ENC_SECRET must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters)`);
    }
    
    return keyBuffer;
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * Returns base64-encoded string containing IV + AuthTag + EncryptedData
 * 
 * @param plaintext - Data to encrypt
 * @returns Encrypted data in format: base64(iv:authTag:encryptedData)
 */
export function encrypt(plaintext: string): string {
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        const combined = Buffer.concat([
            iv,
            authTag,
            Buffer.from(encrypted, 'hex')
        ]);
        
        return combined.toString('base64');
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt data encrypted with encrypt()
 * 
 * @param encryptedData - Base64-encoded encrypted data
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: string): string {
    try {
        const key = getEncryptionKey();
        const combined = Buffer.from(encryptedData, 'base64');
        const iv = combined.subarray(0, IV_LENGTH);
        const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Generate a secure encryption key for development/testing
 * In production, use a proper key management service
 */
export function generateEncryptionKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Hash sensitive data for comparison purposes (one-way)
 * Used for things like comparing card fingerprints to prevent duplicates
 */
export function hashData(data: string): string {
    return crypto
        .createHash('sha256')
        .update(data)
        .digest('hex');
}

