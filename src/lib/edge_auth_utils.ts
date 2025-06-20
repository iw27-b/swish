import { SignJWT, jwtVerify } from 'jose';
import { Role } from '@prisma/client';
import { JwtPayload } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
}

const secretKey = new TextEncoder().encode(JWT_SECRET);

/**
 * Edge Runtime compatible JWT generation
 * @param userId The ID of the user
 * @param role The role of the user
 * @returns Promise<string> The generated JWT string
 */
export async function generateEdgeToken(userId: string, role: string = 'USER'): Promise<string> {
    try {
        const token = await new SignJWT({ userId, role })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('15m') // 15 minutes
            .sign(secretKey);

        return token;
    } catch (error) {
        throw new Error(`Failed to generate token: ${error instanceof Error ? error.message : error}`);
    }
}

/**
 * Edge Runtime compatible refresh token generation
 * @param userId The ID of the user
 * @param role The role of the user
 * @returns Promise<string> The generated refresh JWT string
 */
export async function generateEdgeRefreshToken(userId: string, role: string = 'USER'): Promise<string> {
    try {
        const refreshToken = await new SignJWT({ userId, role })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d') // 7 days
            .sign(secretKey);

        return refreshToken;
    } catch (error) {
        throw new Error(`Failed to generate refresh token: ${error instanceof Error ? error.message : error}`);
    }
}

/**
 * Edge Runtime compatible JWT verification
 * @param token The JWT string to verify
 * @returns Promise<JwtPayload | null> The decoded payload if valid, null if invalid
 */
export async function verifyEdgeToken(token: string): Promise<JwtPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secretKey);
        
        if (payload.userId && typeof payload.userId === 'string' && 
            payload.role && typeof payload.role === 'string') {
            return {
                userId: payload.userId,
                role: payload.role as Role,
                iat: payload.iat,
                exp: payload.exp
            };
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}

/**
 * Parse JWT token from Cookie header
 * @param cookieHeader The cookie header string
 * @param cookieName The name of the cookie containing the JWT
 * @returns string | null The token if found, null otherwise
 */
export function parseTokenFromCookie(cookieHeader: string | null, cookieName: string = 'access_token'): string | null {
    if (!cookieHeader) return null;
    
    const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
    const targetCookie = cookies.find(cookie => cookie.startsWith(`${cookieName}=`));
    
    if (targetCookie) {
        return targetCookie.substring(cookieName.length + 1);
    }
    
    return null;
} 