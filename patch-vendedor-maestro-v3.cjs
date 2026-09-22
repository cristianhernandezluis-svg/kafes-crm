const fs = require("fs");

const cerebroFile = "app/whatsapp-qr-server/bot/cerebro.mjs";
const promptFile = "app/whatsapp-qr-server/bot/prompt.mjs";
const iaFile = "app/whatsapp-qr-server/bot/ia.mjs";

let cerebro = fs.readFileSync(cerebroFile, "utf8");
let prompt = fs.readFileSync(promptFile, "utf8");
let ia = fs.readFileSync(iaFile, "utf8");

function fail(msg) { throw new Error(msg); }

function replaceOnce(text, oldText, newText, label) {
  const count = text.split(oldText).length - 1;
  if (count !== 1) fail(`${label}: esperaba 1 coincidencia y encontre ${count}`);
  return text.replace(oldText, newText);
}

/* =========================================================
   1) CEREBRO: llamada y cierre con compuerta real
   ========================================================= */
const oldBlock = `    if (analisis.fase_venta) {
      contexto.fase_venta = analisis.fase_venta;
    }

    if (analisis.llamar_ahora === true) {
      contexto.llamar_ahora = true;
      contexto.motivo_llamada = analisis.motivo_llamada || "Interes comercial alto";
    } else if (analisis.etapa_sugerida === "Descartado") {
      contexto.llamar_ahora = false;
      delete contexto.motivo_llamada;
    }

    const producto =`;

if (!cerebro.includes("const senalesCalificacion =")) {
  if (!cerebro.includes(oldBlock)) fail("No encontre bloque comercial V1 en cerebro");

  const newBlock = `    const senalesCalificacion = Array.isArray(calificacion?.senales)
      ? calificacion.senales
      : [];

    const scoreCalificacion = Number(calificacion?.score || 0);

    const senalCompraFuerte =
      senalesCalificacion.includes("intencion_compra") ||
      senalesCalificacion.includes("pago") ||
      scoreCalificacion >= 40 ||
      calificacion?.temperatura === "caliente";

    let faseVentaFinal = analisis.fase_venta || "descubrimiento";

    if (faseVentaFinal === "cierre" && !senalCompraFuerte) {
      faseVentaFinal = "descubrimiento";
    }

    contexto.fase_venta = faseVentaFinal;

    const llamarAhoraFinal =
      analisis.llamar_ahora === true &&
      senalCompraFuerte &&
      analisis.etapa_sugerida !== "Descartado" &&
      analisis.accion !== "handoff_closer";

    if (llamarAhoraFinal) {
      contexto.llamar_ahora = true;
      contexto.motivo_llamada =
        analisis.motivo_llamada || "Interes comercial alto";
    } else if (analisis.etapa_sugerida === "Descartado") {
      contexto.llamar_ahora = false;
      delete contexto.motivo_llamada;
    }

    const producto =`;

  cerebro = cerebro.replace(oldBlock, newBlock);
}

if (!cerebro.includes("faseVenta: faseVentaFinal")) {
  cerebro = replaceOnce(
    cerebro,
`      faseVenta: analisis.fase_venta,
      llamarAhora: analisis.llamar_ahora === true,
      motivoLlamada: analisis.motivo_llamada || null,`,
`      faseVenta: faseVentaFinal,
      llamarAhora: llamarAhoraFinal,
      motivoLlamada: llamarAhoraFinal
        ? analisis.motivo_llamada || "Interes comercial alto"
        : null,`,
    "retorno comercial cerebro"
  );
}

/* =========================================================
   2) PROMPT: ciudad sola no es cierre ni llamada
   ========================================================= */
if (!prompt.includes("CIUDAD NO ES CIERRE:")) {
  prompt = replaceOnce(
    prompt,
`LLAMADA COMERCIAL:
Ademas de vender por chat, detecta cuando una llamada humana podria cerrar mejor.`,
`CIUDAD NO ES CIERRE:
- Que el cliente diga solamente su ciudad, distrito o provincia NO significa que este listo para comprar.
- Una ciudad por si sola no justifica fase_venta="cierre".
- Una ciudad por si sola no justifica llamar_ahora=true.
- Despues de recibir la ciudad, responde de forma natural y continua avanzando sin sobrecalificar al cliente.
- Usa fase_venta="cierre" cuando exista una accion concreta hacia compra, pedido, separacion o pago.

LLAMADA COMERCIAL:
Ademas de vender por chat, detecta cuando una llamada humana podria cerrar mejor.`,
    "prompt ciudad no cierre"
  );
}

/* =========================================================
   3) IA: regla de llamada más estricta
   ========================================================= */
if (!ia.includes("UNA UBICACION SOLA NO ES SENAL SUFICIENTE")) {
  ia = replaceOnce(
    ia,
`- Preguntar solamente precio o pedir informacion general NO basta para llamar_ahora=true.`,
`- Preguntar solamente precio o pedir informacion general NO basta para llamar_ahora=true.
- UNA UBICACION SOLA NO ES SENAL SUFICIENTE: si el cliente solamente responde su ciudad, distrito o provincia, llamar_ahora=false.
- No uses fase_venta="cierre" solo porque ya conoces la ciudad.
- Reserva fase_venta="cierre" para intencion concreta de comprar, pedir, separar, pagar o una combinacion clara de senales fuertes.`,
    "ia llamada estricta"
  );
}

fs.writeFileSync(cerebroFile, cerebro, "utf8");
fs.writeFileSync(promptFile, prompt, "utf8");
fs.writeFileSync(iaFile, ia, "utf8");

console.log("CIUDAD SOLA NO ACTIVA LLAMADA: OK");
console.log("CIUDAD SOLA NO ACTIVA CIERRE: OK");
console.log("LLAMAR AHORA REQUIERE SENAL FUERTE: OK");
console.log("VENDEDOR MAESTRO V3 APLICADO");
