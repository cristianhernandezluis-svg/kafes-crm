import { consultarIA } from "./ia.mjs";
import {
  buscarProducto,
  buscarProductoPorSlug,
} from "./catalogo.mjs";
import {
  obtenerDatosPagoPrivados,
  resolverTipoEnvioPorUbicacion,
} from "./politicas.mjs";

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizarTelefonoResumen(telefono) {
  const limpio = String(telefono || "")
    .replace(/\D/g, "");

  // WhatsApp normalmente entrega Peru como 51 + 9 digitos.
  if (/^51\d{9}$/.test(limpio)) {
    return limpio.slice(2);
  }

  return limpio || null;
}

function detectarMetodoPago(texto) {
  const t = normalizar(texto);

  if (/\byape\b/.test(t)) return "yape";
  if (/\bplin\b/.test(t)) return "plin";
  if (/\bbcp\b/.test(t)) return "bcp";
  if (/\binterbank\b/.test(t)) return "interbank";
  if (/\bbbva\b/.test(t)) return "bbva";

  if (
    /\bbanco de la nacion\b/.test(t) ||
    /\bbanco nacion\b/.test(t)
  ) {
    return "bancoNacion";
  }

  return null;
}

function construirDatosPago(texto) {
  const metodo = detectarMetodoPago(texto);

  if (!metodo) {
    return null;
  }

  const t = normalizar(texto);

  const solicitaDatos =
    /\bpasame\b/.test(t) ||
    /\bmandame\b/.test(t) ||
    /\bdame\b/.test(t) ||
    /\benviame\b/.test(t) ||
    /\bnumero\b/.test(t) ||
    /\bcuenta\b/.test(t) ||
    /\bdatos\b/.test(t) ||
    /\bquiero pagar\b/.test(t) ||
    /\bvoy a pagar\b/.test(t) ||
    /\bpago por\b/.test(t) ||
    /\bpagar por\b/.test(t) ||
    /\bcomo pago\b/.test(t) ||
    /\bdepositar\b/.test(t) ||
    /\btransferir\b/.test(t) ||
    /\bseparar\b/.test(t) ||
    /\badelantar\b/.test(t);

  if (!solicitaDatos) {
    return null;
  }

  const datos = obtenerDatosPagoPrivados();
  const valor = datos[metodo];

  if (!valor) {
    return null;
  }

  const nombres = {
    yape: "Yape",
    plin: "Plin",
    bcp: "BCP",
    interbank: "Interbank",
    bbva: "BBVA",
    bancoNacion: "Banco de la Nacion",
  };

  const titular = datos.titular
    ? `\nTitular: ${datos.titular}`
    : "";

  return `${nombres[metodo]}: ${valor}${titular}`;
}

function detectarAgenciaPedido(texto) {
  const original = String(texto || "");

  const t = normalizar(original)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tieneShalom =
    /\bshalom\b/.test(t);

  const tieneOlva =
    /\bolva(?: courier)?\b/.test(t);

  if (!tieneShalom && !tieneOlva) {
    return null;
  }

  /*
   * Si menciona ambas agencias, esta comparando,
   * citando o haciendo una pregunta; no es una eleccion.
   */
  if (tieneShalom && tieneOlva) {
    return null;
  }

  /*
   * Preguntas o referencias a algo que dijo el bot
   * tampoco deben convertirse en una seleccion.
   */
  const referenciaOAclaracion =
    /[?¿]/.test(original) ||
    /\b(?:por que|porque|me dijiste|me dices|dijiste|dices|preguntaste|pregunta|que diferencia|diferencia entre)\b/.test(t);

  if (referenciaOAclaracion) {
    return null;
  }

  if (tieneShalom) {
    return "SHALOM";
  }

  if (tieneOlva) {
    return "OLVA COURIER";
  }

  return null;
}

function detectarCantidadPedido(texto) {
  const t = normalizar(texto);

  const numero = t.match(
    /\b([1-9]|[1-9]\d)\b/
  );

  if (numero) {
    return Number(numero[1]);
  }

  const cantidades = [
    ["uno", 1],
    ["una", 1],
    ["un", 1],
    ["dos", 2],
    ["tres", 3],
    ["cuatro", 4],
    ["cinco", 5],
  ];

  for (const [palabra, cantidad] of cantidades) {
    if (
      new RegExp(
        `\\b${palabra}\\b`,
        "i"
      ).test(t)
    ) {
      return cantidad;
    }
  }

  return null;
}

