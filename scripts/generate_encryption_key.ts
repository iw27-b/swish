#!/usr/bin/env ts-node

/**
 * Script to generate a secure AES-256 encryption key
 * Run: npx ts-node scripts/generate_encryption_key.ts
 * 
 * Copy the generated key to your .env file:
 * AES_ENC_SECRET=<generated_key>
 */

import crypto from 'crypto';

const KEY_LENGTH = 32;

function generateEncryptionKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

const key = generateEncryptionKey();

console.log('\n🔐 Generated AES-256 Encryption Key:\n');
console.log(key);
console.log('\n📝 Add this to your .env file:\n');
console.log(`AES_ENC_SECRET=${key}`);
console.log('\n⚠️  IMPORTANT:');
console.log('- Keep this key secret and secure');
console.log('- Never commit this key to version control');
// console.log('- Use a key management service in production');
console.log('- Losing this key means losing access to all encrypted data\n');

