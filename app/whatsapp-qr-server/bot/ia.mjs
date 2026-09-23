import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { PROMPT_VENDEDOR, PROMPT_POSTVENTA } from "./prompt.mjs";
import { AnalisisVenta } from "./esquema.mjs";
import { obtenerCatalogoEmpresa } from "./catalogo.mjs";
import {
  obtenerPoliticasComerciales,
  obtenerDatosPagoPrivados,
  resolverTipoEnvioPorUbicacion,
} from "./politicas.mjs";

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

const ciudadMemoria =
  memoria?.contexto?.ciudad || null;

const normalizarTextoUbicacion = (valor = "") =>
  String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,;:/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const mensajeUbicacionNormalizado =
  normalizarTextoUbicacion(mensaje);

const envioDesdeMensaje =
  resolverTipoEnvioPorUbicacion(mensaje);

const envioDesdeMemoria =
  ciudadMemoria
    ? resolverTipoEnvioPorUbicacion(ciudadMemoria)
    : null;

const zonasLimaResueltas = new Set([
  "lima_motorizado",
  "lima_agencia",
  "lima_distrito_pendiente",
]);

const mensajeResuelveLima =
  envioDesdeMensaje &&
  zonasLimaResueltas.has(
    envioDesdeMensaje.zona
  );

const coincidenciaUbicacionDeclarada =
  mensajeUbicacionNormalizado.match(
    /\b(?:soy de|vivo en|estoy en|me encuentro en|me ubico en|provincia de|departamento de|distrito de|envio a|envios a|envialo a|enviala a|enviamelo a|enviamela a|mandalo a|mandala a|mejor a)\s+(.+)$/i
  );

const ubicacionDeclarada =
  coincidenciaUbicacionDeclarada?.[1]?.trim() || "";

const ubicacionesGenericas = new Set([
  "domicilio",
  "mi domicilio",
  "casa",
  "mi casa",
  "agencia",
  "shalom",
  "olva",
  "duda",
  "proceso",
  "camino",
  "trabajo",
  "oficina",
]);

const mensajeDeclaraNuevaUbicacion =
  Boolean(ubicacionDeclarada) &&
  !ubicacionesGenericas.has(
    ubicacionDeclarada
  );

const envioDesdeUbicacionDeclarada =
  mensajeDeclaraNuevaUbicacion
    ? resolverTipoEnvioPorUbicacion(
        ubicacionDeclarada
      )
    : null;

const ultimoHistorial =
  historial.length > 0
    ? historial[historial.length - 1]
    : null;

const ultimoMensajeBotNormalizado =
  ultimoHistorial?.rol === "bot"
    ? normalizarTextoUbicacion(
        ultimoHistorial.mensaje || ""
      )
    : "";

const botAcabaDePreguntarUbicacion =
  Boolean(ultimoMensajeBotNormalizado) &&
  /\b(desde que parte del peru|de que parte del peru|desde donde|de donde|de que ciudad|en que ciudad|que ciudad|de que distrito|en que distrito|que distrito|donde te encuentras|donde se encuentra|a que ciudad|a que distrito)\b/.test(
    ultimoMensajeBotNormalizado
  );

const respuestasSinUbicacion = new Set([
  "si",
  "no",
  "ya",
  "ok",
  "okay",
  "dale",
  "listo",
  "gracias",
  "bien",
  "perfecto",
  "correcto",
  "no se",
  "aun no se",
  "todavia no se",
  "aca",
  "aqui",
  "mi casa",
  "mi domicilio",
]);

const pareceConsultaNoUbicacion =
  /\b(precio|cuanto|costo|envio|envios|delivery|entrega|garantia|sirve|funciona|producto|pago|yape|plin|pedido|comprar|stock|foto|video)\b/.test(
    mensajeUbicacionNormalizado
  );

const palabrasRespuestaUbicacion =
  mensajeUbicacionNormalizado
    .split(" ")
    .filter(Boolean);

const respuestaAUbicacion =
  botAcabaDePreguntarUbicacion &&
  palabrasRespuestaUbicacion.length >= 1 &&
  palabrasRespuestaUbicacion.length <= 5 &&
  !respuestasSinUbicacion.has(
    mensajeUbicacionNormalizado
  ) &&
  !pareceConsultaNoUbicacion;

let envioResuelto = null;

// Si el cliente declara explicitamente una ubicacion,
// analizar primero SOLO la ubicacion extraida.
// Esto evita que frases como:
// "soy de san juna de lurigancho"
// se confundan con el distrito "lurigancho".
if (
  mensajeDeclaraNuevaUbicacion &&
  envioDesdeUbicacionDeclarada
) {
  envioResuelto = {
    fuente: "mensaje_actual_declarado",
    ubicacion_original: ubicacionDeclarada,
    ...envioDesdeUbicacionDeclarada,
  };
}

