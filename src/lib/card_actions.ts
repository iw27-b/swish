'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth, requireOwnership, requireRole, getOptionalAuth } from '@/lib/auth_server';
import { Role } from '@prisma/client';

export interface CreateCardData {
    name: string;
    player: string;
    team: string;
    year: number;
    brand: string;
    cardNumber: string;
    condition: 'MINT' | 'NEAR_MINT' | 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'FAIR' | 'POOR';
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'ULTRA_RARE' | 'SECRET_RARE';
    description?: string;
}

/**
 * PUBLIC: Get card details (anyone can view)
 * No authentication required
 */
export async function getCard(cardId: string) {
    try {
        const card = await prisma.card.findUnique({
            where: { id: cardId },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        profileImageUrl: true,
                        isSeller: true
                    }
                }
            }
        });

        if (!card) {
            return { success: false, message: 'Card not found' };
        }

        return { success: true, card };
    } catch (error) {
        console.error('Get card error:', error);
        return { success: false, message: 'Failed to get card' };
    }
}

/**
 * USER-ONLY: Create a new card
 * Requires authentication, user becomes owner
 */
export async function createCard(cardData: CreateCardData) {
    try {
        const user = await requireAuth();

        const card = await prisma.card.create({
            data: {
                ...cardData,
                ownerId: user.userId,
                isForSale: false,
                price: null,
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        profileImageUrl: true,
                        isSeller: true
                    }
                }
            }
        });

        revalidatePath('/cards');
        revalidatePath(`/cards/${card.id}`);

        return { success: true, card, message: 'Card created successfully' };
    } catch (error) {
        console.error('Create card error:', error);

        if (error instanceof Error) {
            return { success: false, message: error.message };
        }

        return { success: false, message: 'Failed to create card' };
    }
}

/**
 * OWNER-ONLY: Update card details
 * User must own the card or be admin
 */
export async function updateCard(cardId: string, updates: Partial<CreateCardData>) {
    try {
        const card = await prisma.card.findUnique({
            where: { id: cardId },
            select: { ownerId: true }
        });

        if (!card) {
            return { success: false, message: 'Card not found' };
        }

        await requireOwnership(card.ownerId);
        if ('isForSale' in updates || 'price' in updates) {
            return { success: false, message: 'Use setCardForSale(cardId, price) to manage sale status and price' };
        }
        const {
            isForSale: _dropIsForSale,
            price: _dropPrice,
            ...safeUpdates
        } = updates as any;

        const updatedCard = await prisma.card.update({
            where: { id: cardId },
            data: safeUpdates,
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        profileImageUrl: true,
                        isSeller: true
                    }
                }
            }
        });

        revalidatePath('/cards');
        revalidatePath(`/cards/${cardId}`);

        return { success: true, card: updatedCard, message: 'Card updated successfully' };
    } catch (error) {
        console.error('Update card error:', error);

        if (error instanceof Error) {
            return { success: false, message: error.message };
        }

        return { success: false, message: 'Failed to update card' };
    }
}

/**
 * OWNER-ONLY: Delete a card
 * User must own the card or be admin
 */
export async function deleteCard(cardId: string) {
    try {
        const card = await prisma.card.findUnique({
            where: { id: cardId },
            select: { ownerId: true, name: true }
        });

        if (!card) {
            return { success: false, message: 'Card not found' };
        }

        await requireOwnership(card.ownerId);

        await prisma.card.delete({
            where: { id: cardId }
        });

        revalidatePath('/cards');

        return { success: true, message: `Card "${card.name}" deleted successfully` };
    } catch (error) {
        console.error('Delete card error:', error);

        if (error instanceof Error) {
            return { success: false, message: error.message };
        }

        return { success: false, message: 'Failed to delete card' };
    }
}

/**
 * SELLER-ONLY: Set card for sale
 * Only sellers can list cards for sale
 */
export async function setCardForSale(cardId: string, price: number) {
    try {
        const card = await prisma.card.findUnique({
            where: { id: cardId },
            select: { ownerId: true }
        });

        if (!card) {
            return { success: false, message: 'Card not found' };
        }

        await requireOwnership(card.ownerId);
        await requireRole(Role.SELLER);
        if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
            return { success: false, message: 'Price must be a positive number' };
        }

        const updatedCard = await prisma.card.update({
            where: { id: cardId },
            data: {
                isForSale: true,
                price: price
            }
        });

        revalidatePath('/cards');
        revalidatePath(`/cards/${cardId}`);
        revalidatePath('/marketplace');

        return { success: true, card: updatedCard, message: 'Card listed for sale' };
    } catch (error) {
        console.error('Set card for sale error:', error);

        if (error instanceof Error) {
            return { success: false, message: error.message };
        }

        return { success: false, message: 'Failed to list card for sale' };
    }
}

/**
 * CONDITIONAL: Add card to favorites
 * Requires authentication, but shows different behavior for authenticated vs anonymous
 */
export async function toggleFavorite(cardId: string) {
    try {
        const user = await getOptionalAuth();

        if (!user) {
            return { success: false, message: 'Please log in to add favorites' };
        }

        const existingFavorite = await prisma.cardFavorite.findUnique({
            where: {
                userId_cardId: {
                    userId: user.userId,
                    cardId: cardId
                }
            }
        });

        if (existingFavorite) {
            await prisma.cardFavorite.delete({
                where: { id: existingFavorite.id }
            });

            revalidatePath('/favorites');
            return { success: true, favorited: false, message: 'Removed from favorites' };
        } else {
            await prisma.cardFavorite.create({
                data: {
                    userId: user.userId,
                    cardId: cardId
                }
            });

            revalidatePath('/favorites');
            return { success: true, favorited: true, message: 'Added to favorites' };
        }
    } catch (error) {
        console.error('Toggle favorite error:', error);
        return { success: false, message: 'Failed to update favorites' };
    }
}

/**
 * ADMIN-ONLY: Force delete any card
 * Only admins can delete any card regardless of ownership
 */
export async function adminDeleteCard(cardId: string, reason: string) {
    try {
        await requireRole(Role.ADMIN);

        const card = await prisma.card.findUnique({
            where: { id: cardId },
            select: { name: true, ownerId: true }
        });

        if (!card) {
            return { success: false, message: 'Card not found' };
        }

        await prisma.card.delete({
            where: { id: cardId }
        });

        console.log(`Admin deleted card ${cardId} (${card.name}). Reason: ${reason}`);

        revalidatePath('/cards');
        revalidatePath('/admin/cards');

        return { success: true, message: `Card "${card.name}" deleted by admin` };
    } catch (error) {
        console.error('Admin delete card error:', error);

        if (error instanceof Error) {
            return { success: false, message: error.message };
        }

        return { success: false, message: 'Failed to delete card' };
    }
}
