// src/utils/cart.ts
export type CartItem = {
  id: string;
  name: string;
  price?: number;
  imageUrl?: string; // 你的 Card 字段里是 imageUrl
  qty: number;
  // 你需要的其他字段也可以附带，比如 brand/year/player...
  [k: string]: any;
};

const CART_KEY = "cart";

export function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    // 跨标签页/路由同步
    try {
      const bc = new BroadcastChannel("swish-cart");
      bc.postMessage({ type: "cart-updated" });
      bc.close();
    } catch {}
  } catch {}
}

export function upsertCartItem(partial: Omit<CartItem, "qty"> & { qty?: number }) {
  const items = readCart();
  const idx = items.findIndex((it) => it.id === partial.id);
  if (idx >= 0) {
    const next = [...items];
    const old = next[idx];
    const inc = Math.max(1, partial.qty ?? 1);
    next[idx] = { ...old, ...partial, qty: Math.max(0, (old.qty ?? 0) + inc) };
    writeCart(next);
    return next[idx];
  } else {
    const newItem: CartItem = {
      ...partial,
      qty: Math.max(1, partial.qty ?? 1),
    } as CartItem;
    const next = [...items, newItem];
    writeCart(next);
    return newItem;
  }
}

export function changeQty(id: string, delta: number) {
  const items = readCart();
  const next = items
    .map((it) => (it.id === id ? { ...it, qty: Math.max(0, (it.qty ?? 0) + delta) } : it))
    .filter((it) => it.qty > 0);
  writeCart(next);
  return next;
}

export function removeItem(id: string) {
  const items = readCart().filter((it) => it.id !== id);
  writeCart(items);
  return items;
}

export function clearCart() {
  writeCart([]);
}

export function totals(items = readCart()) {
  const itemsTotal = items.reduce((s, it) => s + (it.price ?? 0) * it.qty, 0);
  const totalQty = items.reduce((s, it) => s + it.qty, 0);
  return { itemsTotal, totalQty };
}
