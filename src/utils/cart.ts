// src/utils/cart.ts
import { authFetch } from '@/lib/client_auth';

export type CartItem = {
  id: string;
  name: string;
  price?: number;
  imageUrl?: string;
  qty: number;
  [k: string]: any;
};

export interface CartData {
  id: string | null;
  itemCount: number;
  items: Array<{
    id: string;
    cardId: string;
    card: {
      id: string;
      name: string;
      player: string;
      price: number;
      imageUrl: string | null;
    };
  }>;
  totalPrice: number;
  updatedAt: Date | null;
}

/**
 * Fetches the user's cart from the database.
 *
 * @returns {Promise<CartData | null>} A promise resolving to the cart data if successful, otherwise null.
 */
export async function getCart(): Promise<CartData | null> {
  try {
    const response = await fetch('/api/cart', { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      return data.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching cart:', error);
    return null;
  }
}

/**
 * Adds an item to the user's cart in the database.
 *
 * @param {string} cardId - The ID of the card to add to the cart.
 * @returns {Promise<{ success: boolean; message?: string }>} 
 *          A promise resolving to an object indicating whether the addition was successful, 
 *          and an optional error message.
 */
export async function addToCart(cardId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await authFetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ cardId }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.json();
      return { success: false, message: error.error || 'Failed to add to cart' };
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
    return { success: false, message: 'Failed to add to cart' };
  }
}

/**
 * Removes an item from the user's cart in the database.
 *
 * @param {string} cardId - The ID of the card to remove from the cart.
 * @returns {Promise<{ success: boolean; message?: string }>} 
 *          A promise resolving to an object indicating whether the removal was successful, 
 *          and an optional error message.
 */
export async function removeFromCart(cardId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await authFetch('/api/cart', {
      method: 'DELETE',
      body: JSON.stringify({ cardId }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.json();
      return { success: false, message: error.error || 'Failed to remove from cart' };
    }
  } catch (error) {
    console.error('Error removing from cart:', error);
    return { success: false, message: 'Failed to remove from cart' };
  }
}

/**
 * Checks if a card with the given cardId is present in the user's cart.
 *
 * @param {string} cardId - The ID of the card to check for in the cart.
 * @returns {Promise<boolean>} A promise that resolves to true if the card is in the cart, otherwise false.
 */
export async function isInCart(cardId: string): Promise<boolean> {
  try {
    const cart = await getCart();
    if (!cart) return false;
    return cart.items.some((item) => item.card.id === cardId);
  } catch {
    return false;
  }
}

/**
 * Converts the database cart format to a simplified view format suitable for display.
 *
 * @param {CartData | null} cart - The cart object from the database.
 * @returns {CartItem[]} An array of simplified cart items for display.
 */
export function cartToViewItems(cart: CartData | null): CartItem[] {
  if (!cart) return [];

  return cart.items.map((item) => ({
    id: item.card.id,
    name: item.card.name,
    price: item.card.price,
    imageUrl: item.card.imageUrl ?? '/images/card.png',
    qty: 1,
  }));
}

/**
 * Calculates the total price and total quantity of items in the cart.
 *
 * @param {CartItem[]} items - The list of cart items.
 * @returns {{ itemsTotal: number, totalQty: number }} An object containing the total price (itemsTotal) and the total quantity (totalQty).
 */
export function totals(items: CartItem[]) {
  const itemsTotal = items.reduce((s, it) => s + (it.price ?? 0) * it.qty, 0);
  const totalQty = items.reduce((s, it) => s + it.qty, 0);
  return { itemsTotal, totalQty };
}
