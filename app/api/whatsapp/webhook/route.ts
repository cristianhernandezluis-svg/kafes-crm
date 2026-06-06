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
      cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
      telefono TEXT,
      whatsapp_message_id TEXT,
      mensaje TEXT,
      remitente TEXT,
      tipo TEXT DEFAULT 'text',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE conversaciones
    ADD COLUMN IF NOT EXISTS cliente_id INTEGER;
  `);

await pool.query(`
  ALTER TABLE conversaciones
  ADD COLUMN IF NOT EXISTS media_id TEXT;
`);

await pool.query(`
  ALTER TABLE conversaciones
  ADD COLUMN IF NOT EXISTS mime_type TEXT;
`);

await pool.query(`
  ALTER TABLE conversaciones
  ADD COLUMN IF NOT EXISTS filename TEXT;
`);

  await pool.query(`
    ALTER TABLE conversaciones
    ADD COLUMN IF NOT EXISTS telefono TEXT;
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

const tipo = message.type || "text";

let mensaje = "";
let mediaId = null;
let mimeType = null;
let filename = null;

if (tipo === "text") {
  mensaje = message.text?.body || "";
}

if (tipo === "image") {
  mensaje = "📷 Imagen";
  mediaId = message.image?.id || null;
  mimeType = message.image?.mime_type || null;
}

if (tipo === "document") {
  mensaje = "📄 Documento";
  mediaId = message.document?.id || null;
  mimeType = message.document?.mime_type || null;
  filename = message.document?.filename || null;
}

if (tipo === "audio") {
  mensaje = "🎤 Audio";
  mediaId = message.audio?.id || null;
  mimeType = message.audio?.mime_type || null;
}

const whatsappMessageId = message.id || null;
    const clienteResult = await pool.query(
      `
      INSERT INTO clientes (nombre, telefono)
      VALUES ($1, $2)
      ON CONFLICT (telefono)
      DO UPDATE SET nombre = EXCLUDED.nombre
      RETURNING id, nombre, telefono;
      `,
      [nombre, telefono]
    );

    const cliente = clienteResult.rows[0];

    await pool.query(
      `
INSERT INTO conversaciones (
  cliente_id,
  telefono,
  whatsapp_message_id,
  mensaje,
  remitente,
  tipo,
  media_id,
  mime_type,
  filename
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);      `,
[
  cliente.id,
  telefono,
  whatsappMessageId,
  mensaje,
  "cliente",
  tipo,
  mediaId,
  mimeType,
  filename,
]
    );

    console.log("WHATSAPP GUARDADO:", {
      cliente_id: cliente.id,
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