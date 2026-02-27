import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(200).end();

    const payload = req.body;

    const phone =
        payload.phone ||
        payload.customer?.phone ||
        payload.shipping_address?.phone;

    if (!phone || !payload.abandoned_checkout_url) {
        return res.status(200).end();
    }

    await supabase.from("abandoned_checkouts").insert({
        checkout_id: payload.id,
        phone,
        recovery_url: payload.abandoned_checkout_url,
        created_at: new Date(),
    });

    res.status(200).end();
}