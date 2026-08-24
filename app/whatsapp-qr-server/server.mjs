import "dotenv/config";
import express from "express";
import cors from "cors";
import qrcode from "qrcode";
import pg from "pg";
import { decidirRespuestaBot } from "./bot/cerebro.mjs";
import { obtenerMemoriaBot, guardarMemoriaBot } from "./bot/memoria.mjs";
import { obtenerHistorialReciente } from "./bot/historial.mjs";

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
      ADD COLUMN IF NOT EXISTS bot_senales JSONB DEFAULT '[]'::jsonb,\n      ADD COLUMN IF NOT EXISTS bot_producto TEXT,\n      ADD COLUMN IF NOT EXISTS bot_paso TEXT,\n      ADD COLUMN IF NOT EXISTS bot_contexto JSONB DEFAULT '{}'::jsonb;
  `);
}

let sock;
let qrActual = null;
let estado = "desconectado";
let whatsappQrId = null;
let empresaQrId = null;
const telefonoPorLidHistorial = new Map();

async function cargarIntegracionQr() {
  const key = process.env.WHATSAPP_SESSION_KEY;
  if (!key) throw new Error("WHATSAPP_SESSION_KEY no configurado");
  const r = await pool.query("SELECT id, empresa_id FROM integraciones_whatsapp_qr WHERE session_key=$1 LIMIT 1", [key]);
  if (!r.rows[0]) throw new Error("Integracion QR no encontrada");
  whatsappQrId = r.rows[0].id;
  empresaQrId = r.rows[0].empresa_id;
  console.log("Integracion QR cargada:", { whatsappQrId, empresaQrId });
}

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
 const temperatura=score>=80?'caliente':score>=25?'tibio':'frio';
const requiereCloser=false;
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
    syncFullHistory: true,
  });

  sock.ev.on("creds.update", saveCreds);

sock.ev.on("messaging-history.set", async ({ chats = [], contacts = [], messages = [], lidPnMappings = [] }) => {
  console.log("Sincronizacion WhatsApp:", { contacts: contacts.length, chats: chats.length, messages: messages.length });

  for (const m of lidPnMappings) {
    if (m?.lid && m?.pn) telefonoPorLidHistorial.set(m.lid, m.pn);
  }
  const telefonoPorLid = telefonoPorLidHistorial;

  for (const contact of contacts) {
    try {
      const jidContacto = contact.phoneNumber || contact.id || "";
      if (!jidContacto || jidContacto.endsWith("@g.us") || jidContacto === "status@broadcast") continue;

      let telefonoContacto = "";
      if (jidContacto.endsWith("@s.whatsapp.net")) telefonoContacto = jidContacto.replace("@s.whatsapp.net", "");
      else if (jidContacto.endsWith("@c.us")) telefonoContacto = jidContacto.replace("@c.us", "");
      else if (/^\d+$/.test(jidContacto)) telefonoContacto = jidContacto;
      else if (jidContacto.endsWith("@lid")) {
        const pnMapeado = telefonoPorLid.get(jidContacto);
        if (pnMapeado?.endsWith("@s.whatsapp.net")) telefonoContacto = pnMapeado.replace("@s.whatsapp.net", "");
        else if (pnMapeado?.endsWith("@c.us")) telefonoContacto = pnMapeado.replace("@c.us", "");
        else if (/^\d+$/.test(pnMapeado || "")) telefonoContacto = pnMapeado;
        else continue;
      }
      else continue;

      const nombreContacto = contact.name || contact.notify || contact.verifiedName || telefonoContacto;

      const clienteContacto = await pool.query(
        `INSERT INTO clientes (nombre, telefono, etapa, empresa_id, canal)
         VALUES ($1, $2, 'Nuevo', $3, 'qr')
         ON CONFLICT (empresa_id, telefono) DO UPDATE
         SET nombre = CASE WHEN EXCLUDED.nombre <> clientes.telefono THEN EXCLUDED.nombre ELSE clientes.nombre END,
             canal = 'qr'
         RETURNING id`,
        [nombreContacto, telefonoContacto, empresaQrId]
      );

      await pool.query(
        `INSERT INTO clientes_whatsapp_qr (empresa_id, cliente_id, whatsapp_qr_id, origen, updated_at)
         VALUES ($1, $2, $3, 'contacto', NOW())
         ON CONFLICT (cliente_id, whatsapp_qr_id) DO UPDATE SET updated_at = NOW()`,
        [empresaQrId, clienteContacto.rows[0].id, whatsappQrId]
      );
    } catch (err) {
      console.error("Error importando contacto WhatsApp:", err);
    }
  }

  for (const chat of chats) {
    try {
      const jidChat = chat.pnJid || chat.id || "";
      if (!jidChat || jidChat.endsWith("@g.us") || jidChat === "status@broadcast") continue;

      let telefonoChat = "";
      if (jidChat.endsWith("@s.whatsapp.net")) telefonoChat = jidChat.replace("@s.whatsapp.net", "");
      else if (jidChat.endsWith("@c.us")) telefonoChat = jidChat.replace("@c.us", "");
      else if (/^\d+$/.test(jidChat)) telefonoChat = jidChat;
      else if (jidChat.endsWith("@lid")) {
        const pnMapeado = telefonoPorLid.get(jidChat);
        if (pnMapeado?.endsWith("@s.whatsapp.net")) telefonoChat = pnMapeado.replace("@s.whatsapp.net", "");
        else if (pnMapeado?.endsWith("@c.us")) telefonoChat = pnMapeado.replace("@c.us", "");
        else if (/^\d+$/.test(pnMapeado || "")) telefonoChat = pnMapeado;
        else continue;
      }
      else continue;

      const nombreChat = chat.name || chat.displayName || chat.username || telefonoChat;

      const clienteChat = await pool.query(
        `INSERT INTO clientes (nombre, telefono, etapa, empresa_id, canal)
         VALUES ($1, $2, 'Nuevo', $3, 'qr')
         ON CONFLICT (empresa_id, telefono) DO UPDATE
         SET nombre = CASE WHEN EXCLUDED.nombre <> clientes.telefono THEN EXCLUDED.nombre ELSE clientes.nombre END,
             canal = 'qr'
         RETURNING id`,
        [nombreChat, telefonoChat, empresaQrId]
      );

      await pool.query(
        `INSERT INTO clientes_whatsapp_qr (empresa_id, cliente_id, whatsapp_qr_id, origen, updated_at)
         VALUES ($1, $2, $3, 'chat', NOW())
         ON CONFLICT (cliente_id, whatsapp_qr_id) DO UPDATE SET updated_at = NOW()`,
        [empresaQrId, clienteChat.rows[0].id, whatsappQrId]
      );
    } catch (err) {
      console.error("Error importando chat WhatsApp:", err);
    }
  }

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
        const pnMapeado = telefonoPorLid.get(jid);
        if (pnMapeado?.endsWith("@s.whatsapp.net")) telefono = pnMapeado.replace("@s.whatsapp.net", "");
        else if (pnMapeado?.endsWith("@c.us")) telefono = pnMapeado.replace("@c.us", "");
        else if (/^\d+$/.test(pnMapeado || "")) telefono = pnMapeado;
        else continue;
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

      let tipoMensaje = 'text';
      let textoGuardado = texto;

      if (!textoGuardado) {
        if (contenido.audioMessage) { tipoMensaje = 'audio'; textoGuardado = '[Audio]'; }
        else if (contenido.imageMessage) { tipoMensaje = 'image'; textoGuardado = '[Imagen]'; }
        else if (contenido.videoMessage) { tipoMensaje = 'video'; textoGuardado = '[Video]'; }
        else if (contenido.documentMessage) { tipoMensaje = 'document'; textoGuardado = '[Documento]'; }
        else if (contenido.stickerMessage) { tipoMensaje = 'sticker'; textoGuardado = '[Sticker]'; }
        else if (contenido.locationMessage) { tipoMensaje = 'location'; textoGuardado = '[Ubicacion]'; }
        else if (contenido.contactMessage || contenido.contactsArrayMessage) { tipoMensaje = 'contact'; textoGuardado = '[Contacto]'; }
        else continue;
      }

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
        VALUES ($1, $2, 'Nuevo', $4, 'qr')
        ON CONFLICT (empresa_id, telefono) DO UPDATE
        SET
          nombre = CASE
            WHEN $3 = false AND EXCLUDED.nombre <> clientes.telefono
            THEN EXCLUDED.nombre
            ELSE clientes.nombre
          END,
          canal = 'qr'
        RETURNING id
        `,
        [nombreCliente, telefono, esMio, empresaQrId]
      );

      const clienteId = cliente.rows[0].id;


      await pool.query(
        `INSERT INTO clientes_whatsapp_qr (empresa_id, cliente_id, whatsapp_qr_id, origen, updated_at)
         VALUES ($1, $2, $3, 'historial', NOW())
         ON CONFLICT (cliente_id, whatsapp_qr_id) DO UPDATE SET updated_at = NOW()`,
        [empresaQrId, clienteId, whatsappQrId]
      );

      await pool.query(
        `
        INSERT INTO conversaciones (
          cliente_id,
          telefono,
          whatsapp_message_id,
          mensaje,
          remitente,
          tipo,
          empresa_id,
          whatsapp_qr_id,
          canal,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'qr', $9)
        ON CONFLICT (whatsapp_message_id)
        WHERE whatsapp_message_id IS NOT NULL
        DO NOTHING
        `,
        [clienteId, telefono, msg.key.id || null, textoGuardado, remitente, tipoMensaje, empresaQrId, whatsappQrId, fechaMensaje]
      );

      console.log("Historial guardado:", telefono, textoGuardado);
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

      console.log("Conexion cerrada. Reintentando:", shouldReconnect);

      if (shouldReconnect) {
        iniciarWhatsApp();
      }
    }
  });

  const inicioBotUnix = Math.floor(Date.now() / 1000);

