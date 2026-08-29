import { consultarIA } from "./ia.mjs";
import {
  buscarProducto,
  buscarProductoPorSlug,
} from "./catalogo.mjs";
import { obtenerDatosPagoPrivados } from "./politicas.mjs";

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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
        mensaje: `${producto.nombre} está a S/${producto.precio}. Si quieres, te muestro cómo viene y qué incluye.`,
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
      mensaje: `Claro 👋 Te cuento sobre ${producto.nombre}. Está a S/${producto.precio}.`,
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
      "Claro 👋 Dime qué producto viste y te paso la información.",
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

    if (analisis.uso) {
      contexto.uso = analisis.uso;
    }

    if (analisis.ciudad) {
      contexto.ciudad = analisis.ciudad;
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

const datosPago = construirDatosPago(textoAccion ?? texto);

const mensajeFinal = datosPago
  ? handoff
    ? `Perfecto. Aqui tienes los datos de pago solicitados:\n\n${datosPago}\n\nUn asesor continuara con la confirmacion de tu pedido.`
    : `Aqui tienes los datos de pago solicitados:\n\n${datosPago}`
  : analisis.respuesta ||
    "Te paso con un asesor para que pueda ayudarte a continuar.";

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
        paso: analisis.fase_venta === "postventa" ? "postventa" : "conversacion",
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
