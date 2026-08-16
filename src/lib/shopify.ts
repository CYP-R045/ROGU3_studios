const domain = import.meta.env.PUBLIC_SHOPIFY_STORE_DOMAIN;
const token = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN;

if (!domain || !token) {
  console.warn("Missing Shopify env vars. Check .env");
}

const endpoint = `https://${domain}/api/2024-07/graphql.json`;

async function shopifyFetch<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  if (json.errors) {
    console.error(json.errors);
    throw new Error("Shopify Storefront API error");
  }

  return json.data;
}

export type ShopifyVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: string;
  selectedOptions: { name: string; value: string }[];
};

export type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  price: string;
  productType: string;
  images: string[];
  variants: ShopifyVariant[];
};

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currencyCode,
  }).format(Number(amount));
}

function mapProductNode(node: any): ShopifyProduct {
  return {
    id: node.id,
    title: node.title,
    handle: node.handle,
    price: formatPrice(
      node.priceRange.minVariantPrice.amount,
      node.priceRange.minVariantPrice.currencyCode
    ),
    productType: node.productType,
    images: node.images.edges.map((e: any) => e.node.url),
    variants: node.variants.edges.map((e: any) => ({
      id: e.node.id,
      title: e.node.title,
      availableForSale: e.node.availableForSale,
      price: formatPrice(e.node.price.amount, e.node.price.currencyCode),
      selectedOptions: e.node.selectedOptions,
    })),
  };
}

const PRODUCT_FIELDS = /* GraphQL */ `
  id
  title
  handle
  productType
  priceRange {
    minVariantPrice {
      amount
      currencyCode
    }
  }
  images(first: 10) {
    edges {
      node {
        url(transform: { preferredContentType: WEBP })
        altText
      }
    }
  }
  variants(first: 25) {
    edges {
      node {
        id
        title
        availableForSale
        price {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
      }
    }
  }
`;

export async function getProducts(first = 24): Promise<ShopifyProduct[]> {
  const query = /* GraphQL */ `
    query Products($first: Int!) {
      products(first: $first) {
        edges {
          node {
            ${PRODUCT_FIELDS}
          }
        }
      }
    }
  `;

  const data = await shopifyFetch<any>(query, { first });
  return data.products.edges.map((e: any) => mapProductNode(e.node));
}

export async function getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const query = /* GraphQL */ `
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        ${PRODUCT_FIELDS}
      }
    }
  `;

  const data = await shopifyFetch<any>(query, { handle });
  if (!data.productByHandle) return null;
  return mapProductNode(data.productByHandle);
}

export type CartLine = {
  id: string;
  quantity: number;
  variantId: string;
  variantTitle: string;
  productTitle: string;
  productHandle: string;
  image: string | null;
  price: string;
};

export type Cart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  totalAmount: string;
  lines: CartLine[];
};

const CART_FIELDS = /* GraphQL */ `
  id
  checkoutUrl
  totalQuantity
  cost {
    totalAmount {
      amount
      currencyCode
    }
  }
  lines(first: 100) {
    edges {
      node {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            price {
              amount
              currencyCode
            }
            image {
              url(transform: { preferredContentType: WEBP })
            }
            product {
              title
              handle
            }
          }
        }
      }
    }
  }
`;

function mapCart(node: any): Cart {
  return {
    id: node.id,
    checkoutUrl: node.checkoutUrl,
    totalQuantity: node.totalQuantity,
    totalAmount: formatPrice(node.cost.totalAmount.amount, node.cost.totalAmount.currencyCode),
    lines: node.lines.edges.map((e: any) => ({
      id: e.node.id,
      quantity: e.node.quantity,
      variantId: e.node.merchandise.id,
      variantTitle: e.node.merchandise.title,
      productTitle: e.node.merchandise.product.title,
      productHandle: e.node.merchandise.product.handle,
      image: e.node.merchandise.image?.url ?? null,
      price: formatPrice(
        e.node.merchandise.price.amount,
        e.node.merchandise.price.currencyCode
      ),
    })),
  };
}

export async function createCart(variantId: string, quantity = 1): Promise<Cart> {
  const query = /* GraphQL */ `
    mutation CartCreate($lines: [CartLineInput!]!) {
      cartCreate(input: { lines: $lines }) {
        cart {
          ${CART_FIELDS}
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyFetch<any>(query, {
    lines: [{ merchandiseId: variantId, quantity }],
  });
  const { cart, userErrors } = data.cartCreate;
  if (userErrors?.length) throw new Error(userErrors[0].message);
  return mapCart(cart);
}

export async function addCartLine(cartId: string, variantId: string, quantity = 1): Promise<Cart> {
  const query = /* GraphQL */ `
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          ${CART_FIELDS}
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyFetch<any>(query, {
    cartId,
    lines: [{ merchandiseId: variantId, quantity }],
  });
  const { cart, userErrors } = data.cartLinesAdd;
  if (userErrors?.length) throw new Error(userErrors[0].message);
  return mapCart(cart);
}

export async function updateCartLine(cartId: string, lineId: string, quantity: number): Promise<Cart> {
  const query = /* GraphQL */ `
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          ${CART_FIELDS}
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyFetch<any>(query, {
    cartId,
    lines: [{ id: lineId, quantity }],
  });
  const { cart, userErrors } = data.cartLinesUpdate;
  if (userErrors?.length) throw new Error(userErrors[0].message);
  return mapCart(cart);
}

export async function removeCartLine(cartId: string, lineId: string): Promise<Cart> {
  const query = /* GraphQL */ `
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          ${CART_FIELDS}
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyFetch<any>(query, { cartId, lineIds: [lineId] });
  const { cart, userErrors } = data.cartLinesRemove;
  if (userErrors?.length) throw new Error(userErrors[0].message);
  return mapCart(cart);
}

export async function getCart(cartId: string): Promise<Cart | null> {
  const query = /* GraphQL */ `
    query GetCart($cartId: ID!) {
      cart(id: $cartId) {
        ${CART_FIELDS}
      }
    }
  `;

  const data = await shopifyFetch<any>(query, { cartId });
  if (!data.cart) return null;
  return mapCart(data.cart);
}
