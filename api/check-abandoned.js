// import { createClient } from "@supabase/supabase-js";
// import { createDiscountCode } from "../lib/shopify.js";

// const supabase = createClient(
//     process.env.SUPABASE_URL,
//     process.env.SUPABASE_KEY
// );

// // Send WhatsApp Template
// async function sendWhatsApp(phone, template, parameters) {
//     const cleanPhone = phone.replace("+", "");

//     const response = await fetch(
//         `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
//         {
//             method: "POST",
//             headers: {
//                 Authorization: `Bearer ${process.env.WA_TOKEN}`,
//                 "Content-Type": "application/json",
//             },
//             body: JSON.stringify({
//                 messaging_product: "whatsapp",
//                 to: cleanPhone,
//                 type: "template",
//                 template: {
//                     name: template,
//                     language: { code: "en" },
//                     components: [
//                         {
//                             type: "body",
//                             parameters: parameters,
//                         },
//                     ],
//                 },
//             }),
//         }
//     );

//     const data = await response.json();
//     console.log("WhatsApp response:", data);
// }

// // MAIN CRON HANDLER
// export default async function handler(req, res) {
//     try {
//         const now = new Date();

//         const { data: carts, error } = await supabase
//             .from("abandoned_checkouts")
//             .select("*")
//             .eq("completed", false);

//         if (error) {
//             console.log("Supabase error:", error);
//             return res.status(200).end();
//         }

//         for (const cart of carts) {
//             const hoursSince =
//                 (now - new Date(cart.created_at)) / 1000 / 60 / 60;

//             // 🟡 REMINDER #1 (after 2 hours)
//             if (hoursSince > 2 && !cart.reminded_1) {
//                 console.log("Sending Reminder 1 to", cart.phone);

//                 await sendWhatsApp(cart.phone, "abandoned_cart_1", [
//                     {
//                         type: "text",
//                         text: cart.recovery_url,
//                     },
//                 ]);

//                 await supabase
//                     .from("abandoned_checkouts")
//                     .update({ reminded_1: true })
//                     .eq("id", cart.id);
//             }

//             // 🟡 REMINDER #2 (after 24 hours + coupon)
//             if (hoursSince > 24 && !cart.reminded_2) {
//                 console.log("Sending Reminder 2 to", cart.phone);

//                 // generate unique coupon
//                 const coupon = await createDiscountCode();

//                 await sendWhatsApp(cart.phone, "abandoned_cart_2", [
//                     {
//                         type: "text",
//                         text: coupon,
//                     },
//                     {
//                         type: "text",
//                         text: cart.recovery_url,
//                     },
//                 ]);

//                 await supabase
//                     .from("abandoned_checkouts")
//                     .update({ reminded_2: true })
//                     .eq("id", cart.id);
//             }
//         }

//         res.status(200).send("Checked abandoned carts");
//     } catch (err) {
//         console.log("Cron error:", err);
//         res.status(200).end();
//     }
// }


import { createClient } from "@supabase/supabase-js";
import { createDiscountCode } from "../lib/shopify.js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Send WhatsApp Template
async function sendWhatsApp(phone, template, parameters) {
    const cleanPhone = phone.replace("+", "");

    console.log("Sending template:", template, "to", cleanPhone);

    const response = await fetch(
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
                    name: template,
                    language: { code: "en" },
                    components: [
                        {
                            type: "body",
                            parameters: parameters,
                        },
                    ],
                },
            }),
        }
    );

    const data = await response.json();
    console.log("WhatsApp response:", data);
}

export default async function handler(req, res) {
    // ✅ allow Vercel Cron only
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).send("Unauthorized");
    }
    try {
        const now = new Date();

        const { data: carts, error } = await supabase
            .from("abandoned_checkouts")
            .select("*")
            .eq("completed", false);

        if (error) {
            console.log("Supabase error:", error);
            return res.status(200).end();
        }

        for (const cart of carts) {
            const minutesSince =
                (now - new Date(cart.created_at)) / 1000 / 60;

            console.log("Cart:", cart.phone, "Minutes:", minutesSince);

            // 🟡 REMINDER #1 (~3 minutes)
            if (minutesSince > 3 && !cart.reminded_1) {
                console.log("TEST MODE → Reminder 1");

                await sendWhatsApp(cart.phone, "abandoned_cart_1", [
                    {
                        type: "text",
                        text: cart.recovery_url,
                    },
                ]);

                await supabase
                    .from("abandoned_checkouts")
                    .update({ reminded_1: true })
                    .eq("id", cart.id);
            }

            // 🟡 REMINDER #2 (~6 minutes + coupon)
            if (minutesSince > 6 && !cart.reminded_2) {
                console.log("TEST MODE → Reminder 2");

                const coupon = await createDiscountCode();
                console.log("Generated coupon:", coupon);

                await sendWhatsApp(cart.phone, "abandoned_cart_2", [
                    { type: "text", text: coupon },
                    { type: "text", text: cart.recovery_url },
                ]);

                await supabase
                    .from("abandoned_checkouts")
                    .update({ reminded_2: true })
                    .eq("id", cart.id);
            }
        }

        res.status(200).send("Test check complete");
    } catch (err) {
        console.log("Cron error:", err);
        res.status(200).end();
    }
}