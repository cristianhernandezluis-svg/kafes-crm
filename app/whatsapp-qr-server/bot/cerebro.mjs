import { consultarIA } from "./ia.mjs";
import {
  buscarProducto,
  buscarProductoPorSlug,
} from "./catalogo.mjs";

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

    return {
      tipo: `ia_${analisis.intencion}`,
      producto,
      intencion: analisis.intencion,
      objecion: analisis.objecion,
      nivelInteres: analisis.nivel_interes,
      accion: analisis.accion,
      mensaje: handoff ? "Perfecto \u{1F44D} ya est\u00E1s listo para continuar con tu pedido. Te paso con un asesor para confirmar el pago." : analisis.respuesta,
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