function detectarCantidadExplicita(texto) {
  const t = normalizar(texto)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cantidades = new Map([
    ["uno", 1],
    ["una", 1],
    ["un", 1],
    ["dos", 2],
    ["tres", 3],
    ["cuatro", 4],
    ["cinco", 5],
  ]);

  if (/^([1-9]|[1-9]\d)$/.test(t)) {
    return Number(t);
  }

  if (cantidades.has(t)) {
    return cantidades.get(t);
  }

  const conUnidad = t.match(
    /\b([1-9]|[1-9]\d)\s*(?:unidad|unidades|und|uds)\b/
  );

  if (conUnidad) {
    return Number(conUnidad[1]);
  }

  const compraNumero = t.match(
    /\b(?:quiero|deseo|necesito|quisiera|llevo|me llevo)\s+(?:comprar\s+|llevar\s+)?([1-9]|[1-9]\d)\b/
  );

  if (compraNumero) {
    return Number(compraNumero[1]);
  }

  const compraPalabra = t.match(
    /\b(?:quiero|deseo|necesito|quisiera|llevo|me llevo)\s+(?:comprar\s+|llevar\s+)?(uno|una|un|dos|tres|cuatro|cinco)\b/
  );

  if (compraPalabra) {
    return cantidades.get(compraPalabra[1]) || null;
  }

  return null;
}

function detectarSedePedidoEnMensaje(
  texto,
  agencia
) {
  if (!agencia) return null;

  const lineas = String(texto || "")
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  if (lineas.length < 2) {
    return null;
  }

  const indiceAgencia =
    lineas.findIndex(
      (linea) =>
        detectarAgenciaPedido(linea) ===
        agencia
    );

  if (indiceAgencia < 0) {
    return null;
  }

  for (
    let i = indiceAgencia + 1;
    i < lineas.length;
    i += 1
  ) {
    const candidato = lineas[i];

    if (detectarAgenciaPedido(candidato)) continue;
    if (dniValido(candidato)) continue;
    if (detectarCantidadExplicita(candidato)) continue;

    if (
      /^(?:si|ok|okay|listo|dale|correcto)$/i.test(
        normalizar(candidato)
      )
    ) {
      continue;
    }

    return candidato;
  }

  return null;
}

function dniValido(dni) {
  const limpio = String(dni || "")
    .replace(/\D/g, "");

  return /^\d{8}$/.test(limpio);
}

function limpiarDni(dni) {
  return String(dni || "")
    .replace(/\D/g, "");
}

function nombreCompletoValido(nombre) {
  const partes = String(nombre || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return partes.length >= 2;
}

function esConfirmacionResumen(texto) {
  const t = normalizar(texto)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /^(?:si|correcto|esta bien|todo bien|todo correcto|todo ok|ok|okay|confirmo|confirmado|ya esta|si esta bien|si todo bien|si todo ok|si correcto|si todo correcto|dale|listo|de acuerdo)$/.test(
    t
  );
}

function quitarPreguntaFinal(texto) {
  const valor = String(texto || "").trim();

  const indicePregunta =
    valor.lastIndexOf("Â¿");

  if (
    indicePregunta >= 0 &&
    valor
      .slice(indicePregunta)
      .includes("?")
  ) {
    return valor
      .slice(0, indicePregunta)
      .trim();
  }

  return valor;
}

function obtenerDatoPagoPrincipal() {
  const datos =
    obtenerDatosPagoPrivados();

  const opciones = [
    ["yape", "Yape"],
    ["plin", "Plin"],
    ["bcp", "BCP"],
    ["interbank", "Interbank"],
    ["bbva", "BBVA"],
    [
      "bancoNacion",
      "Banco de la Nacion",
    ],
  ];

  for (const [clave, nombre] of opciones) {
    const valor = datos?.[clave];

    if (!valor) continue;

    const titular = datos?.titular
      ? `\nTitular: ${datos.titular}`
      : "";

    return `${nombre}: ${valor}${titular}`;
  }

  return null;
}

function obtenerPromocionAplicable(
  producto,
  cantidadPedido
) {
  if (!Array.isArray(producto?.promociones)) {
    return null;
  }

  const cantidad = Number(cantidadPedido);

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return null;
  }

  for (const promocion of producto.promociones) {
    if (!promocion || typeof promocion !== "object") continue;

    const cantidadPromo = Number(promocion.cantidad);
    const precioPromo = Number(promocion.precio);

    if (
      Number.isFinite(cantidadPromo) &&
      cantidadPromo === cantidad &&
      Number.isFinite(precioPromo) &&
      precioPromo > 0
    ) {
      return {
        cantidad: cantidadPromo,
        precio: precioPromo,
      };
    }
  }

  return null;
}

