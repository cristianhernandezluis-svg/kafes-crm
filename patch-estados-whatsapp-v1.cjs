const fs = require("fs");

const file = "app/whatsapp-qr-server/server.mjs";
let s = fs.readFileSync(file, "utf8");

function fail(msg) { throw new Error(msg); }

if (!s.includes("ADD COLUMN IF NOT EXISTS estado_whatsapp")) {
  const start = s.indexOf("async function prepararColumnasBot()");
  const next = s.indexOf("\nlet sock;", start);
  if (start < 0 || next < 0) fail("No encontre prepararColumnasBot/let sock");
  const segment = s.slice(start, next);
  const closeRel = segment.lastIndexOf("}");
  if (closeRel < 0) fail("No encontre cierre de prepararColumnasBot");
  const close = start + closeRel;

  const dbPatch = `

  await pool.query(\`
    ALTER TABLE conversaciones
      ADD COLUMN IF NOT EXISTS estado_whatsapp TEXT,
      ADD COLUMN IF NOT EXISTS enviado_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS entregado_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS leido_whatsapp_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS reproducido_at TIMESTAMPTZ;
  \`);
`;

  s = s.slice(0, close) + dbPatch + s.slice(close);
}

if (!s.includes("function estadoDesdeWAMessageStatus(")) {
  const marker = "async function cargarIntegracionQr()";
  const idx = s.indexOf(marker);
  if (idx < 0) fail("No encontre cargarIntegracionQr");

  const helpers = `function estadoDesdeWAMessageStatus(status) {
  const numero = Number(status);
  if (numero === 2) return "enviado";
  if (numero === 3) return "entregado";
  if (numero === 4) return "leido";
  if (numero === 5) return "reproducido";

  const texto = String(status || "").toUpperCase();
  if (texto === "SERVER_ACK") return "enviado";
  if (texto === "DELIVERY_ACK") return "entregado";
  if (texto === "READ") return "leido";
  if (texto === "PLAYED") return "reproducido";
  return null;
}

function rangoEstadoWhatsApp(estadoWhatsApp) {
  if (estadoWhatsApp === "enviado") return 1;
  if (estadoWhatsApp === "entregado") return 2;
  if (estadoWhatsApp === "leido") return 3;
  if (estadoWhatsApp === "reproducido") return 4;
  return 0;
}

function fechaDesdeTimestampWhatsApp(valor) {
  if (valor === null || valor === undefined) return null;

  let numero = null;

  if (typeof valor === "number") numero = valor;
  else if (typeof valor === "bigint") numero = Number(valor);
  else if (typeof valor === "string") numero = Number(valor);
  else if (typeof valor?.toNumber === "function") numero = valor.toNumber();

  if (!Number.isFinite(numero) || numero <= 0) return null;

  const ms = numero > 1000000000000 ? numero : numero * 1000;
  const fecha = new Date(ms);

  return Number.isFinite(fecha.getTime()) ? fecha : null;
}

async function actualizarEstadoMensajeWhatsApp(
  whatsappMessageId,
  nuevoEstado,
  fechaEvento = null
) {
  if (!whatsappMessageId || !nuevoEstado || !whatsappQrId) return null;

  const rangoNuevo = rangoEstadoWhatsApp(nuevoEstado);
  if (!rangoNuevo) return null;

  const fecha =
    fechaEvento instanceof Date && Number.isFinite(fechaEvento.getTime())
      ? fechaEvento
      : new Date();

  const result = await pool.query(
    \`
    UPDATE conversaciones
    SET estado_whatsapp = CASE
          WHEN (
            CASE COALESCE(estado_whatsapp, '')
              WHEN 'enviado' THEN 1
              WHEN 'entregado' THEN 2
              WHEN 'leido' THEN 3
              WHEN 'reproducido' THEN 4
              ELSE 0
            END
          ) <= $2
          THEN $1
          ELSE estado_whatsapp
        END,
        enviado_at = CASE
          WHEN $1 = 'enviado' THEN COALESCE(enviado_at, $5)
          ELSE enviado_at
        END,
        entregado_at = CASE
          WHEN $1 = 'entregado' THEN COALESCE(entregado_at, $5)
          ELSE entregado_at
        END,
        leido_whatsapp_at = CASE
          WHEN $1 = 'leido' THEN COALESCE(leido_whatsapp_at, $5)
          ELSE leido_whatsapp_at
        END,
        reproducido_at = CASE
          WHEN $1 = 'reproducido' THEN COALESCE(reproducido_at, $5)
          ELSE reproducido_at
        END
    WHERE whatsapp_message_id = $3
      AND whatsapp_qr_id = $4
      AND remitente IN ('bot', 'asesor')
    RETURNING id, cliente_id, estado_whatsapp
    \`,
    [nuevoEstado, rangoNuevo, String(whatsappMessageId), whatsappQrId, fecha]
  );

  if (result.rowCount > 0) {
    const row = result.rows[0];
    console.log(
      "WHATSAPP ESTADO:",
      row.id,
      "CLIENTE:",
      row.cliente_id,
      "MENSAJE:",
      String(whatsappMessageId),
      "->",
      String(row.estado_whatsapp || nuevoEstado).toUpperCase()
    );
    return row;
  }

  return null;
}

`;

  s = s.slice(0, idx) + helpers + s.slice(idx);
}

