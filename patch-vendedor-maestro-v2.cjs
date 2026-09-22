const fs = require("fs");

const files = {
  prompt: "app/whatsapp-qr-server/bot/prompt.mjs",
  ia: "app/whatsapp-qr-server/bot/ia.mjs",
};

let prompt = fs.readFileSync(files.prompt, "utf8");
let ia = fs.readFileSync(files.ia, "utf8");

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

if (!prompt.includes("PRIMER CONTACTO CON INFORMACION GENERAL:")) {
  prompt = replaceOnce(
    prompt,
`PRESENTACION VISUAL TIPO MINI PAGINA:
Cuando sea un primer contacto comercial, el producto este identificado, el cliente pida informacion general y aun no se haya realizado la presentacion:
- si existe multimedia real disponible, puedes usar multimedia = "presentacion";
- apertura debe ser una frase corta y natural, por ejemplo "Claro 👋 te muestro la sierra que viste.";
- la respuesta final debe complementar lo visual con pocos datos relevantes y avanzar naturalmente;
- no conviertas la respuesta en una ficha tecnica larga;
- no repitas la misma presentacion en mensajes posteriores.`,
`PRESENTACION VISUAL TIPO MINI PAGINA:
Cuando sea un primer contacto comercial, el producto este identificado, el cliente pida informacion general y aun no se haya realizado la presentacion:
- si existe multimedia real disponible, puedes usar multimedia = "presentacion";
- apertura debe ser una frase corta y natural, por ejemplo "Claro 👋 te muestro la sierra que viste.";
- la respuesta final debe complementar lo visual con pocos datos relevantes y avanzar naturalmente;
- no conviertas la respuesta en una ficha tecnica larga;
- no repitas la misma presentacion en mensajes posteriores.

PRIMER CONTACTO CON INFORMACION GENERAL:
Cuando el cliente escribe algo como "info", "informacion", "precio", "hola quiero saber", "me interesa" o equivalente y todavia NO conoces su ciudad:
- NO hagas una ficha tecnica;
- NO enumeres 4, 5 o 6 caracteristicas de golpe;
- usa como maximo 1 o 2 datos comerciales que realmente ayuden a entender la oferta;
- si ya estas enviando foto/video, deja que la multimedia haga parte de la demostracion;
- prioriza: que producto es + que incluye/oferta real + precio real;
- despues, si necesitas avanzar, pregunta de forma natural desde que ciudad o parte del Peru escribe;
- NO preguntes por uso ("poda o madera", "casa o chacra") en ese primer turno salvo que el propio cliente ya haya hablado de su necesidad;
- NO repitas en texto todo lo que ya se ve o se comunica en la presentacion visual.

Ejemplo de ritmo correcto:
Apertura: "Claro 👋 te muestro la sierra que viste."
[foto/video]
Respuesta final: "Viene con sus 2 baterias y esta a S/249. ¿Desde que parte del Peru me escribes?"

El ejemplo solo muestra el ritmo. Usa siempre el precio y datos reales del catalogo actual.`,
    "prompt primer contacto"
  );
}

if (!prompt.includes("ORDEN NATURAL DE DESCUBRIMIENTO:")) {
  prompt = replaceOnce(
    prompt,
`RITMO COMERCIAL:
Piensa en la conversacion como movimientos, no como un cuestionario:`,
`ORDEN NATURAL DE DESCUBRIMIENTO:
- Si falta ciudad y el cliente esta en primer contacto, normalmente pregunta ciudad antes que uso.
- Si ya conoces ciudad pero falta entender la necesidad y conocerla ayudaria a vender, entonces puedes preguntar uso.
- Si ya conoces ciudad y uso, no vuelvas a descubrir: avanza con envio, confianza, pedido o cierre segun el contexto.
- Si el cliente hace una pregunta concreta, responde eso primero aunque el orden anterior sugiera otra cosa.

RITMO COMERCIAL:
Piensa en la conversacion como movimientos, no como un cuestionario:`,
    "prompt orden descubrimiento"
  );
}

if (!ia.includes("REGLA ESPECIAL DE PRIMER CONTACTO GENERAL:")) {
  ia = replaceOnce(
    ia,
`- Si llamar_ahora=true, motivo_llamada resume en una frase por que conviene llamar.

REGLAS POSTVENTA:`,
`- Si llamar_ahora=true, motivo_llamada resume en una frase por que conviene llamar.

REGLA ESPECIAL DE PRIMER CONTACTO GENERAL:
- Si el mensaje es una solicitud general de informacion/interes y memoria.contexto.ciudad no existe:
  - si hay presentacion visual disponible, usa preferentemente fase_venta="presentacion" y multimedia="presentacion";
  - apertura debe ser corta;
  - respuesta debe ser breve y NO parecer ficha tecnica;
  - menciona como maximo 1 o 2 datos relevantes ademas del precio;
  - no preguntes por uso en ese primer turno salvo que el cliente ya haya mencionado su necesidad;
  - si conviene hacer una pregunta, pregunta primero la ciudad o desde que parte del Peru escribe.
- Evita listar al mismo tiempo voltaje, medidas, diseño, usos, accesorios y precio.
- La multimedia debe hacer parte del trabajo de demostracion; el texto no debe duplicarla.

REGLAS POSTVENTA:`,
    "ia primer contacto"
  );
}

fs.writeFileSync(files.prompt, prompt, "utf8");
fs.writeFileSync(files.ia, ia, "utf8");

console.log("PROMPT PRIMER CONTACTO HUMANO: OK");
console.log("IA PRIORIZA CIUDAD ANTES QUE USO: OK");
console.log("EVITA FICHA TECNICA EN INFO GENERAL: OK");
console.log("VENDEDOR MAESTRO V2 APLICADO");
