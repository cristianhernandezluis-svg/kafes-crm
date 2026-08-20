import "dotenv/config";
import express from "express";
import cors from "cors";
import qrcode from "qrcode";
import pg from "pg";

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
} from "@whiskeysockets/baileys";

const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function prepararColumnasBot() {
  await pool.query(`
    ALTER TABLE clientes
      ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS temperatura TEXT DEFAULT 'frio',
      ADD COLUMN IF NOT EXISTS bot_activo BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS requiere_closer BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS bot_senales JSONB DEFAULT '[]'::jsonb;
  `);
}

let sock;
let qrActual = null;
let estado = "desconectado";

function normalizarTexto(t){return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}

function calificarMensajeCliente(texto){const t=normalizarTexto(texto);const senales=[];if(/\b(precio|cuanto|costo|vale)\b/.test(t))senales.push('precio');if(/\b(envio|envios|delivery|entrega|entregas|llega|llegan|agencia|agencias|shalom|olva)\b/.test(t))senales.push('envio');if(/\b(ciudad|distrito|provincia|departamento|direccion|soy de|vivo en)\b/.test(t))senales.push('ubicacion');if(/\b(garantia)\b/.test(t))senales.push('garantia');if(/\b(yape|plin|transferencia|transferir|deposito|depositar|pago|pagos|pagar)\b/.test(t))senales.push('pago');if(/\b(quiero|compro|comprar|separar|separame|reservar|pedido|quiero uno)\b/.test(t))senales.push('intencion_compra');if(/\b(hoy|ahora|ya mismo)\b/.test(t))senales.push('urgencia');return {senales};}

const PESOS_SENALES={precio:5,envio:10,ubicacion:10,garantia:5,pago:30,intencion_compra:60,urgencia:10};

async function actualizarCalificacionCliente(clienteId,texto){
 const detectado=calificarMensajeCliente(texto);
 const r=await pool.query(`SELECT COALESCE(bot_senales,'[]'::jsonb) AS bot_senales,COALESCE(bot_activo,true) AS bot_activo FROM clientes WHERE id=$1 LIMIT 1`,[clienteId]);
 if(!r.rows[0]||r.rows[0].bot_activo===false)return null;
 const anteriores=Array.isArray(r.rows[0].bot_senales)?r.rows[0].bot_senales:[];
 const senales=[...new Set([...anteriores,...detectado.senales])];
 const score=Math.min(100,senales.reduce((t,x)=>t+(PESOS_SENALES[x]||0),0));
 const temperatura=score>=60?'caliente':score>=25?'tibio':'frio';
 const requiereCloser=score>=60;
 await pool.query("UPDATE clientes SET bot_senales=$1::jsonb,score=$2,temperatura=$3,requiere_closer=$4,bot_activo=CASE WHEN $4 THEN false ELSE bot_activo END,etapa=CASE WHEN $4 THEN $6 ELSE etapa END WHERE id=$5",[JSON.stringify(senales),score,temperatura,requiereCloser,clienteId,"Calificado"]);
 return {senales,score,temperatura,requiereCloser};
}

async function iniciarWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  const { version } = await fetchLatestWaWebVersion();
  console.log("Version WhatsApp Web:", version);

  sock = makeWASocket({
    auth: state,
    version,
  });

  sock.ev.on("creds.update", saveCreds);

sock.ev.on("messaging-history.set", async ({ messages }) => {
  console.log("Historial recibido:", messages.length);

  for (const msg of messages) {
    try {
      if (!msg.message) continue;

      const jid = msg.key.remoteJid;
      const jidAlt = msg.key.remoteJidAlt;

      if (!jid || jid === "status@broadcast") continue;
      if (jid.endsWith("@g.us")) continue;

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
        telefono = jid.replace("@lid", "");
      } else {
        continue;
      }

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

      if (!texto) continue;

      const esMio = msg.key.fromMe === true;

      let nombreCliente = telefono;

      if (!esMio && msg.pushName) {
        nombreCliente = msg.pushName;
      }

      const remitente = esMio ? "asesor" : "cliente";

      const fechaMensaje = msg.messageTimestamp
        ? new Date(Number(msg.messageTimestamp) * 1000)
        : new Date();

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
            WHEN $3 = false AND EXCLUDED.nombre <> clientes.telefono
            THEN EXCLUDED.nombre
            ELSE clientes.nombre
          END,
          canal = 'qr'
        RETURNING id
        `,
        [nombreCliente, telefono, esMio]
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
          canal,
          created_at
        )
        VALUES ($1, $2, $3, $4, 'text', 1, 'qr', $5)
        `,
        [clienteId, telefono, texto, remitente, fechaMensaje]
      );

      console.log("Historial guardado:", telefono, texto);
    } catch (err) {
      console.error("Error guardando historial:", err);
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
    WHEN $3 = false AND EXCLUDED.nombre <> clientes.telefono
    THEN EXCLUDED.nombre
    ELSE clientes.nombre
  END,
  ultima_gestion = NOW(),
  canal = 'qr'
RETURNING id
    `,
    [nombreCliente, telefono, esMio]
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

      if (!esMio) {
        const calificacion = await actualizarCalificacionCliente(clienteId, texto);
        console.log("CALIFICACION BOT:", calificacion);
      }
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
  await prepararColumnasBot();
  await iniciarWhatsApp();
});
