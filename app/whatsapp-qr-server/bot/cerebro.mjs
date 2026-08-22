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

function respuestaRespaldo(texto, memoria = {}) {
  const t = normalizar(texto);

  const producto =
    buscarProducto(texto) ||
    buscarProductoPorSlug(memoria.producto);

  if (producto) {
    if (/\b(precio|cuanto|costo|vale)\b/.test(t)) {
      return {
        tipo: "respaldo_precio",
        producto: producto.slug,
        mensaje: `${producto.nombre} está a S/${producto.precio}. ¿Deseas más información?`,
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
      mensaje: `Sí, tenemos ${producto.nombre} a S/${producto.precio}. ¿Qué deseas saber?`,
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
      "Claro, te ayudo. ¿Qué producto te interesa?",
    memoria: {
      producto: memoria.producto || null,
      paso: memoria.paso || "conversacion",
      contexto: memoria.contexto || {},
    },
  };
}

export async function decidirRespuestaBot({
  texto,
  calificacion,
  memoria = {},
  historial = [],
}) {
  if (!texto || !texto.trim()) {
    return null;
  }

  try {
    const analisis = await consultarIA({
      mensaje: texto,
      memoria,
      historial,
    });

    if (!analisis) {
      return respuestaRespaldo(texto, memoria);
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

    const producto =
      analisis.producto ||
      memoria.producto ||
      null;

    const handoff =
      analisis.accion === "handoff_closer";

const datosPago = construirDatosPago(texto);

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
      mensaje: mensajeFinal,
      handoff,
      memoria: {
        producto,
        paso: handoff ? "closer" : "conversacion",
        contexto,
      },
      analisis,
    };
  } catch (error) {
    console.error(
      "ERROR CEREBRO IA:",
      error?.message || error
    );

    return respuestaRespaldo(texto, memoria);
  }
}