if (!s.includes('sock.ev.on("message-receipt.update"')) {
  const marker = 'sock.ev.on("messages.upsert"';
  const idx = s.indexOf(marker);
  if (idx < 0) fail("No encontre messages.upsert");

  const listeners = `sock.ev.on("messages.update", async (updates = []) => {
  try {
    for (const item of updates || []) {
      const whatsappMessageId = item?.key?.id;
      const estadoWhatsApp = estadoDesdeWAMessageStatus(item?.update?.status);

      if (!whatsappMessageId || !estadoWhatsApp) continue;

      await actualizarEstadoMensajeWhatsApp(
        whatsappMessageId,
        estadoWhatsApp,
        new Date()
      );
    }
  } catch (error) {
    console.error(
      "ERROR ESTADO WHATSAPP messages.update:",
      error?.message || error
    );
  }
});

sock.ev.on("message-receipt.update", async (updates = []) => {
  try {
    for (const item of updates || []) {
      const whatsappMessageId = item?.key?.id;
      const receipt = item?.receipt || {};

      if (!whatsappMessageId) continue;

      const fechaPlayed = fechaDesdeTimestampWhatsApp(receipt?.playedTimestamp);
      const fechaRead = fechaDesdeTimestampWhatsApp(receipt?.readTimestamp);

      if (fechaPlayed) {
        await actualizarEstadoMensajeWhatsApp(
          whatsappMessageId,
          "reproducido",
          fechaPlayed
        );
        continue;
      }

      if (fechaRead) {
        await actualizarEstadoMensajeWhatsApp(
          whatsappMessageId,
          "leido",
          fechaRead
        );
      }
    }
  } catch (error) {
    console.error(
      "ERROR ESTADO WHATSAPP message-receipt.update:",
      error?.message || error
    );
  }
});

`;

  s = s.slice(0, idx) + listeners + s.slice(idx);
}

const required = [
  "ADD COLUMN IF NOT EXISTS estado_whatsapp",
  "ADD COLUMN IF NOT EXISTS entregado_at",
  "ADD COLUMN IF NOT EXISTS leido_whatsapp_at",
  'sock.ev.on("messages.update"',
  'sock.ev.on("message-receipt.update"',
  "WHATSAPP ESTADO:",
];

for (const x of required) {
  if (!s.includes(x)) fail("Validacion fallo: " + x);
}

fs.writeFileSync(file, s, "utf8");

console.log("COLUMNAS WHATSAPP: OK");
console.log("LISTENER messages.update: OK");
console.log("LISTENER message-receipt.update: OK");
console.log("ESTADOS: enviado -> entregado -> leido -> reproducido");
console.log("PATCH ESTADOS WHATSAPP V1 OK");
