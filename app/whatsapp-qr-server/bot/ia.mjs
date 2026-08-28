import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { PROMPT_VENDEDOR, PROMPT_POSTVENTA } from "./prompt.mjs";
import { AnalisisVenta } from "./esquema.mjs";
import { PRODUCTOS } from "./catalogo.mjs";
import { obtenerPoliticasComerciales } from "./politicas.mjs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function obtenerFechaHoraPeru() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const valores = Object.fromEntries(
    partes
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value])
  );

  return `${valores.year}-${valores.month}-${valores.day}T${valores.hour}:${valores.minute}:${valores.second}-05:00`;
}

function prepararCatalogo() {
  return PRODUCTOS.map((p) => ({
    slug: p.slug,
    nombre: p.nombre,
    aliases: p.aliases,
    precio: p.precio,
    precioAntes: p.precioAntes,
    descripcion: p.descripcion,
    beneficios: p.beneficios,
  }));
}

export async function consultarIA(input) {
  const mensaje =
    typeof input === "string"
      ? input
      : input?.mensaje || "";

  const memoria =
    typeof input === "object"
      ? input?.memoria || {}
      : {};

  const historial =
    typeof input === "object"
      ? input?.historial || []
      : [];

  const venta = memoria?.venta || null;

  const datosPostventa = {
    etapa_cliente: memoria?.etapa || null,
    producto: venta?.producto || null,
    monto_total: venta?.monto ?? null,
    adelanto_pagado: venta?.adelanto ?? null,
    saldo_pendiente: venta?.saldo ?? null,
    estado_venta: venta?.estado || null,
    agencia: venta?.agencia || null,
    numero_guia: venta?.numero_guia || null,
    estado_envio: venta?.estado_envio || null,
  };

  const fechaHoraPeru = obtenerFechaHoraPeru();

  const contexto = `
FECHA Y HORA ACTUAL EN PERU:
${fechaHoraPeru}
Zona horaria: America/Lima (UTC-05:00)

CATALOGO REAL:
${JSON.stringify(prepararCatalogo(), null, 2)}

POLITICAS COMERCIALES REALES:
${JSON.stringify(obtenerPoliticasComerciales(), null, 2)}

MEMORIA DEL CLIENTE:
${JSON.stringify(memoria, null, 2)}

DATOS REALES DE POSTVENTA:
${JSON.stringify(datosPostventa, null, 2)}

HISTORIAL RECIENTE:
${JSON.stringify(historial, null, 2)}

MENSAJE ACTUAL:
${mensaje}

REGLAS IMPORTANTES:
- Si identificas un producto del catalogo, en "producto" devuelve EXACTAMENTE su slug.
- Ejemplo: "sierra" o "BOMVINK" corresponde a "sierra-bomvink-8".
- No inventes productos.
- No inventes precios, promociones, caracteristicas ni beneficios.
- Usa solamente la informacion real disponible.
- Si no puedes identificar el producto, devuelve producto=null.
- Usa la memoria para no volver a preguntar datos que el cliente ya dio.
- Responde en espanol natural usado en Peru.
- La respuesta debe ser corta y natural para WhatsApp.
- Responde primero la duda del cliente y luego avanza la conversacion.
- En multimedia usa "ninguno" por defecto.
- Usa multimedia="foto" cuando el cliente pida fotos, quiera ver como viene el producto o una imagen ayude directamente a entenderlo.
- Usa multimedia="video" cuando el cliente pida video, demostracion, funcionamiento o quiera ver el producto trabajando.
- Usa multimedia="audio" solo cuando un audio aporte valor real; no lo uses por rutina.
- No uses multimedia en cada respuesta.
- Solo solicita multimedia si identificaste un producto del catalogo.
- Nunca inventes que existe una foto, video o audio.

REGLAS POSTVENTA:
- DATOS REALES DE POSTVENTA es la fuente de verdad para dinero, saldo, adelanto, agencia, guia y estado de envio.
- Si monto_total, adelanto_pagado o saldo_pendiente tienen un valor, responde usando exactamente esos datos.
- Si el cliente pregunta cuanto debe y saldo_pendiente tiene valor, responde directamente el saldo pendiente.
- Si pregunta cuanto adelanto y adelanto_pagado tiene valor, responde directamente ese monto.
- Si pregunta el total de su compra y monto_total tiene valor, responde directamente ese monto.
- Si agencia tiene valor, puedes indicar esa agencia.
- Si numero_guia tiene valor, puedes indicar esa guia.
- Si estado_envio tiene valor, puedes indicar ese estado.
- Un valor 0 es un dato valido y no significa que falte informacion.
- Si el dato solicitado es null o no esta registrado, no inventes.
- Solo usa handoff_closer cuando el cliente necesita un dato real que no esta registrado o existe una situacion que requiere intervencion humana.
- No hagas handoff_closer si puedes responder correctamente con los datos reales disponibles.
`;

  const promptActivo =
    memoria?.paso === "postventa"
      ? PROMPT_POSTVENTA
      : PROMPT_VENDEDOR;

  const response = await client.responses.parse({
    model: "gpt-5.6-terra",
    instructions: promptActivo,
    input: contexto,
    text: {
      format: zodTextFormat(
        AnalisisVenta,
        "analisis_venta"
      ),
    },
  });

  return response.output_parsed;
}