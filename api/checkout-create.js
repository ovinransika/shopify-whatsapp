import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(200).send("OK");

    try {
        const p = req.body;

        const checkoutId = p?.id ? String(p.id) : null;

        const recoveryUrl =
            p?.abandoned_checkout_url || p?.recovery_url || p?.checkout_url || null;

        const phone =
            p?.phone ||
            p?.customer?.phone ||
            p?.shipping_address?.phone ||
            p?.billing_address?.phone ||
            null;

        console.log("✅ checkout-create hit");
        console.log("checkout id:", checkoutId);
        console.log("phone:", phone);
        console.log("recoveryUrl:", recoveryUrl);

        if (!checkoutId || !recoveryUrl) {
            console.log("❌ missing checkoutId or recoveryUrl");
            return res.status(200).send("Missing fields");
        }

        const insertPayload = {
            checkout_id: checkoutId,
            phone: phone ? String(phone) : null,
            recovery_url: String(recoveryUrl),
            created_at: new Date().toISOString(),
            reminded_1: false,
            reminded_2: false,
            completed: false,
        };

        const { data, error } = await supabase
            .from("abandoned_checkouts")
            .upsert(insertPayload, { onConflict: "checkout_id" })
            .select()
            .single();

        if (error) {
            console.log("❌ Supabase upsert error:", error);
            return res.status(200).send("Supabase failed");
        }

        console.log("✅ Saved row:", data?.id, "phone:", data?.phone);
        return res.status(200).send("Saved");
    } catch (e) {
        console.log("❌ checkout-create error:", e);
        return res.status(200).send("OK");
    }
}