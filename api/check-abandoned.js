import { createClient } from "@supabase/supabase-js";
import { createDiscountCode } from "../lib/shopify.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ✅ Change these to your actual Meta template names
const ABANDONED_TEMPLATE_1 = "abandoned_cart_1";
const ABANDONED_TEMPLATE_2 = "abandoned_cart_2";

// TEST timings (minutes)
const MINUTES_TO_SEND_1 = 2;
const MINUTES_TO_SEND_2 = 5;

async function sendWhatsAppTemplate(phone, templateName, bodyParameters) {
    const cleanPhone = phone.replace("+", "");

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
                to: cleanPhone,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: "en" }, // use en_US if your template language is en_US
                    components: [
                        {
                            type: "body",
                            parameters: bodyParameters,
                        },
                    ],
                },
            }),
        }
    );

    const data = await resp.json();
    console.log("WhatsApp raw response:", JSON.stringify(data));
    return data;
}

export default async function handler(req, res) {
    // ✅ Protect endpoint (cron-job.org must send this header)
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        console.log("TEST CRON EXECUTED:", new Date().toISOString());

        const { data: carts, error } = await supabase
            .from("abandoned_checkouts")
            .select("*")
            .eq("completed", false);

        if (error) {
            console.log("Supabase fetch error:", error);
            return res.status(200).send("OK");
        }

        const now = Date.now();

        for (const cart of carts) {
            const createdAt = new Date(cart.created_at).getTime();
            const minutesSince = (now - createdAt) / 1000 / 60;

            console.log(
                "Cart:",
                cart.id,
                "Phone:",
                cart.phone,
                "Minutes:",
                minutesSince.toFixed(2),
                "r1:",
                cart.reminded_1,
                "r2:",
                cart.reminded_2,
                "completed:",
                cart.completed
            );

            // ✅ Reminder #1 after 2 mins
            if (!cart.reminded_1 && minutesSince >= MINUTES_TO_SEND_1) {
                console.log("TEST → Sending Reminder 1:", cart.phone);

                await sendWhatsAppTemplate(cart.phone, ABANDONED_TEMPLATE_1, [
                    { type: "text", text: cart.recovery_url },
                ]);

                await supabase
                    .from("abandoned_checkouts")
                    .update({ reminded_1: true })
                    .eq("id", cart.id);
            }

            // ✅ Reminder #2 after 5 mins (only if still not completed)
            if (!cart.reminded_2 && minutesSince >= MINUTES_TO_SEND_2) {
                console.log("TEST → Sending Reminder 2 + coupon:", cart.phone);

                const coupon = await createDiscountCode(); // must return string like "FKxxxx"
                console.log("TEST → Coupon generated:", coupon);

                await sendWhatsAppTemplate(cart.phone, ABANDONED_TEMPLATE_2, [
                    { type: "text", text: coupon },
                    { type: "text", text: cart.recovery_url },
                ]);

                await supabase
                    .from("abandoned_checkouts")
                    .update({ reminded_2: true })
                    .eq("id", cart.id);
            }
        }

        return res.status(200).send("Test check complete");
    } catch (err) {
        console.log("Cron error:", err);
        return res.status(200).send("OK");
    }
}