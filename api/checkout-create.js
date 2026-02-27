import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // ✅ service role key
);

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(200).send("OK");

    try {
        const p = req.body;

        const phone =
            p?.phone ||
            p?.customer?.phone ||
            p?.shipping_address?.phone ||
            p?.billing_address?.phone;

        const recoveryUrl =
            p?.abandoned_checkout_url ||
            p?.recovery_url ||
            p?.checkout_url;

        console.log("✅ checkout webhook hit");
        console.log("phone:", phone);
        console.log("recoveryUrl:", recoveryUrl);
        console.log("checkout id:", p?.id);

        if (!phone || !recoveryUrl || !p?.id) {
            console.log("❌ missing required fields");
            return res.status(200).send("Missing fields");
        }

        // Upsert by checkout_id to avoid duplicates
        const insertPayload = {
            checkout_id: String(p.id),
            phone: String(phone),
            recovery_url: String(recoveryUrl),
            created_at: new Date().toISOString(),
            reminded_1: false,
            reminded_2: false,
            completed: false,
        };

        const { data: inserted, error: insertError } = await supabase
            .from("abandoned_checkouts")
            .upsert(insertPayload, { onConflict: "checkout_id" })
            .select()
            .single();

        if (insertError) {
            console.log("❌ Supabase insert error:", insertError);
            return res.status(200).send("Supabase insert failed");
        }

        console.log("✅ Supabase insert OK:", inserted?.id);

        return res.status(200).send("Saved");
    } catch (e) {
        console.log("❌ handler error:", e);
        return res.status(200).send("Error");
    }
}