sock.ev.on("messages.upsert", async ({ messages, type }) => {
  if (type !== "notify") {
    console.log("HISTORIAL IGNORADO:", type);
    return;
  }
    const msg = messages[0];

const timestampMensaje = Number(msg.messageTimestamp || 0);

if (timestampMensaje < inicioBotUnix) {
  console.log("MENSAJE ANTIGUO IGNORADO:", timestampMensaje);
  return;
}

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
  console.log("WhatsApp envio un LID en vez del telefono:", jid);
  telefono = jid.replace("@lid", "");
} else {
  console.log("No se pudo identificar el numero:", jid);
  return;
}

console.log("JID RECIBIDO:", jid);
console.log("JID ALT:", jidAlt);
console.log("TELEFONO DETECTADO:", telefono);

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
VALUES ($1, $2, 'Nuevo', $4, 'qr')
ON CONFLICT (empresa_id, telefono) DO UPDATE
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
    [nombreCliente, telefono, esMio, empresaQrId]
  );

  const clienteId = cliente.rows[0].id;

  await pool.query(
    `INSERT INTO clientes_whatsapp_qr (empresa_id, cliente_id, whatsapp_qr_id, origen, updated_at)
     VALUES ($1, $2, $3, 'mensaje', NOW())
     ON CONFLICT (cliente_id, whatsapp_qr_id) DO UPDATE SET updated_at = NOW()`,
    [empresaQrId, clienteId, whatsappQrId]
  );

  const mensajeGuardado = await pool.query(
  `
  INSERT INTO conversaciones (
    cliente_id,
    telefono,
    whatsapp_message_id,
    mensaje,
    remitente,
    tipo,
    empresa_id,
    whatsapp_qr_id,
    canal
  )
  VALUES ($1, $2, $3, $4, $5, 'text', $6, $7, 'qr')
  ON CONFLICT (whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL
  DO NOTHING
  RETURNING id
  `,
  [
    clienteId,
    telefono,
    msg.key.id || null,
    texto,
    remitente,
    empresaQrId,
    whatsappQrId,
  ]
);

