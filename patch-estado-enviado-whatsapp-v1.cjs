const fs = require("fs");

const file = "app/whatsapp-qr-server/server.mjs";
let s = fs.readFileSync(file, "utf8");

function fail(msg) { throw new Error(msg); }

const botInsertRegex = /INSERT INTO conversaciones\s*\(\s*cliente_id,\s*telefono,\s*whatsapp_message_id,\s*mensaje,\s*remitente,\s*tipo,\s*empresa_id,\s*whatsapp_qr_id,\s*canal\s*\)\s*VALUES\s*\(\$1,\s*\$2,\s*\$3,\s*\$4,\s*'bot',\s*'text',\s*\$5,\s*\$6,\s*'qr'\)/g;
const botCount = [...s.matchAll(botInsertRegex)].length;

if (botCount === 3) {
  s = s.replace(botInsertRegex, `INSERT INTO conversaciones (
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
          VALUES ($1, $2, $3, $4, 'bot', 'text', $5, $6, 'enviado', NOW(), 'qr')`);
} else if (botCount !== 0) {
  fail("Esperaba 3 INSERT del bot y encontre " + botCount);
}

const conflictRegex = /mensaje = EXCLUDED\.mensaje,\s*remitente = 'bot'(?!,\s*estado_whatsapp)/g;
const conflictCount = [...s.matchAll(conflictRegex)].length;

if (conflictCount === 3) {
  s = s.replace(conflictRegex, `mensaje = EXCLUDED.mensaje,
            remitente = 'bot',
            estado_whatsapp = COALESCE(conversaciones.estado_whatsapp, EXCLUDED.estado_whatsapp),
            enviado_at = COALESCE(conversaciones.enviado_at, EXCLUDED.enviado_at)`);
} else if (conflictCount !== 0) {
  fail("Esperaba 3 ON CONFLICT del bot y encontre " + conflictCount);
}

const start = s.indexOf('app.post("/send"');
if (start < 0) fail("No encontre /send");
const end = s.indexOf("\n});", start);
if (end < 0) fail("No encontre cierre de /send");

let block = s.slice(start, end + 4);

if (!block.includes("const enviadoAsesor = await sock.sendMessage")) {
  const oldSend = "await sock.sendMessage(`${telefono}@s.whatsapp.net`, {";
  if (!block.includes(oldSend)) fail("No encontre envio manual");
  block = block.replace(oldSend, "const enviadoAsesor = await sock.sendMessage(`${telefono}@s.whatsapp.net`, {");
}

if (!block.includes("estado_whatsapp")) {
  const manualRegex = /INSERT INTO conversaciones\s*\(\s*cliente_id,\s*telefono,\s*mensaje,\s*remitente,\s*tipo,\s*empresa_id,\s*whatsapp_qr_id,\s*canal\s*\)\s*VALUES\s*\(\$1,\s*\$2,\s*\$3,\s*'asesor',\s*'text',\s*\$4,\s*\$5,\s*'qr'\)/;

  if (!manualRegex.test(block)) fail("No encontre INSERT manual");

  block = block.replace(manualRegex, `INSERT INTO conversaciones (
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
    VALUES ($1, $2, $3, $4, 'asesor', 'text', $5, $6, 'enviado', NOW(), 'qr')`);

  const oldArgs = "[cliente.rows[0].id, telefono, mensaje, empresaQrId, whatsappQrId]";
  if (!block.includes(oldArgs)) fail("No encontre argumentos manuales");

  block = block.replace(oldArgs, `[
      cliente.rows[0].id,
      telefono,
      enviadoAsesor?.key?.id || null,
      mensaje,
      empresaQrId,
      whatsappQrId,
    ]`);
}

s = s.slice(0, start) + block + s.slice(end + 4);

if ((s.match(/'bot', 'text', \$5, \$6, 'enviado', NOW\(\), 'qr'/g) || []).length !== 3) {
  fail("Validacion de 3 envios bot fallo");
}
if (!s.includes("const enviadoAsesor = await sock.sendMessage")) fail("Falta enviadoAsesor");
if (!s.includes("enviadoAsesor?.key?.id || null")) fail("Falta id manual");

fs.writeFileSync(file, s, "utf8");

console.log("BOT seguimiento explicito: ENVIADO OK");
console.log("BOT seguimiento silencio: ENVIADO OK");
console.log("BOT respuesta normal: ENVIADO OK");
console.log("ASESOR manual: message_id + ENVIADO OK");
console.log("PATCH ESTADO ENVIADO V1 OK");
