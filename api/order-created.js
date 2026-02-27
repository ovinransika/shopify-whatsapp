import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(200).send("OK");

    try {
        const payload = req.body;

        const checkoutId = payload.checkout_id;
        const orderNumber = payload.name;

        console.log("✅ Order created:", orderNumber);
        console.log("Checkout ID:", checkoutId);

        if (!checkoutId) {
            console.log("No checkout_id found");
            return res.status(200).send("No checkout id");
        }

        const { error } = await supabase
            .from("abandoned_checkouts")
            .update({
                completed: true,
                completed_at: new Date().toISOString(),
            })
            .eq("checkout_id", String(checkoutId));

        if (error) {
            console.log("❌ Supabase update error:", error);
        } else {
            console.log("✅ Checkout marked completed");
        }

        return res.status(200).send("OK");
    } catch (err) {
        console.log("❌ order-created error:", err);
        return res.status(200).send("OK");
    }
}