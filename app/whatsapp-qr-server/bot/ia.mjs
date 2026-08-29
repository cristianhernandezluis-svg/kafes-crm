import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { PROMPT_VENDEDOR, PROMPT_POSTVENTA } from "./prompt.mjs";
import { AnalisisVenta } from "./esquema.mjs";
import { obtenerCatalogoEmpresa } from "./catalogo.mjs";
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

function prepararCatalogo(productos = []) {
  return productos.map((p) => ({
    slug: p.slug,
    nombre: p.nombre,
    aliases: p.aliases,
    precio: p.precio,
    precioAntes: p.precioAntes,
    descripcion: p.descripcion,
    beneficios: p.beneficios,
    caracteristicas: p.caracteristicas || [],
    usos: p.usos || [],
    incluye: p.incluye || [],
    garantia: p.garantia || null,
    stock: p.stock ?? null,
    promociones: p.promociones || [],
    multimediaDisponible: {
      fotos: Array.isArray(p.multimedia?.fotos) ? p.multimedia.fotos.length : 0,
      videos: Array.isArray(p.multimedia?.videos) ? p.multimedia.videos.length : 0,
      audios: Array.isArray(p.multimedia?.audios) ? p.multimedia.audios.length : 0,
      gifs: Array.isArray(p.multimedia?.gifs) ? p.multimedia.gifs.length : 0,
    },
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

    const empresaId =
    typeof input === "object"
      ? Number(input?.empresaId || input?.empresa_id || 0) || null
      : null;

  const productoPrincipal =
    typeof input === "object"
      ? input?.productoPrincipal || null
      : null;

  const catalogoEmpresa = await obtenerCatalogoEmpresa(empresaId);

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
${JSON.stringify(prepararCatalogo(catalogoEmpresa), null, 2)}

PRODUCTO PRINCIPAL DE ESTE NUMERO DE WHATSAPP:
${productoPrincipal || "ninguno"}

REGLA DE PRODUCTO PRINCIPAL:
- Si el mensaje actual es ambiguo, corto o generico, por ejemplo: "precio", "info", "informacion", "me interesa", "cuanto", "hola", "quiero saber", asume que se refiere al PRODUCTO PRINCIPAL DE ESTE NUMERO DE WHATSAPP.
- Si el cliente menciona explicitamente otro producto, prioriza el producto mencionado en el MENSAJE ACTUAL.
- La memoria o una compra anterior NO deben reemplazar al producto principal cuando el mensaje actual es una consulta comercial nueva y ambigua.
- Usa la memoria e historial como contexto, pero no permitas que un producto antiguo domine una consulta nueva.

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

VENDEDOR MAESTRO - DECISION COMERCIAL:
- "fase_venta" describe el movimiento comercial que conviene ahora, no una etapa rigida del CRM.
- Usa "descubrimiento" cuando todavia necesitas entender producto, ciudad o necesidad.
- Usa "presentacion" cuando es un primer contacto y conviene mostrar visualmente el producto.
- Usa "demostracion" cuando una prueba visual de funcionamiento ayuda a avanzar.
- Usa "valor" cuando toca explicar equipamiento, oferta o diferencias reales.
- Usa "objecion" cuando estas resolviendo una duda que frena la compra.
- Usa "cierre" cuando el cliente ya muestra intencion suficiente para avanzar al pedido o pago.
- Usa "seguimiento" cuando existe postergacion comercial.
- En postventa usa "postventa".
- "apertura" es un mensaje MUY corto y natural que puede acompañar la primera pieza visual. Usa null cuando no haga falta.
- Si el producto esta identificado, el cliente pide informacion general o llega con un saludo/interes inicial, MEMORIA DEL CLIENTE.contexto.presentacion_enviada no es true y el catalogo tiene foto o video, puedes usar multimedia="presentacion".
- multimedia="presentacion" significa que el servidor puede enviar una foto y un video disponibles antes de la respuesta final.
- Nunca repitas multimedia="presentacion" si contexto.presentacion_enviada ya es true.
- No uses multimedia por rutina despues de la presentacion; elige foto o video solo cuando realmente ayude.
- "llamar_ahora" NO significa handoff y NO detiene al bot.
- Usa llamar_ahora=true cuando una llamada humana podria aumentar claramente la probabilidad de cierre: intencion explicita de comprar, pedido, pago, cliente que ya dio ciudad y avanza con envio, o varias senales comerciales fuertes juntas.
- Preguntar solamente precio o pedir informacion general NO basta para llamar_ahora=true.
- UNA UBICACION SOLA NO ES SENAL SUFICIENTE: si el cliente solamente responde su ciudad, distrito o provincia, llamar_ahora=false.
- No uses fase_venta="cierre" solo porque ya conoces la ciudad.
- Reserva fase_venta="cierre" para intencion concreta de comprar, pedir, separar, pagar o una combinacion clara de senales fuertes.
- Si llamar_ahora=false, motivo_llamada=null.
- Si llamar_ahora=true, motivo_llamada resume en una frase por que conviene llamar.

MEMORIA DE INFORMACION YA COMUNICADA:
- PRECIO YA COMUNICADO NO SE REPITE por rutina.
- Si MEMORIA DEL CLIENTE.contexto.precio_acordado tiene valor y el mensaje actual no pregunta precio ni negocia precio, evita volver a mencionarlo.
- Si la presentacion ya fue enviada, evita repetir las mismas caracteristicas salvo que el cliente las pregunte.
- Cada respuesta debe aportar una pieza nueva de informacion, resolver una duda o avanzar al siguiente paso.

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

  const mensajeActualNormalizado = String(mensaje || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim();

const consultaPostventaActual =
  /\b(mi pedido|mi compra|mi envio|mi guia|numero de guia|donde esta mi pedido|cuando llega mi pedido|cuanto debo|cuanto me falta pagar|saldo pendiente|adelanto que pague|ya pague)\b/.test(
    mensajeActualNormalizado
  );

const promptActivo =
  consultaPostventaActual
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