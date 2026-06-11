require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const express = require("express");
const cors = require("cors");
const qrcode = require("qrcode");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");

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
    printQRInTerminal: true,
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

      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        iniciarWhatsApp();
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const telefono = msg.key.remoteJid.replace("@s.whatsapp.net", "");
    const texto =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    console.log("Mensaje recibido:", telefono, texto);

try {
  await pool.query(
    `
    INSERT INTO conversaciones (
      telefono,
      mensaje,
      remitente,
      tipo,
      empresa_id
    )
    VALUES ($1, $2, $3, 'text', 1)
    `,
    [telefono, texto, telefono]
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

app.listen(4001, async () => {
  console.log("Servidor WhatsApp QR en puerto 4001");
  await iniciarWhatsApp();
});