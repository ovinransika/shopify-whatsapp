export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(200).send("OK");
    }

    const payload = req.body;

    const orderNumber = payload.name || payload.order_number;
    const phone =
        payload.phone || payload.customer?.phone;

    console.log("Order:", orderNumber);
    console.log("Phone:", phone);

    // stop if phone missing
    if (!phone) {
        return res.status(200).send("No phone");
    }

    // remove + symbol
    const cleanPhone = phone.replace("+", "");

    // SEND WHATSAPP TEMPLATE

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
                    name: "simple_test",
                    language: { code: "en" },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: orderNumber }
                            ]
                        }
                    ]
                }
            })
        }
    );

    const data = await response.json();
    console.log("WhatsApp response:", data);

    return res.status(200).send("Message sent");
}