function obtenerPromocionProducto(
  producto,
  cantidadPedido
) {
  const promocionAplicable =
    obtenerPromocionAplicable(
      producto,
      cantidadPedido
    );

  if (promocionAplicable) {
    return `PROMO: ${promocionAplicable.cantidad} por S/${promocionAplicable.precio.toFixed(2)}`;
  }

  return null;
}

function calcularTotalPedido({
  contexto,
  producto,
  cantidad,
}) {
  const promocionAplicable =
    obtenerPromocionAplicable(
      producto,
      cantidad
    );

  if (promocionAplicable) {
    return promocionAplicable.precio;
  }

  const precioUnitario = Number(producto?.precio);

  if (
    Number.isFinite(precioUnitario) &&
    precioUnitario > 0
  ) {
    return precioUnitario * cantidad;
  }

  const precioAcordado =
    Number(contexto?.precio_acordado);

  if (
    Number.isFinite(precioAcordado) &&
    precioAcordado > 0
  ) {
    return precioAcordado;
  }

  return null;
}

function construirResumenPedido({
  contexto,
  producto,
  requiereAdelanto,
}) {
  const cantidad = Number(contexto?.cantidad || 1);

  const total =
    calcularTotalPedido({
      contexto,
      producto,
      cantidad,
    });

  const promocion =
    obtenerPromocionProducto(
      producto,
      cantidad
    );

  const lineas = [];

  lineas.push(`NOMBRE: ${contexto.nombre}`);
  lineas.push(`D.N.I.: ${contexto.dni}`);

  if (contexto.telefono) {
    lineas.push(`CEL: ${contexto.telefono}`);
  }

  lineas.push(`CIUDAD: ${contexto.ciudad}`);

  if (contexto.agencia) {
    lineas.push("");
    lineas.push("EMPRESA DE ENVIO:");

    const destino =
      contexto.sede_envio
        ? ` - ${contexto.sede_envio}`
        : "";

    lineas.push(`${contexto.agencia}${destino}`);
  }

  lineas.push("");
  lineas.push("PEDIDO:");
  lineas.push(
    `${String(cantidad).padStart(2, "0")} ${producto?.nombre || "PRODUCTO"}`
  );

  if (promocion) {
    lineas.push(promocion);
  }

  if (
    Number.isFinite(total) &&
    total > 0
  ) {
    lineas.push("");
    lineas.push(`TOTAL: S/${total.toFixed(2)}`);
  }

  if (requiereAdelanto) {
    lineas.push("ADELANTO PARA CONFIRMAR: S/30.00");
  }

  lineas.push("");
  lineas.push(
    "Por favor, corrobora que todos tus datos esten correctos. Â¿Todo esta bien?"
  );

  return lineas.join("\n");
}

async function respuestaRespaldo(texto, memoria = {}, empresaId = null) {
  const t = normalizar(texto);

  if (memoria.paso === "postventa") {
    return {
      tipo: "respaldo_postventa",
      producto: memoria.producto || null,
      accion: "handoff_closer",
      mensaje: "Voy a pedir que un asesor revise el estado exacto de tu pedido para darte informacion confirmada.",
      multimedia: "ninguno",
      handoff: true,
      memoria: {
        producto: memoria.producto || null,
        paso: "postventa",
        contexto: memoria.contexto || {},
      },
    };
  }

  const producto =
    (await buscarProducto(texto, empresaId)) ||
    (await buscarProductoPorSlug(memoria.producto, empresaId));

  if (producto) {
    if (/\b(precio|cuanto|costo|vale)\b/.test(t)) {
      return {
        tipo: "respaldo_precio",
        producto: producto.slug,
        mensaje: `${producto.nombre} estÃ¡ a S/${producto.precio}. Si quieres, te muestro cÃ³mo viene y quÃ© incluye.`,
        memoria: {
          producto: producto.slug,
          paso: memoria.paso || "conversacion",
          contexto: memoria.contexto || {},
        },
      };
    }

    return {
      tipo: "respaldo_producto",
      producto: producto.slug,
      mensaje: `Claro ðŸ‘‹ Te cuento sobre ${producto.nombre}. EstÃ¡ a S/${producto.precio}.`,
      memoria: {
        producto: producto.slug,
        paso: memoria.paso || "conversacion",
        contexto: memoria.contexto || {},
      },
    };
  }

  return {
    tipo: "respaldo_general",
    mensaje:
      "Claro ðŸ‘‹ Dime quÃ© producto viste y te paso la informaciÃ³n.",
    memoria: {
      producto: memoria.producto || null,
      paso: memoria.paso || "conversacion",
      contexto: memoria.contexto || {},
    },
  };
}

