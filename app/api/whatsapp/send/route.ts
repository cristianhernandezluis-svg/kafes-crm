import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req: Request) {
  try {
    const { cliente_id, telefono, mensaje } = await req.json();

    if (!telefono || !mensaje) {
      return NextResponse.json(
        { success: false, error: "Falta teléfono o mensaje" },
        { status: 400 }
      );
    }

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

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data },
        { status: 500 }
      );
    }

    await pool.query(
      `
      INSERT INTO conversaciones (
        cliente_id,
        telefono,
        whatsapp_message_id,
        mensaje,
        remitente,
        tipo
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        cliente_id,
        telefono,
        data.messages?.[0]?.id || null,
        mensaje,
        "asesor",
        "text",
      ]
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("ERROR ENVIANDO WHATSAPP:", error);

    return NextResponse.json(
      { success: false, error: "Error enviando mensaje" },
      { status: 500 }
    );
  }
}