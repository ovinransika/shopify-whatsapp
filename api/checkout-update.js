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

        console.log("✅ checkout-update hit");
        console.log("checkout id:", checkoutId);
        console.log("phone:", phone);
        console.log("recoveryUrl:", recoveryUrl);

        if (!checkoutId) return res.status(200).send("No checkout id");

        const updateData = {};
        if (phone) updateData.phone = String(phone);
        if (recoveryUrl) updateData.recovery_url = String(recoveryUrl);

        if (Object.keys(updateData).length === 0) {
            return res.status(200).send("Nothing to update");
        }

        const { error } = await supabase
            .from("abandoned_checkouts")
            .update(updateData)
            .eq("checkout_id", checkoutId);

        if (error) {
            console.log("❌ Supabase update error:", error);
            return res.status(200).send("Update failed");
        }

        console.log("✅ Updated checkout:", checkoutId);
        return res.status(200).send("Updated");
    } catch (e) {
        console.log("❌ checkout-update error:", e);
        return res.status(200).send("OK");
    }
}