export async function decidirRespuestaBot({
  texto,
  textoAccion,
  calificacion,
  memoria = {},
  historial = [],
  empresaId = null,
  productoPrincipal = null,
  telefono = null,
}) {

  if (!texto || !texto.trim()) {
    return null;
  }

  try {
    const textoNormalizado = String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    const consultaGenericaProducto =
      /^(precio|info|informacion|me interesa|hola|quiero saber|cuanto|cuanto cuesta|cuanto cuestan)$/.test(textoNormalizado);

    const memoriaParaIA =
      consultaGenericaProducto && productoPrincipal
        ? {
            ...memoria,
            producto: productoPrincipal,
            paso: 'conversacion',
          }
        : memoria;

    console.log('DEBUG PRODUCTO PRINCIPAL:', { texto, productoPrincipal, consultaGenericaProducto, memoriaProducto: memoria?.producto, memoriaParaIAProducto: memoriaParaIA?.producto, memoriaPaso: memoria?.paso, memoriaParaIAPaso: memoriaParaIA?.paso });

    const analisis = await consultarIA({
      mensaje: texto,
      memoria: memoriaParaIA,
      historial,
      empresaId,
      productoPrincipal,
    });

    if (!analisis) {
      return await respuestaRespaldo(texto, memoria, empresaId);
    }

    const contexto = {
      ...(memoria.contexto || {}),
    };

const telefonoResumen =
  normalizarTelefonoResumen(telefono);

if (telefonoResumen) {
  contexto.telefono = telefonoResumen;
}

    if (analisis.uso) {
      contexto.uso = analisis.uso;
    }

    if (analisis.ciudad) {
      contexto.ciudad = analisis.ciudad;
    }

    if (
  analisis.dni &&
  dniValido(analisis.dni)
) {
  contexto.dni =
    limpiarDni(analisis.dni);
}

if (
  analisis.nombre &&
  nombreCompletoValido(
    analisis.nombre
  )
) {
  contexto.nombre =
    analisis.nombre.trim();
}

    const senalesCalificacion = Array.isArray(calificacion?.senales)
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

    const producto =
      analisis.producto ||
      memoria.producto ||
      null;

    const productoAnterior = memoria.producto || null;

    if (
      producto &&
      productoAnterior &&
      producto !== productoAnterior
    ) {
      delete contexto.precio_acordado;
    }

    const precioAcordado = Number(analisis.precio_acordado);

    if (
      analisis.precio_acordado !== null &&
      Number.isFinite(precioAcordado) &&
      precioAcordado > 0
    ) {
      contexto.precio_acordado = precioAcordado;
    }

    const handoff =
  analisis.accion === "handoff_closer";

const productoDetalle = producto
  ? await buscarProductoPorSlug(
      producto,
      empresaId
    )
  : null;

const envioPedido = contexto.ciudad
  ? resolverTipoEnvioPorUbicacion(
      contexto.ciudad
    )
  : null;

const envioPorAgencia =
  envioPedido?.zona === "provincia" ||
  envioPedido?.zona === "lima_agencia";

let pasoFinal =
  memoria.paso === "postventa"
    ? "postventa"
    : memoria.paso || "conversacion";

let mensajeControlado = null;

const textoRechazo =
  textoNormalizado
    .replace(/[.,!?¿¡;:]+/g, " ")
    .replace(/\\s+/g, " ")
    .trim();

const rechazoDefinitivo =
  /^(?:no quiero|no quiero nada|ya no quiero|no me interesa|ya no me interesa|no estoy interesado|no estoy interesada|no me escribas|no me escriban|ya compre en otro lado|ya compre otro|ya lo compre en otro lado|no gracias|dejalo nomas|dejalo no mas)(?: gracias| por favor)?$/.test(
    textoRechazo
  );

if (rechazoDefinitivo) {
  /*
   * Cancelar solamente el intento de pedido actual.
   * Conservamos identidad y ciudad del cliente, pero
   * eliminamos los datos transitorios del cierre.
   */
  delete contexto.agencia;
  delete contexto.cantidad;
  delete contexto.sede_envio;
  delete contexto.resumen_confirmado;
  delete contexto.precio_acordado;

  pasoFinal = "conversacion";

  mensajeControlado =
    analisis.respuesta ||
    "Entiendo. Si mas adelante necesitas algo, escribeme por aqui.";
}


const agenciaDetectadaGlobal =
  rechazoDefinitivo
    ? null
    : detectarAgenciaPedido(texto);

if (agenciaDetectadaGlobal) {
  contexto.agencia =
    agenciaDetectadaGlobal;
}

const cantidadExplicitaGlobal =
  detectarCantidadExplicita(texto);

if (
  cantidadExplicitaGlobal &&
  cantidadExplicitaGlobal > 0
) {
  contexto.cantidad =
    cantidadExplicitaGlobal;
}

const sedeDetectadaGlobal =
  detectarSedePedidoEnMensaje(
    texto,
    contexto.agencia
  );

if (
  sedeDetectadaGlobal &&
  !contexto.sede_envio
) {
  contexto.sede_envio =
    sedeDetectadaGlobal;
}

const intencionCompraExplicita =
  /\b(?:quiero|deseo|necesito|quisiera)\s+(?:comprar\s+|pedir\s+|llevar\s+)?(?:uno|una|un|dos|tres|cuatro|cinco|[1-9]\d?)\b/.test(
    textoNormalizado
  ) ||
  /\b(?:quiero comprar|quiero pedir|quiero llevar|me lo llevo|me la llevo|quiero hacer el pedido|hago el pedido|como compro)\b/.test(
    textoNormalizado
  );

if (
  pasoFinal === "esperando_ciudad" &&
  contexto.ciudad
) {
  pasoFinal = "conversacion";
}

if (
  !mensajeControlado &&
  pasoFinal !== "postventa" &&
  producto &&
  !contexto.ciudad &&
  (
    pasoFinal === "esperando_ciudad" ||
    intencionCompraExplicita
  )
) {
  pasoFinal = "esperando_ciudad";
  mensajeControlado =
    "Perfecto. Â¿Desde que ciudad o distrito del Peru nos escribes?";
}


/*
 * =========================================================
 * CIERRE DETERMINISTICO PARA ENVIOS POR AGENCIA
 * =========================================================
 *
 * OpenAI puede responder dudas, pero el sistema decide
 * cual es el siguiente dato que falta para cerrar el pedido.
 */

if (
  !mensajeControlado &&
  pasoFinal !== "postventa" &&
  envioPorAgencia &&
  producto
) {
  if (
    pasoFinal === "esperando_sede_envio" &&
    !contexto.sede_envio
  ) {
    const sedeDirecta =
      String(texto || "").trim();

    const parecePreguntaSede =
      /[?Â¿]/.test(sedeDirecta);

    if (
      sedeDirecta &&
      !parecePreguntaSede &&
      sedeDirecta.length <= 120 &&
      !detectarAgenciaPedido(sedeDirecta)
    ) {
      contexto.sede_envio =
        sedeDirecta;
    }
  }

  const puedeAvanzarPorDatos =
    contexto.agencia &&
    pasoFinal !==
      "esperando_confirmacion_resumen" &&
    pasoFinal !== "esperando_pago" &&
    (
      pasoFinal !== "conversacion" ||
      agenciaDetectadaGlobal ||
      intencionCompraExplicita
    );

  if (puedeAvanzarPorDatos) {
    const parecePregunta =
      /[?Â¿]/.test(String(texto || ""));

    const respuestaDuda =
      parecePregunta
        ? quitarPreguntaFinal(
            analisis.respuesta
          )
        : "";

    const conRespuestaDuda =
      (pregunta) =>
        respuestaDuda
          ? `${respuestaDuda}\n\n${pregunta}`.trim()
          : pregunta;

    if (
      !nombreCompletoValido(
        contexto.nombre
      )
    ) {
      pasoFinal = "esperando_nombre";
      mensajeControlado =
        conRespuestaDuda(
          "Perfecto, envia tus nombres y apellidos completos para registrar el pedido."
        );
    } else if (
      !dniValido(contexto.dni)
    ) {
      pasoFinal = "esperando_dni";
      mensajeControlado =
        conRespuestaDuda(
          `Perfecto ${contexto.nombre}. Ahora enviame solamente tu DNI de 8 digitos.`
        );
    } else if (
      !contexto.cantidad ||
      Number(contexto.cantidad) <= 0
    ) {
      pasoFinal = "esperando_cantidad";
      mensajeControlado =
        conRespuestaDuda(
          "Â¿Cuantas unidades deseas?"
        );
    } else if (
      !contexto.sede_envio
    ) {
      pasoFinal = "esperando_sede_envio";
      mensajeControlado =
        conRespuestaDuda(
          `Perfecto. Â¿A que sede o localidad de ${contexto.agencia} deseas que llegue tu pedido?`
        );
    } else {
      contexto.resumen_confirmado = false;
      pasoFinal = "esperando_confirmacion_resumen";
      mensajeControlado =
        construirResumenPedido({
          contexto,
          producto: productoDetalle,
          requiereAdelanto:
            envioPedido?.requiereAdelanto === true,
        });
    }
  }

  /*
   * Si ya estabamos esperando agencia,
   * intentar detectar Shalom u Olva.
   */
  else if (
    pasoFinal === "esperando_agencia"
  ) {
    const agencia =
      detectarAgenciaPedido(texto);

    if (agencia) {
      contexto.agencia = agencia;

      /*
       * Si el cliente aprovecho y envio nombre/DNI
       * junto con la agencia, conservarlos.
       */
      if (
        analisis.nombre &&
        nombreCompletoValido(
          analisis.nombre
        )
      ) {
        contexto.nombre =
          analisis.nombre.trim();
      }

      if (
        analisis.dni &&
        dniValido(analisis.dni)
      ) {
        contexto.dni =
          limpiarDni(analisis.dni);
      }

      if (
        !nombreCompletoValido(
          contexto.nombre
        )
      ) {
        pasoFinal =
          "esperando_nombre";

        mensajeControlado =
          `Perfecto, envia tus nombres y apellidos completos para registrar el pedido.`;
      } else if (
        !dniValido(contexto.dni)
      ) {
        pasoFinal =
          "esperando_dni";

        mensajeControlado =
          `Perfecto ${contexto.nombre}. Ahora enviame solamente tu DNI de 8 digitos.`;
      } else {
        pasoFinal =
          "esperando_cantidad";

        mensajeControlado =
          "Â¿Cuantas unidades deseas?";
      }
    } else {
      /*
       * Si hizo una pregunta en vez de elegir agencia,
       * OpenAI responde la duda pero retomamos agencia.
       */
      const respuestaDuda =
        quitarPreguntaFinal(
          analisis.respuesta
        );

      pasoFinal =
        "esperando_agencia";

      mensajeControlado =
        `${respuestaDuda}\n\nÂ¿Prefieres Shalom u Olva Courier?`.trim();
    }
  }

  /*
   * NOMBRE COMPLETO
   */
  else if (
    pasoFinal === "esperando_nombre"
  ) {
    if (
      analisis.nombre &&
      nombreCompletoValido(
        analisis.nombre
      )
    ) {
      contexto.nombre =
        analisis.nombre.trim();

      if (
        analisis.dni &&
        dniValido(analisis.dni)
      ) {
        contexto.dni =
          limpiarDni(analisis.dni);
      }

      if (
        !dniValido(contexto.dni)
      ) {
        pasoFinal =
          "esperando_dni";

        mensajeControlado =
          `Gracias ${contexto.nombre}. Ahora enviame solamente tu DNI de 8 digitos.`;
      } else {
        pasoFinal =
          "esperando_cantidad";

        mensajeControlado =
          "Â¿Cuantas unidades deseas?";
      }
    } else {
      pasoFinal =
        "esperando_nombre";

      mensajeControlado =
        "Para registrar el pedido necesito tus nombres y apellidos completos.";
    }
  }

  /*
   * DNI
   */
  else if (
    pasoFinal === "esperando_dni"
  ) {
    const dniRecibido =
      analisis.dni
        ? limpiarDni(analisis.dni)
        : String(texto || "")
            .replace(/\D/g, "");

    if (dniValido(dniRecibido)) {
      contexto.dni = dniRecibido;

      pasoFinal =
        "esperando_cantidad";

      mensajeControlado =
        "Â¿Cuantas unidades deseas?";
    } else {
      pasoFinal =
        "esperando_dni";

      mensajeControlado =
        "El DNI debe tener 8 digitos. Enviame solamente el DNI correcto.";
    }
  }

  /*
   * CANTIDAD
   */
  else if (
    pasoFinal === "esperando_cantidad"
  ) {
    const cantidad =
      detectarCantidadPedido(texto);

    if (
      cantidad &&
      cantidad > 0
    ) {
      contexto.cantidad = cantidad;

      pasoFinal =
        "esperando_sede_envio";

      mensajeControlado =
        `Perfecto. Â¿A que sede o localidad de ${contexto.agencia} deseas que llegue tu pedido?`;
    } else {
      pasoFinal =
        "esperando_cantidad";

      mensajeControlado =
        "Â¿Cuantas unidades deseas?";
    }
  }

  /*
   * SEDE / LOCALIDAD DE LA AGENCIA
   */
  else if (
    pasoFinal ===
    "esperando_sede_envio"
  ) {
    const sede = String(
      texto || ""
    ).trim();

    const parecePregunta =
      /[?Â¿]/.test(sede);

    if (
      sede &&
      !parecePregunta &&
      sede.length <= 120
    ) {
      contexto.sede_envio = sede;

      contexto.resumen_confirmado =
        false;

      pasoFinal =
        "esperando_confirmacion_resumen";

      mensajeControlado =
        construirResumenPedido({
          contexto,
          producto:
            productoDetalle,
          requiereAdelanto:
            envioPedido
              ?.requiereAdelanto ===
            true,
        });
    } else {
      const respuestaDuda =
        quitarPreguntaFinal(
          analisis.respuesta
        );

      pasoFinal =
        "esperando_sede_envio";

      mensajeControlado =
        `${respuestaDuda}\n\nÂ¿A que sede o localidad de ${contexto.agencia} deseas que llegue tu pedido?`.trim();
    }
  }

  /*
   * CONFIRMACION DEL RESUMEN
   */
  else if (
    pasoFinal ===
    "esperando_confirmacion_resumen"
  ) {
    /*
     * Permitir correcciones simples antes
     * de confirmar.
     */
    const agenciaCorregida =
      detectarAgenciaPedido(texto);

    if (agenciaCorregida) {
      contexto.agencia =
        agenciaCorregida;
    }

    if (
      analisis.nombre &&
      nombreCompletoValido(
        analisis.nombre
      )
    ) {
      contexto.nombre =
        analisis.nombre.trim();
    }

    if (
      analisis.dni &&
      dniValido(analisis.dni)
    ) {
      contexto.dni =
        limpiarDni(analisis.dni);
    }

    const correccionCantidad =
      /\b(cantidad|unidad|unidades)\b/i.test(
        texto
      )
        ? detectarCantidadPedido(
            texto
          )
        : null;

    if (correccionCantidad) {
      contexto.cantidad =
        correccionCantidad;
    }

    if (
      esConfirmacionResumen(texto)
    ) {
      contexto.resumen_confirmado =
        true;

      pasoFinal =
        "esperando_pago";

      const datoPago =
        obtenerDatoPagoPrincipal();

      mensajeControlado = datoPago
        ? `Perfecto, tus datos estan confirmados.\n\nPara confirmar el pedido realiza el adelanto de S/30:\n\n${datoPago}\n\nCuando realices el pago, enviame el comprobante por aqui.`
        : `Perfecto, tus datos estan confirmados. Para confirmar el pedido corresponde el adelanto de S/30. En este momento no tengo un dato de pago disponible para mostrarte.`;
    } else {
      /*
       * Si detectamos que corrigio algun dato,
       * volver a enseÃ±ar el resumen actualizado.
       */
      const hizoCorreccion =
        Boolean(
          agenciaCorregida ||
          analisis.nombre ||
          analisis.dni ||
          correccionCantidad
        );

      if (hizoCorreccion) {
        contexto.resumen_confirmado =
          false;

        pasoFinal =
          "esperando_confirmacion_resumen";

        mensajeControlado =
          construirResumenPedido({
            contexto,
            producto:
              productoDetalle,
            requiereAdelanto:
              envioPedido
                ?.requiereAdelanto ===
              true,
          });
      } else {
        pasoFinal =
          "esperando_confirmacion_resumen";

        mensajeControlado =
          "Necesito que confirmes si los datos del resumen estan correctos. Puedes responder: si, o indicarme el dato que deseas corregir.";
      }
    }
  }

  /*
   * YA CONFIRMO EL RESUMEN.
   * Si vuelve a solicitar el numero de pago,
   * entregarlo directamente.
   */
  else if (
    pasoFinal === "esperando_pago"
  ) {
    const tPago =
      normalizar(texto)
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();

    const reportaPago =
      /\b(?:ya pague|ya hice el pago|ya transferi|ya deposite|pago realizado|ya esta pagado)\b/.test(
        tPago
      );

    const confirmacionCorta =
      /^(?:ok|okay|listo|dale|perfecto|gracias|esta bien|todo bien|de acuerdo)$/.test(
        tPago
      );

    const pidePago =
      /\b(pago|pagar|numero|yape|plin|cuenta|deposito|depositar|transferencia|adelanto|donde pago|a que numero)\b/i.test(
        tPago
      );

    if (reportaPago) {
      mensajeControlado =
        "Perfecto. Enviame el comprobante por aqui para continuar con la confirmacion.";
    } else if (confirmacionCorta) {
      mensajeControlado =
        "Perfecto ðŸ‘ Quedo atento al comprobante.";
    } else if (pidePago) {
      const datosSolicitados =
        construirDatosPago(
          textoAccion ?? texto
        );

      const datoPago =
        datosSolicitados ||
        obtenerDatoPagoPrincipal();

      if (datoPago) {
        mensajeControlado =
          `Aqui tienes los datos para realizar el adelanto de S/30:\n\n${datoPago}\n\nCuando realices el pago, enviame el comprobante por aqui.`;
      }
    }
  }

  /*
   * ENTRADA AL CIERRE:
   * ya conocemos ciudad pero todavia
   * no se eligio agencia.
   */
  else if (
    pasoFinal ===
      "conversacion" &&
    contexto.ciudad &&
    !contexto.agencia
  ) {
    pasoFinal =
      "esperando_agencia";

    const adelanto =
      envioPedido
        ?.requiereAdelanto === true
        ? "Se trabaja con un adelanto de S/30 y el saldo se paga cuando el producto ya se encuentre en la agencia."
        : "";

    mensajeControlado =
      `${adelanto}\n\nÂ¿Prefieres Shalom u Olva Courier?`.trim();
  }
}

/*
 * Si no entro al cierre deterministico,
 * conservar el comportamiento normal.
 */
const datosPago =
  construirDatosPago(
    textoAccion ?? texto
  );

const mensajeFinal =
  mensajeControlado ||
  (
    datosPago
      ? handoff
        ? `Perfecto. Aqui tienes los datos de pago solicitados:\n\n${datosPago}\n\nUn asesor continuara con la confirmacion de tu pedido.`
        : `Aqui tienes los datos de pago solicitados:\n\n${datosPago}`
      : analisis.respuesta ||
        "Te paso con un asesor para que pueda ayudarte a continuar."
  );

    return {
      tipo: `ia_${analisis.intencion}`,
      producto,
      intencion: analisis.intencion,
      objecion: analisis.objecion,
      nivelInteres: analisis.nivel_interes,
      accion: analisis.accion,
      apertura: analisis.apertura || null,
      mensaje: mensajeFinal,
      multimedia: analisis.multimedia || "ninguno",
      faseVenta: faseVentaFinal,
      llamarAhora: llamarAhoraFinal,
      motivoLlamada: llamarAhoraFinal
        ? analisis.motivo_llamada || "Interes comercial alto"
        : null,
      handoff,
      memoria: {
  producto,
  paso:
    analisis.fase_venta === "postventa"
      ? "postventa"
      : pasoFinal,
  contexto,
},
      analisis,
    };
  } catch (error) {
    console.error(
      "ERROR CEREBRO IA:",
      error?.message || error
    );

    return await respuestaRespaldo(texto, memoria, empresaId);
  }
}