// Si no hubo una declaracion explicita,
// aceptar una zona de Lima reconocida directamente.
else if (mensajeResuelveLima) {
  envioResuelto = {
    fuente: "mensaje_actual",
    ubicacion_original: mensaje,
    ...envioDesdeMensaje,
  };
}

// Si el bot acaba de preguntar la ubicacion,
// una respuesta corta como Arequipa, Huaral,
// Barranca o Huancayo se interpreta como ubicacion.
else if (respuestaAUbicacion) {
  envioResuelto = {
    fuente: "respuesta_a_pregunta_ubicacion",
    ubicacion_original: mensaje,
    ...envioDesdeMensaje,
  };
}

// En los demás mensajes seguimos usando
// la ubicación ya conocida.
else if (envioDesdeMemoria) {
  envioResuelto = {
    fuente: "memoria_cliente",
    ubicacion_original: ciudadMemoria,
    ...envioDesdeMemoria,
  };
}

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

const datosPagoPrivados =
  obtenerDatosPagoPrivados();

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

DATOS PRIVADOS DE PAGO DISPONIBLES:
${JSON.stringify(datosPagoPrivados, null, 2)}

REGLA OBLIGATORIA SOBRE DATOS DE PAGO:
- Estos datos son los unicos numeros y cuentas que puedes proporcionar al cliente.
- Nunca inventes, completes ni modifiques un numero de cuenta, telefono o titular.
- Si el cliente pregunta "a que numero pago", "pasame el Yape", "donde deposito", "numero para pagar" o equivalente, responde DIRECTAMENTE con los datos reales disponibles.
- Si existe Yape, puedes dar el numero de Yape.
- Si existe Plin, puedes dar el numero de Plin.
- Si pide una cuenta bancaria especifica y existe, entrega solamente esa cuenta.
- Si el cliente no especifica metodo y existen varias opciones, ofrece brevemente las opciones reales disponibles.
- No respondas "un asesor te enviara el numero" si DATOS PRIVADOS DE PAGO DISPONIBLES contiene un dato util.
- No preguntes "¿Quieres que te facilite el dato?" cuando el cliente ya solicito el numero o cuenta. Entregalo inmediatamente.
- Despues de entregar los datos de pago, pide solamente que envie el comprobante cuando realice el adelanto.
- Nunca afirmes que un pago fue confirmado solo porque el cliente envio un comprobante.

ENVIO RESUELTO POR EL SISTEMA:
${envioResuelto
  ? JSON.stringify(envioResuelto, null, 2)
  : "sin resolver"}

REGLA OBLIGATORIA SOBRE ENVIO:
- ENVIO RESUELTO POR EL SISTEMA tiene prioridad sobre una politica generica de envio.
- Si zona="lima_motorizado", el envio corresponde a motorizado contraentrega. NO digas que requiere adelanto y NO cambies automaticamente a Shalom u Olva.
- Si zona="lima_agencia", corresponde envio por agencia y puedes aplicar el adelanto confirmado para agencia.
- Si zona="provincia", corresponde envio por agencia.
- Indica que trabajamos con las agencias devueltas por el sistema, por ejemplo Shalom u Olva Courier.
- Si requiereAdelanto=true, indica exactamente adelantoMinimo y que el saldo se paga cuando el producto se encuentre en agencia.
- NO cambies una zona="provincia" a motorizado contraentrega.
- Si zona="lima_distrito_pendiente", NO asumas provincia ni cobres adelanto. Pregunta el distrito de Lima.
- Si contraEntrega=true, puedes indicar que paga al recibir con motorizado.
- Si requiereAdelanto=false, NO solicites S/30.
- Nunca reemplaces una clasificacion concreta del sistema por la politica generica de Shalom u Olva.

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

DATOS DEL CLIENTE PARA EL CIERRE:
- En "dni" devuelve SOLO un DNI que el cliente haya escrito explicitamente. Para DNI peruano acepta exactamente 8 digitos. Si no lo dio, devuelve null.
- No confundas telefono, precio, codigo de pedido u otro numero con DNI.
- En "nombre" devuelve el nombre y apellidos que el cliente haya escrito explicitamente como sus datos personales. Si no los dio, devuelve null.
- Nunca inventes, completes ni deduzcas DNI o nombre.
- Si MEMORIA DEL CLIENTE.contexto ya contiene dni o nombre, no vuelvas a pedir ese dato.
- Cuando el cliente ya esta avanzando con la compra o confirmacion de envio y faltan nombre y DNI, pide PRIMERO nombres y apellidos completos. En el siguiente turno pide SOLO el DNI. Nunca pidas ambos datos juntos.
- Si ya tienes DNI pero falta nombre, pide solo nombres y apellidos completos.
- Si ya tienes nombre pero falta DNI, pide solo el DNI.
- Si el cliente envia DNI y nombre juntos en cualquier formato, extrae ambos y continua desde el siguiente paso sin volver a preguntarlos.
- PRIORIDAD DE REGISTRO: si en el MENSAJE ACTUAL el cliente entrega explicitamente su DNI o su nombre completo como dato personal, considera que inicio el registro del pedido. Antes de preguntar por uso, necesidad u otro dato comercial, completa el dato personal faltante.

