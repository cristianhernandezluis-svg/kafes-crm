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

    if (!msg.message || msg.key.fromMe) return;

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

    const texto =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    if (!texto) return;

    console.log(JSON.stringify(msg, null, 2));

    try {
  const nombreCliente =
    msg.pushName ||
    telefono;

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
  ultima_gestion = NOW(),
  nombre = EXCLUDED.nombre,
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
    [clienteId, telefono, texto, telefono]
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

app.post("/send", async (req, res) => {
  try {
    const { telefono, mensaje } = req.body;

    if (!sock) {
      return res.status(400).json({ error: "WhatsApp no iniciado" });
    }

    await sock.sendMessage(`${telefono}@s.whatsapp.net`, {
      text: mensaje,
    });

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