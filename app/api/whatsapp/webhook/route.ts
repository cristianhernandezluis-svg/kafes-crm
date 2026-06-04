import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function prepararTablas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nombre TEXT,
      telefono TEXT UNIQUE NOT NULL,
      ciudad TEXT,
      etapa TEXT DEFAULT 'Nuevo',
      asesor TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversaciones (
      id SERIAL PRIMARY KEY,
      whatsapp_message_id TEXT,
      mensaje TEXT,
      remitente TEXT,
      tipo TEXT DEFAULT 'text',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

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
    await prepararTablas();

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

    console.log("WHATSAPP GUARDADO:", {
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