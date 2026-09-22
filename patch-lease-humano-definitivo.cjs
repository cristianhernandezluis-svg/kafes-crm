const fs = require("fs");

const files = {
  server: "app/whatsapp-qr-server/server.mjs",
  send: "app/api/whatsapp/send/route.ts",
  media: "app/api/whatsapp/send-media/route.ts",
};

let server = fs.readFileSync(files.server, "utf8");
let send = fs.readFileSync(files.send, "utf8");
let media = fs.readFileSync(files.media, "utf8");

function fail(msg) {
  throw new Error(msg);
}

function replaceOnce(text, oldText, newText, label) {
  const count = text.split(oldText).length - 1;
  if (count !== 1) {
    fail(`${label}: esperaba 1 coincidencia y encontre ${count}`);
  }
  return text.replace(oldText, newText);
}

if (!server.includes("AND (humano_hasta IS NULL OR humano_hasta <= NOW())")) {
  server = replaceOnce(
    server,
`     SET bot_activo=true, humano_hasta=NULL
     WHERE id=$1
       AND bot_activo=false
       AND humano_hasta IS NOT NULL
       AND humano_hasta <= NOW()\``,
`     SET bot_activo=true, humano_hasta=NULL
     WHERE id=$1
       AND bot_activo=false
       AND (humano_hasta IS NULL OR humano_hasta <= NOW())\``,
    "rescate legacy en server"
  );
}

if (!send.includes("humano_hasta = NOW() + INTERVAL '90 seconds'")) {
  send = replaceOnce(
    send,
`      SET bot_activo = false,
          requiere_closer = false,
          handoff_motivo = CASE`,
`      SET bot_activo = false,
          requiere_closer = false,
          humano_hasta = NOW() + INTERVAL '90 seconds',
          handoff_motivo = CASE`,
    "lease humano en send"
  );
}

if (!media.includes("humano_hasta = NOW() + INTERVAL '90 seconds'")) {
  media = replaceOnce(
    media,
`      SET bot_activo = false,
          requiere_closer = false,
          handoff_motivo = CASE`,
`      SET bot_activo = false,
          requiere_closer = false,
          humano_hasta = NOW() + INTERVAL '90 seconds',
          handoff_motivo = CASE`,
    "lease humano en send-media"
  );
}

if (!server.includes("AND (humano_hasta IS NULL OR humano_hasta <= NOW())")) {
  fail("Validacion server fallo");
}
if (!send.includes("humano_hasta = NOW() + INTERVAL '90 seconds'")) {
  fail("Validacion send fallo");
}
if (!media.includes("humano_hasta = NOW() + INTERVAL '90 seconds'")) {
  fail("Validacion send-media fallo");
}

fs.writeFileSync(files.server, server, "utf8");
fs.writeFileSync(files.send, send, "utf8");
fs.writeFileSync(files.media, media, "utf8");

console.log("RESCATE CLIENTES LEGACY: OK");
console.log("SEND TEXTO CON LEASE 90S: OK");
console.log("SEND MEDIA CON LEASE 90S: OK");
console.log("BOT NO QUEDA PAUSADO PARA SIEMPRE: OK");
console.log("PATCH LEASE HUMANO DEFINITIVO APLICADO");
