const fs = require("fs");

const file = "app/whatsapp-qr-server/server.mjs";
let s = fs.readFileSync(file, "utf8");

if (s.includes("await prepararColumnasBot();")) {
  console.log("prepararColumnasBot() ya se ejecuta en el arranque.");
  process.exit(0);
}

const oldText = `app.listen(PORT, async () => {
  console.log(\`Servidor WhatsApp QR en puerto \${PORT}\`);
  await cargarIntegracionQr();
  await iniciarWhatsApp();`;

const newText = `app.listen(PORT, async () => {
  console.log(\`Servidor WhatsApp QR en puerto \${PORT}\`);
  await prepararColumnasBot();
  await cargarIntegracionQr();
  await iniciarWhatsApp();`;

if (!s.includes(oldText)) {
  throw new Error("No encontre el bloque de arranque esperado.");
}

s = s.replace(oldText, newText);
fs.writeFileSync(file, s, "utf8");

console.log("ARRANQUE: prepararColumnasBot() agregado antes de WhatsApp");
console.log("PATCH ARRANQUE COLUMNAS OK");
