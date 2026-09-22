const fs = require("fs");
const path = require("path");

const file = path.join(
  process.cwd(),
  "app",
  "whatsapp-qr-server",
  "server.mjs"
);

if (!fs.existsSync(file)) {
  throw new Error(`No existe: ${file}`);
}

const backup =
  `${file}.backup-condicion-tipo-mensaje`;

if (!fs.existsSync(backup)) {
  fs.copyFileSync(file, backup);
}

let text = fs.readFileSync(file, "utf8");

if (
  /tipoMensajeCliente\s*:/.test(text)
) {
  console.log(
    "✅ tipoMensajeCliente ya estaba agregado. No se hizo ningún cambio."
  );
  process.exit(0);
}

const regex =
  /(textoCliente\s*:\s*textoGuardado\s*\|\|\s*["']{2}\s*,)/;

if (!regex.test(text)) {
  console.error("");
  console.error(
    "❌ No encontré la propiedad textoCliente dentro de procesarFlujoCliente."
  );
  console.error(
    "Ejecuta este comando y pásame la salida:"
  );
  console.error(
    'powershell -Command "Select-String -Path app\\whatsapp-qr-server\\server.mjs -Pattern \'procesarFlujoCliente|textoCliente\' -Context 12,20"'
  );
  process.exit(1);
}

text = text.replace(
  regex,
  `$1
          tipoMensajeCliente: tipoMensaje || "text",`
);

fs.writeFileSync(
  file,
  text,
  "utf8"
);

console.log(
  "✅ server.mjs corregido: tipoMensajeCliente agregado."
);
console.log("");
console.log("Ahora valida:");
console.log(
  "node --check app\\whatsapp-qr-server\\bot\\flujos.mjs"
);
console.log(
  "node --check app\\whatsapp-qr-server\\server.mjs"
);
console.log("npm run build");
