import { createClient } from "@supabase/supabase-js";
import { createDiscountCode } from "../lib/shopify.js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEMPLATE_1 = "abandoned_cart_1";
const TEMPLATE_2 = "abandoned_cart_2";

const MINUTES_TO_SEND_1 = 2;
const MINUTES_TO_SEND_2 = 5;

async function sendTemplate(phone, template, bodyParams, couponCode = null) {
    const clean = phone.replace("+", "");

    const components = [
        {
            type: "body",
            parameters: bodyParams,
        },
    ];

    if (couponCode) {
        components.push({
            type: "button",
            sub_type: "copy_code",
            index: "0",
            parameters: [
                {
                    type: "coupon_code",
                    coupon_code: couponCode,
                },
            ],
        });
    }

    const resp = await fetch(
        `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.WA_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: clean,
                type: "template",
                template: {
                    name: template,
                    language: { code: "en" },
                    components,
                },
            }),
        }
    );

    const data = await resp.json();
    console.log("WA response:", JSON.stringify(data));
}

export default async function handler(req, res) {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end("Unauthorized");
    }

    console.log("TEST CRON EXECUTED:", new Date().toISOString());

    const { data: carts } = await supabase
        .from("abandoned_checkouts")
        .select("*")
        .eq("completed", false);

    const now = Date.now();

    for (const cart of carts) {
        if (!cart.phone) continue;

        const minutes = (now - new Date(cart.created_at)) / 60000;

        console.log("Cart:", cart.id, "Minutes:", minutes.toFixed(2));

        // ✅ Reminder 1
        if (!cart.reminded_1 && minutes >= MINUTES_TO_SEND_1) {
            console.log("Sending Reminder 1");

            await sendTemplate(cart.phone, TEMPLATE_1, [
                { type: "text", text: cart.recovery_url },
            ]);

            await supabase
                .from("abandoned_checkouts")
                .update({ reminded_1: true })
                .eq("id", cart.id);
        }

        // ✅ Reminder 2
        if (!cart.reminded_2 && minutes >= MINUTES_TO_SEND_2) {
            console.log("Sending Reminder 2");

            const coupon = await createDiscountCode();
            console.log("Coupon:", coupon);

            await sendTemplate(
                cart.phone,
                TEMPLATE_2,
                [
                    { type: "text", text: coupon },
                    { type: "text", text: cart.recovery_url },
                ],
                coupon
            );

            await supabase
                .from("abandoned_checkouts")
                .update({
                    reminded_2: true,
                    discount_code: coupon,
                })
                .eq("id", cart.id);
        }
    }

    res.status(200).send("TEST COMPLETE");
}