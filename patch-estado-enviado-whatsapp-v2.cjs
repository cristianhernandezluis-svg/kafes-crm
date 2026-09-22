const fs = require("fs");

const file = "app/whatsapp-qr-server/server.mjs";
let s = fs.readFileSync(file, "utf8");

function fail(msg) {
  throw new Error(msg);
}

/* =========================================================
   1) TRES ENVIOS AUTOMATICOS DEL BOT
   ========================================================= */

const botInsertRegex =
  /INSERT INTO conversaciones\s*\(\s*cliente_id,\s*telefono,\s*whatsapp_message_id,\s*mensaje,\s*remitente,\s*tipo,\s*empresa_id,\s*whatsapp_qr_id,\s*canal\s*\)\s*VALUES\s*\(\$1,\s*\$2,\s*\$3,\s*\$4,\s*'bot',\s*'text',\s*\$5,\s*\$6,\s*'qr'\)/g;

const botSinEstado = [...s.matchAll(botInsertRegex)].length;

if (botSinEstado === 3) {
  s = s.replace(
    botInsertRegex,
    `INSERT INTO conversaciones (
            cliente_id,
            telefono,
            whatsapp_message_id,
            mensaje,
            remitente,
            tipo,
            empresa_id,
            whatsapp_qr_id,
            estado_whatsapp,
            enviado_at,
            canal
          )
          VALUES ($1, $2, $3, $4, 'bot', 'text', $5, $6, 'enviado', NOW(), 'qr')`
  );
} else if (botSinEstado !== 0) {
  fail("Esperaba 3 INSERT del bot sin estado y encontre " + botSinEstado);
}

/* ON CONFLICT: conservar estados superiores si ya llegaron */
const conflictRegex =
  /mensaje = EXCLUDED\.mensaje,\s*remitente = 'bot'(?!,\s*estado_whatsapp)/g;

const conflictos = [...s.matchAll(conflictRegex)].length;

if (conflictos === 3) {
  s = s.replace(
    conflictRegex,
    `mensaje = EXCLUDED.mensaje,
            remitente = 'bot',
            estado_whatsapp = COALESCE(conversaciones.estado_whatsapp, EXCLUDED.estado_whatsapp),
            enviado_at = COALESCE(conversaciones.enviado_at, EXCLUDED.enviado_at)`
  );
} else if (conflictos !== 0) {
  fail("Esperaba 3 ON CONFLICT del bot y encontre " + conflictos);
}

/* =========================================================
   2) ENVIO MANUAL DEL ASESOR
   ========================================================= */

const sendStart = s.indexOf('app.post("/send"');
if (sendStart < 0) fail('No encontre app.post("/send"');

const portIndex = s.indexOf("const PORT =", sendStart);
if (portIndex < 0) fail("No encontre const PORT despues de /send");

let block = s.slice(sendStart, portIndex);

if (!block.includes("const enviadoAsesor = await sock.sendMessage")) {
  const oldSend = "await sock.sendMessage(`${telefono}@s.whatsapp.net`, {";
  if (!block.includes(oldSend)) fail("No encontre sock.sendMessage del asesor");

  block = block.replace(
    oldSend,
    "const enviadoAsesor = await sock.sendMessage(`${telefono}@s.whatsapp.net`, {"
  );
}

/* Cambiar solo el INSERT manual dentro de /send */
if (!block.includes("'asesor', 'text', $5, $6, 'enviado', NOW(), 'qr'")) {
  const manualInsertRegex =
    /INSERT INTO conversaciones\s*\(\s*cliente_id,\s*telefono,\s*mensaje,\s*remitente,\s*tipo,\s*empresa_id,\s*whatsapp_qr_id,\s*canal\s*\)\s*VALUES\s*\(\$1,\s*\$2,\s*\$3,\s*'asesor',\s*'text',\s*\$4,\s*\$5,\s*'qr'\)/;

  if (!manualInsertRegex.test(block)) {
    fail("No encontre el INSERT manual dentro de /send");
  }

  block = block.replace(
    manualInsertRegex,
    `INSERT INTO conversaciones (
      cliente_id,
      telefono,
      whatsapp_message_id,
      mensaje,
      remitente,
      tipo,
      empresa_id,
      whatsapp_qr_id,
      estado_whatsapp,
      enviado_at,
      canal
    )
    VALUES ($1, $2, $3, $4, 'asesor', 'text', $5, $6, 'enviado', NOW(), 'qr')`
  );

  const argsRegex =
    /\[\s*cliente\.rows\[0\]\.id,\s*telefono,\s*mensaje,\s*empresaQrId,\s*whatsappQrId\s*\]/;

  if (!argsRegex.test(block)) {
    fail("No encontre los argumentos del INSERT manual");
  }

  block = block.replace(
    argsRegex,
    `[
      cliente.rows[0].id,
      telefono,
      enviadoAsesor?.key?.id || null,
      mensaje,
      empresaQrId,
      whatsappQrId,
    ]`
  );
}

s = s.slice(0, sendStart) + block + s.slice(portIndex);

/* =========================================================
   3) VALIDACIONES
   ========================================================= */

const botConEstado =
  (s.match(/'bot', 'text', \$5, \$6, 'enviado', NOW\(\), 'qr'/g) || []).length;

if (botConEstado !== 3) {
  fail("Validacion: esperaba 3 envios bot con ENVIADO y hay " + botConEstado);
}

if (!s.includes("const enviadoAsesor = await sock.sendMessage")) {
  fail("Validacion: falta enviadoAsesor");
}

if (!s.includes("enviadoAsesor?.key?.id || null")) {
  fail("Validacion: falta whatsapp_message_id del asesor");
}

if (!s.includes("'asesor', 'text', $5, $6, 'enviado', NOW(), 'qr'")) {
  fail("Validacion: falta ENVIADO en mensaje manual");
}

fs.writeFileSync(file, s, "utf8");

console.log("BOT seguimiento explicito: ENVIADO OK");
console.log("BOT seguimiento silencio: ENVIADO OK");
console.log("BOT respuesta normal: ENVIADO OK");
console.log("ASESOR manual: message_id + ENVIADO OK");
console.log("PATCH ESTADO ENVIADO V2 OK");
