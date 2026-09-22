const fs = require("fs");

const file = "app/chat/page.tsx";
let s = fs.readFileSync(file, "utf8");

const oldText = `            El bot sigue atendiendo. Esta alerta no significa que requiera closer.`;

const newText = `            {clienteActivo.bot_activo === false
              ? "Estás atendiendo esta conversación. El bot se reanudará al salir."
              : "El bot sigue atendiendo. Puedes llamar para apoyar el cierre."}`;

if (s.includes(newText)) {
  console.log("TEXTO DINAMICO LLAMAR AHORA YA ESTABA APLICADO");
  process.exit(0);
}

if (!s.includes(oldText)) {
  throw new Error("No encontré el texto fijo de la tarjeta LLAMAR AHORA");
}

s = s.replace(oldText, newText);
fs.writeFileSync(file, s, "utf8");

console.log("TEXTO BOT ACTIVO: OK");
console.log("TEXTO BOT PAUSADO: OK");
console.log("PATCH LLAMAR AHORA DINAMICO APLICADO");
