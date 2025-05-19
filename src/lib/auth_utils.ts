import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { JwtPayload } from '@/types';

const JWT_SECRET: string = process.env.JWT_SECRET!;
// const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN; // Keep commented out for now

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables. Please add it to your .env file.');
}

/**
 * Generates a JWT for a given user.
 * @param userId The ID of the user.
 * @param role The role of the user.
 * @returns The generated JWT string.
 */
export function generateToken(userId: string, role: Role): string {
    const payload: Pick<JwtPayload, 'userId' | 'role'> = { userId, role };
    // const options: jwt.SignOptions = {};
    // if (JWT_EXPIRES_IN) {
    //   options.expiresIn = JWT_EXPIRES_IN; 
    // }
    // return jwt.sign(payload, JWT_SECRET, options);
    return jwt.sign(payload, JWT_SECRET); // Simplified call without options
}

/**
 * Verifies a JWT and returns its payload if valid.
 * @param token The JWT string to verify.
 * @returns The decoded JwtPayload if the token is valid, otherwise null.
 */
export function verifyToken(token: string): JwtPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        return decoded;
    } catch (error) {
        // console.error('Invalid token:', (error as Error).message);
        return null;
    }
} 