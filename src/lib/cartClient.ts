import { createCart, addCartLine, type Cart } from "./shopify";

const CART_ID_KEY = "rogu3_cart_id";

export function getStoredCartId(): string | null {
  return localStorage.getItem(CART_ID_KEY);
}

function storeCartId(id: string) {
  localStorage.setItem(CART_ID_KEY, id);
}

export async function addToCart(variantId: string, quantity = 1): Promise<Cart> {
  const existingId = getStoredCartId();

  let cart: Cart;
  try {
    cart = existingId
      ? await addCartLine(existingId, variantId, quantity)
      : await createCart(variantId, quantity);
  } catch {
    // Stored cart may have expired or completed checkout — start a fresh one.
    cart = await createCart(variantId, quantity);
  }

  storeCartId(cart.id);
  window.dispatchEvent(new CustomEvent("cart:updated", { detail: cart }));
  return cart;
}
