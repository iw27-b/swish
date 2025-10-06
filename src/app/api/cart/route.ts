import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api_utils';
import { getCart, addToCart } from '@/lib/cart_actions';

/**
 * Get user's shopping cart with all items
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @returns JSON response with cart data or error
 */
export const GET = withAuth(async (req, user) => {
    try {
        const { userId } = user;
        const cart = await getCart(userId);

        return createSuccessResponse(cart, 'Cart retrieved successfully');
    } catch (error) {
        console.error('Error fetching cart:', error);
        return createErrorResponse('Failed to fetch cart', 500);
    }
});

/**
 * Add a card to user's cart
 * @param req NextRequest - The request object
 * @param user JwtPayload - The authenticated user
 * @returns JSON response with success message or error
 */
export const POST = withAuth(async (req, user) => {
    try {
        // console.log('[Cart/Items] Request received, user:', user);
        const { userId } = user;
        // console.log('[Cart/Items] User authenticated, userId:', userId);
        
        let requestBody;
        try {
            requestBody = await req.json();
        } catch (error) {
            return createErrorResponse('Invalid JSON format in request body', 400);
        }

        const { cardId } = requestBody;

        if (!cardId || typeof cardId !== 'string') {
            return createErrorResponse('Card ID is required', 400);
        }

        const result = await addToCart(userId, cardId);

        if (!result.success) {
            return createErrorResponse(result.message, 400);
        }

        return createSuccessResponse(result.cartItem, result.message);
    } catch (error) {
        console.error('Error adding to cart:', error);
        return createErrorResponse('Failed to add card to cart', 500);
    }
});
