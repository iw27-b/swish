import * as argon2 from 'argon2';

const ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1,
};

/**
 * Hashes a password using Argon2id algorithm
 * @param password The plain text password to hash
 * @returns Promise resolving to the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
    try {
        return await argon2.hash(password, ARGON2_OPTIONS);
    } catch (error) {
        throw new Error('Failed to hash password');
    }
}

/**
 * Verifies a password against its hash using Argon2id
 * @param hashedPassword The stored hash
 * @param plainPassword The plain text password to verify
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
    try {
        return await argon2.verify(hashedPassword, plainPassword);
    } catch (error) {
        return false;
    }
} 