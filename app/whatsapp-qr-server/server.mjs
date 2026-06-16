import "dotenv/config";
import express from "express";
import cors from "cors";
import qrcode from "qrcode";
import pg from "pg";

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
} from "@whiskeysockets/baileys";

const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let sock;
let qrActual = null;
let estado = "desconectado";

async function iniciarWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  sock = makeWASocket({
    auth: state,
  });

  sock.ev.on("creds.update", saveCreds);

sock.ev.on("messaging-history.set", async ({ messages }) => {
  console.log("Historial recibido:", messages.length);

  for (const msg of messages) {
    try {
      if (!msg.message) continue;

      const jid = msg.key.remoteJid;
      if (!jid || jid === "status@broadcast") continue;
      if (jid.endsWith("@g.us")) continue;

      const telefono = jid.replace("@s.whatsapp.net", "");

      const texto =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      if (!texto) continue;

      console.log("Historial:", telefono, texto);
    } catch (err) {
      console.log(err);
    }
  }
});

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      qrActual = await qrcode.toDataURL(qr);
      estado = "qr_pendiente";
      console.log("QR generado");
    }

    if (connection === "open") {
      estado = "conectado";
      qrActual = null;
      console.log("WhatsApp conectado");
    }

    if (connection === "close") {
      estado = "desconectado";

      const statusCode = lastDisconnect?.error?.output?.statusCode;

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log("Conexión cerrada. Reintentando:", shouldReconnect);

      if (shouldReconnect) {
        iniciarWhatsApp();
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg.message) return;

    const jid = msg.key.remoteJid;
const jidAlt = msg.key.remoteJidAlt;

if (!jid || jid === "status@broadcast") return;

// Ignorar grupos
if (jid.endsWith("@g.us")) return;

let telefono = "";

if (jidAlt && jidAlt.endsWith("@s.whatsapp.net")) {
  telefono = jidAlt.replace("@s.whatsapp.net", "");
} else if (jid.endsWith("@s.whatsapp.net")) {
  telefono = jid.replace("@s.whatsapp.net", "");
} else if (jid.endsWith("@c.us")) {
  telefono = jid.replace("@c.us", "");
} else if (
  msg.key.participant &&
  msg.key.participant.endsWith("@s.whatsapp.net")
) {
  telefono = msg.key.participant.replace("@s.whatsapp.net", "");
} else if (jid.endsWith("@lid")) {
  console.log("⚠️ WhatsApp envió un LID en vez del teléfono:", jid);
  telefono = jid.replace("@lid", "");
} else {
  console.log("⚠️ No se pudo identificar el número:", jid);
  return;
}

console.log("JID RECIBIDO:", jid);
console.log("JID ALT:", jidAlt);
console.log("TELÉFONO DETECTADO:", telefono);

    const contenido =
  msg.message.ephemeralMessage?.message ||
  msg.message.viewOnceMessage?.message ||
  msg.message.documentWithCaptionMessage?.message ||
  msg.message;

const texto =
  contenido.conversation ||
  contenido.extendedTextMessage?.text ||
  contenido.imageMessage?.caption ||
  contenido.videoMessage?.caption ||
  contenido.documentMessage?.caption ||
  contenido.buttonsResponseMessage?.selectedDisplayText ||
  contenido.listResponseMessage?.title ||
  contenido.templateButtonReplyMessage?.selectedDisplayText ||
  "";

if (!texto) {
  console.log("Mensaje sin texto reconocido:", JSON.stringify(msg.message, null, 2));
  return;
}

    console.log(JSON.stringify(msg, null, 2));

    try {
  const esMio = msg.key.fromMe === true;

const nombreCliente = !esMio && msg.pushName
  ? msg.pushName
  : telefono;

const remitente = esMio ? "asesor" : "cliente";
  const cliente = await pool.query(
    `
    INSERT INTO clientes (
  nombre,
  telefono,
  etapa,
  empresa_id,
  canal
)
VALUES ($1, $2, 'Nuevo', 1, 'qr')
ON CONFLICT (telefono) DO UPDATE
SET
  nombre = CASE
    WHEN EXCLUDED.nombre <> clientes.telefono
    THEN EXCLUDED.nombre
    ELSE clientes.nombre
  END,
  ultima_gestion = NOW(),
  canal = 'qr'
RETURNING id
    `,
    [nombreCliente, telefono]
  );

  const clienteId = cliente.rows[0].id;

  await pool.query(
    `
    INSERT INTO conversaciones (
      cliente_id,
      telefono,
      mensaje,
      remitente,
      tipo,
      empresa_id,
      canal
    )
    VALUES ($1, $2, $3, $4, 'text', 1, 'qr')
    `,
    [clienteId, telefono, texto, remitente]
  );

      console.log("Mensaje guardado en PostgreSQL");
    } catch (error) {
      console.error("Error guardando mensaje:", error);
    }
  });
}

app.get("/qr", (req, res) => {
  res.json({
    estado,
    qr: qrActual,
  });
});

app.post("/sync-contacts", async (req, res) => {
  try {
    if (!sock) {
      return res.status(400).json({
        success: false,
        error: "WhatsApp no iniciado",
      });
    }

    if (estado !== "conectado") {
      return res.status(400).json({
        success: false,
        error: "WhatsApp no conectado",
      });
    }

    const resultado = await pool.query(`
      SELECT DISTINCT
        telefono,
        COALESCE(NULLIF(telefono, ''), telefono) AS nombre
      FROM conversaciones
      WHERE telefono IS NOT NULL
        AND telefono <> ''
        AND canal = 'qr'
    `);

    let contactosSincronizados = 0;

    for (const row of resultado.rows) {
      const telefono = String(row.telefono).replace(/\D/g, "");

      if (!telefono) continue;

      await pool.query(
        `
        INSERT INTO clientes (
          nombre,
          telefono,
          etapa,
          empresa_id,
          canal
        )
        VALUES ($1, $2, 'Nuevo', 1, 'qr')
        ON CONFLICT (telefono) DO UPDATE
        SET canal = 'qr'
        `,
        [row.nombre || telefono, telefono]
      );

      contactosSincronizados++;
    }

    return res.json({
      success: true,
      contactos_sincronizados: contactosSincronizados,
    });
  } catch (error) {
    console.error("Error sincronizando contactos:", error);

    return res.status(500).json({
      success: false,
      error: "Error sincronizando contactos",
    });
  }
});
app.post("/send", async (req, res) => {
  try {
    const { telefono, mensaje } = req.body;

    if (!sock) {
      return res.status(400).json({ error: "WhatsApp no iniciado" });
    }

    await sock.sendMessage(`${telefono}@s.whatsapp.net`, {
  text: mensaje,
});

const cliente = await pool.query(
  `
  SELECT id FROM clientes
  WHERE telefono = $1
  LIMIT 1
  `,
  [telefono]
);

if (cliente.rows.length > 0) {
  await pool.query(
    `
    INSERT INTO conversaciones (
      cliente_id,
      telefono,
      mensaje,
      remitente,
      tipo,
      empresa_id,
      canal
    )
    VALUES ($1, $2, $3, 'asesor', 'text', 1, 'qr')
    `,
    [cliente.rows[0].id, telefono, mensaje]
  );
}

res.json({ success: true });
  } catch (error) {
    console.error("Error enviando mensaje:", error);
    res.status(500).json({ error: "Error enviando mensaje" });
  }
});

const PORT = process.env.PORT || 4001;

app.listen(PORT, async () => {
  console.log(`Servidor WhatsApp QR en puerto ${PORT}`);
  await iniciarWhatsApp();
});