import { describe, it, expect } from 'vitest';
import { generateCsrfToken, verifyCsrfToken } from '@/lib/csrf';
import { NextRequest } from 'next/server';

describe('CSRF Token Generation and Validation', () => {
    it('should generate unique CSRF tokens', () => {
        const token1 = generateCsrfToken();
        const token2 = generateCsrfToken();
        
        expect(token1).toBeDefined();
        expect(token2).toBeDefined();
        expect(typeof token1).toBe('string');
        expect(typeof token2).toBe('string');
        expect(token1).not.toBe(token2);
        expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate hex-encoded tokens', () => {
        const token = generateCsrfToken();
        expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should verify matching CSRF tokens', () => {
        const token = generateCsrfToken();
        
        const req = new NextRequest('http://localhost:3000/api/test', {
            method: 'POST',
            headers: {
                'X-CSRF-Token': token,
                'Cookie': `csrf_token=${token}`,
            },
        });

        expect(verifyCsrfToken(req)).toBe(true);
    });

    it('should reject mismatched CSRF tokens', () => {
        const token1 = generateCsrfToken();
        const token2 = generateCsrfToken();
        
        const req = new NextRequest('http://localhost:3000/api/test', {
            method: 'POST',
            headers: {
                'X-CSRF-Token': token1,
                'Cookie': `csrf_token=${token2}`,
            },
        });

        expect(verifyCsrfToken(req)).toBe(false);
    });

    it('should reject missing CSRF header', () => {
        const token = generateCsrfToken();
        
        const req = new NextRequest('http://localhost:3000/api/test', {
            method: 'POST',
            headers: {
                'Cookie': `csrf_token=${token}`,
            },
        });

        expect(verifyCsrfToken(req)).toBe(false);
    });

    it('should reject missing CSRF cookie', () => {
        const token = generateCsrfToken();
        
        const req = new NextRequest('http://localhost:3000/api/test', {
            method: 'POST',
            headers: {
                'X-CSRF-Token': token,
            },
        });

        expect(verifyCsrfToken(req)).toBe(false);
    });

    it('should reject tokens with single character difference', () => {
        const validToken = generateCsrfToken();
        const invalidToken = validToken.substring(0, validToken.length - 1) + '0';
        
        const req1 = new NextRequest('http://localhost:3000/api/test', {
            method: 'POST',
            headers: {
                'X-CSRF-Token': validToken,
                'Cookie': `csrf_token=${validToken}`,
            },
        });

        const req2 = new NextRequest('http://localhost:3000/api/test', {
            method: 'POST',
            headers: {
                'X-CSRF-Token': invalidToken,
                'Cookie': `csrf_token=${validToken}`,
            },
        });

        expect(verifyCsrfToken(req1)).toBe(true);
        expect(verifyCsrfToken(req2)).toBe(false);
    });
});