ORDEN OBLIGATORIO DEL CIERRE DEL PEDIDO:

- No conviertas la conversacion en un formulario. Avanza solamente UN paso concreto por turno.
- Si el cliente solo indica su ubicacion, eso por si solo NO significa que ya inicio un pedido.

- Cuando el cliente ya demuestra intencion de comprar o esta avanzando con el pedido y ENVIO RESUELTO POR EL SISTEMA tiene zona="provincia" o zona="lima_agencia":
  1. Antes de pedir nombre o DNI, asegurate de que el cliente conozca la modalidad de envio, las agencias disponibles y el adelanto requerido.
  2. Si todavia no eligio agencia, pregunta solamente si prefiere Shalom u Olva Courier.
  3. Cuando la agencia ya este elegida, pide nombres y apellidos completos si faltan.
  4. Cuando ya tengas el nombre, pide solamente el DNI si falta.
  5. Si para completar el envio todavia falta precisar distrito o localidad, preguntalo despues.
  6. Cuando ya tengas los datos necesarios, avanza directamente al adelanto.

- Para zona="lima_motorizado", NO preguntes Shalom, Olva ni adelanto. Respeta la contraentrega y continua con los datos necesarios para registrar el pedido.

- Si el cliente ya entrego nombre, DNI, agencia o distrito como parte del registro, NO vuelvas a preguntar:
  "¿Quieres que continúe con el pedido?"
  "¿Deseas continuar con el pedido?"
  "¿Quieres que te ayude con el pedido?"
  "¿Quieres que te explique cómo continuar?"

- Una vez iniciado el registro, asume que la conversacion continua hasta completar el siguiente dato faltante, salvo que el cliente indique que ya no desea comprar.

- Cuando ya tengas nombre, DNI, ubicacion suficientemente precisa y agencia elegida para un envio que requiere adelanto, el siguiente paso debe ser concreto, por ejemplo:
  "Para confirmar el pedido corresponde el adelanto de S/30. ¿Te paso los datos de pago?"

- No vuelvas a explicar todas las condiciones de envio si ya fueron explicadas y el cliente no las esta preguntando nuevamente.

- Si el mensaje actual trae nombre y falta DNI tanto en el mensaje como en MEMORIA DEL CLIENTE.contexto, pregunta SOLO el DNI.
- Si el mensaje actual trae DNI y falta nombre tanto en el mensaje como en MEMORIA DEL CLIENTE.contexto, pregunta SOLO nombres y apellidos completos.
- Esta prioridad aplica aunque la fase anterior fuera descubrimiento.
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
- ARRANQUE COMERCIAL FACEBOOK ADS: si el mensaje actual es Info, Informacion, Precio, Me interesa, Cuanto cuesta o una consulta general equivalente y contexto.presentacion_enviada no es true, tratalo como primer contacto comercial.
- Identifica primero el producto real del catalogo y usa el producto principal del canal cuando corresponda.
- Si el producto tiene multimedia, usa preferentemente multimedia="presentacion" y fase_venta="presentacion".
- Cuando uses multimedia="presentacion", apertura debe ser una PRESENTACION COMERCIAL ESTILO CLOSER para acompanar la primera imagen o portada.
- La apertura debe usar saltos de linea y una estructura comercial clara:
  1) nombre real del producto resaltado;
  2) materiales, usos o compatibilidades reales registrados en el catalogo, si existen;
  3) beneficios reales importantes registrados en el catalogo;
  4) precio unitario real;
  5) promocion real si existe.
- Puedes usar emojis comerciales como 🟡 ⚙️ ✅ 💰 💥 ❗ para hacer la presentacion mas visual, sin exagerar.
- Usa *negritas* de WhatsApp con un solo asterisco a cada lado para resaltar principalmente nombre, precio y promocion. Nunca uses **doble asterisco**.
- Si existen varios usos o materiales reales en el catalogo, puedes agruparlos en una linea comercial como "Se trabaja en:" sin inventar ninguno.
- Si existe promocion activa en el catalogo, incluyela obligatoriamente en la apertura usando el precio exacto registrado.
- No inventes materiales, usos, beneficios, descuentos, promociones, regalos, stock, medidas ni caracteristicas. Todo debe salir del catalogo real.
- Cuando uses multimedia="presentacion", respuesta debe contener SOLO la pregunta final: "¿Desde qué parte del Perú se comunica?".
- No repitas en respuesta el precio, beneficios, promocion ni informacion ya incluida en apertura.
- No preguntes por uso, presupuesto ni otra necesidad en ese primer turno.
- Si no existe multimedia disponible, usa apertura=null y coloca la presentacion comercial en respuesta, terminando con una sola pregunta: "¿Desde qué parte del Perú se comunica?".
- La multimedia hace parte de la demostracion: primera imagen es portada y las siguientes son material adicional.

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
    model: "gpt-4.1-mini",
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