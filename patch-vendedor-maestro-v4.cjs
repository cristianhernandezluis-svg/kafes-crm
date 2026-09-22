const fs = require("fs");

const promptFile = "app/whatsapp-qr-server/bot/prompt.mjs";
const iaFile = "app/whatsapp-qr-server/bot/ia.mjs";

let prompt = fs.readFileSync(promptFile, "utf8");
let ia = fs.readFileSync(iaFile, "utf8");

function fail(msg) { throw new Error(msg); }

function replaceOnce(text, oldText, newText, label) {
  const count = text.split(oldText).length - 1;
  if (count !== 1) fail(`${label}: esperaba 1 coincidencia y encontre ${count}`);
  return text.replace(oldText, newText);
}

if (!prompt.includes("NO REPITAS EL PRECIO YA COMUNICADO:")) {
  prompt = replaceOnce(
    prompt,
`ORDEN NATURAL DE DESCUBRIMIENTO:
- Si falta ciudad y el cliente esta en primer contacto, normalmente pregunta ciudad antes que uso.`,
`NO REPITAS EL PRECIO YA COMUNICADO:
- Si contexto.precio_acordado ya existe o el historial reciente muestra que el precio ya fue comunicado, NO repitas el precio en el siguiente mensaje salvo que:
  - el cliente lo pregunte nuevamente;
  - exista una negociacion u objecion de precio;
  - haya cambiado la oferta o producto;
  - sea necesario confirmarlo para cerrar.
- Lo mismo aplica a baterias, voltaje, medidas y otras caracteristicas: no las repitas por rutina.
- Usa cada turno para aportar algo nuevo o avanzar la conversacion.
- Si el cliente solamente responde ciudad, confirma brevemente la ciudad y continua con el siguiente paso natural sin volver a resumir la oferta.

ORDEN NATURAL DE DESCUBRIMIENTO:
- Si falta ciudad y el cliente esta en primer contacto, normalmente pregunta ciudad antes que uso.`,
    "prompt no repetir precio"
  );
}

if (!ia.includes("PRECIO YA COMUNICADO NO SE REPITE")) {
  ia = replaceOnce(
    ia,
`REGLA ESPECIAL DE PRIMER CONTACTO GENERAL:`,
`MEMORIA DE INFORMACION YA COMUNICADA:
- PRECIO YA COMUNICADO NO SE REPITE por rutina.
- Si MEMORIA DEL CLIENTE.contexto.precio_acordado tiene valor y el mensaje actual no pregunta precio ni negocia precio, evita volver a mencionarlo.
- Si la presentacion ya fue enviada, evita repetir las mismas caracteristicas salvo que el cliente las pregunte.
- Cada respuesta debe aportar una pieza nueva de informacion, resolver una duda o avanzar al siguiente paso.

REGLA ESPECIAL DE PRIMER CONTACTO GENERAL:`,
    "ia no repetir precio"
  );
}

fs.writeFileSync(promptFile, prompt, "utf8");
fs.writeFileSync(iaFile, ia, "utf8");

console.log("NO REPITE PRECIO YA COMUNICADO: OK");
console.log("NO REPITE CARACTERISTICAS POR RUTINA: OK");
console.log("CADA TURNO DEBE APORTAR ALGO NUEVO: OK");
console.log("VENDEDOR MAESTRO V4 APLICADO");
