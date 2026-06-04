import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Error de verificación", { status: 403 });
}

export async function POST(req: Request) {
  const body = await req.json();

  try {
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const contact = value?.contacts?.[0];
    const message = value?.messages?.[0];

    if (!message || !contact) {
      return NextResponse.json({ success: true });
    }

    const telefono = contact.wa_id || message.from;
    const nombre = contact.profile?.name || "Cliente WhatsApp";
    const mensaje = message.text?.body || "";
    const whatsappMessageId = message.id || null;
    const tipo = message.type || "text";

    await pool.query(
      `
      INSERT INTO clientes (nombre, telefono)
      VALUES ($1, $2)
      ON CONFLICT (telefono)
      DO UPDATE SET nombre = EXCLUDED.nombre;
      `,
      [nombre, telefono]
    );

    await pool.query(
      `
      INSERT INTO conversaciones (
        whatsapp_message_id,
        mensaje,
        remitente,
        tipo
      )
      VALUES ($1, $2, $3, $4);
      `,
      [whatsappMessageId, mensaje, telefono, tipo]
    );

    console.log("WHATSAPP GUARDADO SIN ID:", {
      telefono,
      nombre,
      mensaje,
      tipo,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR WEBHOOK WHATSAPP:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}