// /lib/shopify.js

export async function createDiscountCode() {
    const code =
        "FK" + Math.random().toString(36).substring(2, 8).toUpperCase();

    const endsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const startsAt = new Date().toISOString();

    const query = `
    mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode {
          codeDiscount {
            ... on DiscountCodeBasic {
              codes(first: 1) {
                edges { node { code } }
              }
            }
          }
        }
        userErrors { field message }
      }
    }
  `;

    const variables = {
        basicCodeDiscount: {
            title: code,
            code,
            startsAt,
            endsAt,

            // ✅ Makes it usable for everyone
            customerSelection: { all: true },

            // ✅ Prevent abuse
            usageLimit: 1,
            appliesOncePerCustomer: true,

            // ✅ 5% off everything
            customerGets: {
                value: { percentage: 5 }, // <-- IMPORTANT: 5 = 5%
                items: { all: true },
            },
        },
    };

    const response = await fetch(
        `https://${process.env.SHOPIFY_STORE}/admin/api/2024-01/graphql.json`,
        {
            method: "POST",
            headers: {
                "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, variables }),
        }
    );

    const data = await response.json();
    console.log("Shopify discount raw:", JSON.stringify(data));

    const errs = data?.data?.discountCodeBasicCreate?.userErrors || [];
    if (errs.length) {
        throw new Error("Shopify discount userErrors: " + JSON.stringify(errs));
    }

    const createdCode =
        data?.data?.discountCodeBasicCreate?.codeDiscountNode?.codeDiscount?.codes
            ?.edges?.[0]?.node?.code;

    if (!createdCode) {
        throw new Error("Discount created but code not returned (unexpected).");
    }

    return createdCode;
}