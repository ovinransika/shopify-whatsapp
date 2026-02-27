export async function createDiscountCode() {
    const code =
        "FK" +
        Math.random().toString(36).substring(2, 8).toUpperCase();

    const response = await fetch(
        `https://${process.env.SHOPIFY_STORE}/admin/api/2024-01/graphql.json`,
        {
            method: "POST",
            headers: {
                "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: `
        mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
          discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
            codeDiscountNode {
              codeDiscount {
                ... on DiscountCodeBasic {
                  codes(first: 1) {
                    edges {
                      node {
                        code
                      }
                    }
                  }
                }
              }
            }
            userErrors {
              message
            }
          }
        }`,
                variables: {
                    basicCodeDiscount: {
                        title: code,
                        code: code,
                        startsAt: new Date().toISOString(),
                        endsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                        usageLimit: 1,
                        appliesOncePerCustomer: true,
                        customerGets: {
                            value: { percentage: 0.05 },
                            items: { all: true }
                        }
                    }
                }
            }),
        }
    );

    const data = await response.json();
    console.log("Shopify discount:", data);

    return code;
}