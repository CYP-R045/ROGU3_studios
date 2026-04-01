/*const domain = import.meta.env.PUBLIC_SHOPIFY_STORE_DOMAIN;
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

export async function getProducts(first = 12) {
  const query = /* GraphQL  `
    query Products($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            featuredImage {
              url
              altText
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyFetch<any>(query, { first });
  return data.products.edges.map((e: any) => e.node);
}
*/