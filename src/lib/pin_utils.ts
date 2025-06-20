import prisma from '@/lib/prisma';
import { verifyPassword } from '@/lib/password_utils';
import { createErrorResponse } from '@/lib/api_utils';

/**
 * Check if user has a security PIN set
 * @param userId - The user ID to check
 * @returns Promise<boolean> - Whether user has a PIN set
 */
export async function userHasPin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { securityPin: true }
    });

    return !!(user?.securityPin);
}

/**
 * Verify user's security PIN
 * @param userId - The user ID
 * @param providedPin - The PIN provided by the user
 * @returns Promise<boolean> - Whether the PIN is correct
 */
export async function verifyUserPin(userId: string, providedPin: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { securityPin: true }
    });

    if (!user?.securityPin) {
        // Perform dummy hash operation to maintain consistent timing
        await verifyPassword('dummy_hash_to_prevent_timing_attacks', providedPin);
        return false;
    }

    return await verifyPassword(user.securityPin, providedPin);
}

/**
 * Validate PIN for operations that require it when user has PIN set
 * @param userId - The user ID
 * @param providedPin - The PIN provided by the user (optional)
 * @param options - Configuration options
 * @returns Promise<{requiresPin: boolean, pinValid: boolean, errorResponse?: Response}>
 */
export async function validatePinIfRequired(
    userId: string,
    providedPin?: string,
    options: {
        alwaysRequire?: boolean;
        operation?: string;
    } = {}
): Promise<{
    requiresPin: boolean;
    pinValid: boolean;
    errorResponse?: Response;
}> {
    const { alwaysRequire = false, operation = 'this operation' } = options;
    const hasPin = await userHasPin(userId);

    if (!hasPin && !alwaysRequire) {
        return { requiresPin: false, pinValid: true };
    }

    if (!providedPin) {
        return {
            requiresPin: true,
            pinValid: false,
            errorResponse: createErrorResponse(
                `Security PIN required for ${operation}`,
                403,
                { pin: [`Security PIN is required for ${operation}`] }
            )
        };
    }

    if (!hasPin && alwaysRequire) {
        return {
            requiresPin: true,
            pinValid: false,
            errorResponse: createErrorResponse(
                'Security PIN must be set up before performing this operation',
                403,
                { pin: ['You must set up a security PIN before performing this operation'] }
            )
        };
    }

    const pinValid = await verifyUserPin(userId, providedPin);

    if (!pinValid) {
        return {
            requiresPin: true,
            pinValid: false,
            errorResponse: createErrorResponse(
                'Invalid security PIN',
                403,
                { pin: ['The provided PIN is incorrect'] }
            )
        };
    }

    return { requiresPin: true, pinValid: true };
}

/**
 * Convenience function for operations that require PIN only if user has one set
 * @param userId - The user ID  
 * @param providedPin - The PIN provided by the user (optional)
 * @param operation - Operation name for error messages
 * @returns Promise<Response | null> - Error response if validation fails, null if success
 */
export async function requirePinIfSet(
    userId: string,
    providedPin?: string,
    operation: string = 'this operation'
): Promise<Response | null> {
    const validation = await validatePinIfRequired(userId, providedPin, { operation });
    return validation.errorResponse || null;
}

/**
 * Convenience function for operations that always require PIN (like payment methods)
 * @param userId - The user ID
 * @param providedPin - The PIN provided by the user (optional)  
 * @param operation - Operation name for error messages
 * @returns Promise<Response | null> - Error response if validation fails, null if success
 */
export async function requirePin(
    userId: string,
    providedPin?: string,
    operation: string = 'this operation'
): Promise<Response | null> {
    const validation = await validatePinIfRequired(userId, providedPin, {
        alwaysRequire: true,
        operation
    });
    return validation.errorResponse || null;
}

// TODO: move sensitive operations to routes instead of hardcoding them here
export const SENSITIVE_OPERATIONS = {
    DELETE_ACCOUNT: 'delete_account',
    CHANGE_PASSWORD: 'change_password',
    UPDATE_EMAIL: 'update_email',
    DELETE_COLLECTION: 'delete_collection',
    REMOVE_SECURITY_PIN: 'remove_security_pin',
    UPDATE_PAYMENT_METHODS: 'update_payment_methods',
    UPDATE_SHIPPING_ADDRESS: 'update_shipping_address'
} as const;

export type SensitiveOperation = typeof SENSITIVE_OPERATIONS[keyof typeof SENSITIVE_OPERATIONS]; 