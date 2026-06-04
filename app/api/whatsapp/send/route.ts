import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { telefono, mensaje } = await req.json();

  const response = await fetch(
    `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: telefono,
        type: "text",
        text: {
          body: mensaje,
        },
      }),
    }
  );

  const data = await response.json();

  return NextResponse.json(data);
}