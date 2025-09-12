'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface CartItem {
    id: string;
    cardId: string;
    addedAt: Date;
    card: {
        id: string;
        name: string;
        player: string;
        team: string;
        year: number;
        brand: string;
        condition: string;
        rarity: string;
        price: number | null;
        isForSale: boolean;
        imageUrl: string | null;
        owner: {
            id: string;
            name: string;
            email: string;
            profileImageUrl: string | null;
            isSeller: boolean;
        };
    };
}

export interface CartData {
    id: string | null;
    itemCount: number;
    items: CartItem[];
    totalPrice: number;
    updatedAt: Date | null;
}

/**
 * Get user's cart with all items and auto-cleanup invalid ones
 * @param userId - The authenticated user's ID
 * @returns Cart data with valid items only
 */
export async function getCart(userId: string): Promise<CartData> {
    const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
            items: {
                include: {
                    card: {
                        include: {
                            owner: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    profileImageUrl: true,
                                    isSeller: true
                                }
                            }
                        }
                    }
                },
                orderBy: { addedAt: 'desc' }
            }
        }
    });

    const validItems: CartItem[] = [];
    const invalidItemIds: string[] = [];
    let totalPrice = 0;

    if (cart?.items) {
        for (const item of cart.items) {
            const isAvailable = item.card.isForSale &&
                item.card.price !== null &&
                item.card.price > 0;

            const hasActivePurchase = await prisma.purchase.findFirst({
                where: {
                    cardId: item.cardId,
                    status: { in: ['PENDING', 'PAID', 'SHIPPED'] }
                }
            });

            if (isAvailable && !hasActivePurchase) {
                validItems.push(item as CartItem);
                totalPrice += item.card.price!;
            } else {
                invalidItemIds.push(item.id);
            }
        }

        if (invalidItemIds.length > 0) {
            await prisma.cartItem.deleteMany({
                where: { id: { in: invalidItemIds } }
            });
            revalidatePath('/cart');
        }
    }

    return {
        id: cart?.id || null,
        itemCount: validItems.length,
        items: validItems,
        totalPrice,
        updatedAt: cart?.updatedAt || null
    };
}

/**
 * Add a card to user's cart
 * @param userId - The authenticated user's ID  
 * @param cardId - The card to add
 * @returns Success/error result
 */
export async function addToCart(userId: string, cardId: string): Promise<{ success: boolean; message: string; cartItem?: any }> {
    try {
        const card = await prisma.card.findUnique({
            where: { id: cardId },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!card) {
            return { success: false, message: 'Card not found' };
        }

        if (!card.isForSale || !card.price || card.price <= 0) {
            return { success: false, message: 'Card is not for sale' };
        }

        if (card.ownerId === userId) {
            return { success: false, message: 'Cannot add your own card to cart' };
        }

        const existingPurchase = await prisma.purchase.findFirst({
            where: {
                cardId: cardId,
                status: { in: ['PENDING', 'PAID', 'SHIPPED'] }
            }
        });

        if (existingPurchase) {
            return { success: false, message: 'Card is already sold or has a pending purchase' };
        }

        const cart = await prisma.cart.upsert({
            where: { userId },
            create: { userId },
            update: { updatedAt: new Date() }
        });

        const existingCartItem = await prisma.cartItem.findUnique({
            where: {
                cartId_cardId: {
                    cartId: cart.id,
                    cardId: cardId
                }
            }
        });

        if (existingCartItem) {
            return { success: false, message: 'Card is already in your cart' };
        }

        const cartItem = await prisma.cartItem.create({
            data: {
                cartId: cart.id,
                cardId: cardId
            },
            include: {
                card: {
                    include: {
                        owner: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                profileImageUrl: true,
                                isSeller: true
                            }
                        }
                    }
                }
            }
        });

        revalidatePath('/cart');
        return {
            success: true,
            message: 'Card added to cart successfully',
            cartItem
        };

    } catch (error) {
        console.error('Add to cart error:', error);
        return { success: false, message: 'Failed to add card to cart' };
    }
}

/**
 * Remove a specific card from user's cart
 * @param userId - The authenticated user's ID
 * @param cardId - The card to remove
 * @returns Success/error result
 */
export async function removeFromCart(userId: string, cardId: string): Promise<{ success: boolean; message: string }> {
    try {
        const cart = await prisma.cart.findUnique({
            where: { userId }
        });

        if (!cart) {
            return { success: false, message: 'Cart not found' };
        }

        const cartItem = await prisma.cartItem.findUnique({
            where: {
                cartId_cardId: {
                    cartId: cart.id,
                    cardId: cardId
                }
            }
        });

        if (!cartItem) {
            return { success: false, message: 'Card not found in cart' };
        }

        await prisma.cartItem.delete({
            where: {
                cartId_cardId: {
                    cartId: cart.id,
                    cardId: cardId
                }
            }
        });

        await prisma.cart.update({
            where: { id: cart.id },
            data: { updatedAt: new Date() }
        });

        revalidatePath('/cart');
        return { success: true, message: 'Card removed from cart successfully' };

    } catch (error) {
        console.error('Remove from cart error:', error);
        return { success: false, message: 'Failed to remove card from cart' };
    }
}

/**
 * Clear user's entire cart
 * @param userId - The authenticated user's ID
 * @returns Success/error result
 */
export async function clearCart(userId: string): Promise<{ success: boolean; message: string }> {
    try {
        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: { _count: { select: { items: true } } }
        });

        if (!cart) {
            return { success: false, message: 'Cart not found' };
        }

        await prisma.cartItem.deleteMany({
            where: { cartId: cart.id }
        });

        await prisma.cart.update({
            where: { id: cart.id },
            data: { updatedAt: new Date() }
        });

        revalidatePath('/cart');
        return { success: true, message: 'Cart cleared successfully' };

    } catch (error) {
        console.error('Clear cart error:', error);
        return { success: false, message: 'Failed to clear cart' };
    }
}

/**
 * Get cart item count for user (for header badge, etc.)
 * @param userId - The authenticated user's ID
 * @returns Number of items in cart
 */
export async function getCartItemCount(userId: string): Promise<number> {
    const cart = await prisma.cart.findUnique({
        where: { userId },
        include: { _count: { select: { items: true } } }
    });

    return cart?._count.items || 0;
}