if (mensajeGuardado.rowCount === 0) {
  console.log(
    "MENSAJE DUPLICADO IGNORADO:",
    msg.key.id
  );
  return;
}

console.log("Mensaje guardado en PostgreSQL");

      if (!esMio) {
        const calificacion = await actualizarCalificacionCliente(clienteId, texto);
        console.log("CALIFICACION BOT:", calificacion);

        if (calificacion && !calificacion.requiereCloser) {
          const memoria = await obtenerMemoriaBot(pool, clienteId);
const historial = await obtenerHistorialReciente(pool, clienteId, mensajeGuardado.rows[0].id);
const respuestaBot = await decidirRespuestaBot({ texto, calificacion, memoria, historial });

          if (respuestaBot?.handoff) {
  const asesorResult = await pool.query(
    `
    SELECT u.nombre
    FROM usuarios u
    JOIN clientes c ON c.empresa_id = u.empresa_id
    WHERE c.id = $1
      AND u.rol = 'asesor'
    ORDER BY u.id ASC
    LIMIT 1
    `,
    [clienteId]
  );

  const asesor = asesorResult.rows[0]?.nombre || null;

  await pool.query(
    `
    UPDATE clientes
    SET score = 100,
        temperatura = 'caliente',
        requiere_closer = true,
        bot_activo = false,
        etapa = 'Calificado',
        asesor = COALESCE($2, asesor)
    WHERE id = $1
    `,
    [clienteId, asesor]
  );

  console.log(
    "HANDOFF A CLOSER:",
    clienteId,
    "ASESOR:",
    asesor || "SIN ASESOR"
  );
}

          if (respuestaBot?.memoria) {
            await guardarMemoriaBot(pool, clienteId, respuestaBot.memoria);
          }

          if (respuestaBot?.mensaje) {
            const jidRespuesta = msg.key.remoteJidAlt || `${telefono}@s.whatsapp.net`;

            const enviadoBot = await sock.sendMessage(jidRespuesta, {
  text: respuestaBot.mensaje,
});

await pool.query(
  `
  INSERT INTO conversaciones (
    cliente_id,
    telefono,
    whatsapp_message_id,
    mensaje,
    remitente,
    tipo,
    empresa_id,
    whatsapp_qr_id,
    canal
  )
  VALUES ($1, $2, $3, $4, 'bot', 'text', $5, $6, 'qr')
  ON CONFLICT (whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL
  DO UPDATE SET
    mensaje = EXCLUDED.mensaje,
    remitente = 'bot'
  `,
  [
    clienteId,
    telefono,
    enviadoBot?.key?.id || null,
    respuestaBot.mensaje,
    empresaQrId,
    whatsappQrId,
  ]
);

console.log("BOT RESPONDIO:", {
  tipo: respuestaBot?.tipo,
  producto: respuestaBot?.producto,
  intencion: respuestaBot?.intencion,
  objecion: respuestaBot?.objecion,
  nivelInteres: respuestaBot?.nivelInteres,
  accion: respuestaBot?.accion,
  handoff: respuestaBot?.handoff,
});
          }
        }
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
    whatsapp_qr_id: whatsappQrId,
    empresa_id: empresaQrId,
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
        VALUES ($1, $2, 'Nuevo', $3, 'qr')
        ON CONFLICT (empresa_id, telefono) DO UPDATE
        SET canal = 'qr'
        `,
        [row.nombre || telefono, telefono, empresaQrId]
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
    AND empresa_id = $2
  LIMIT 1
  `,
  [telefono, empresaQrId]
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
      whatsapp_qr_id,
      canal
    )
    VALUES ($1, $2, $3, 'asesor', 'text', $4, $5, 'qr')
    `,
    [cliente.rows[0].id, telefono, mensaje, empresaQrId, whatsappQrId]
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
  await cargarIntegracionQr();
  await iniciarWhatsApp();
});
