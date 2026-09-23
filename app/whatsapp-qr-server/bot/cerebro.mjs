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
  const t = normalizar(texto);

  if (/\bshalom\b/.test(t)) {
    return "SHALOM";
  }

  if (/\bolva(?: courier)?\b/.test(t)) {
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

  return /^(si|correcto|esta bien|todo bien|todo correcto|ok|okay|confirmo|confirmado|ya esta|si esta bien|si todo bien)$/.test(
    t
  );
}

function quitarPreguntaFinal(texto) {
  const valor = String(texto || "").trim();

  const indicePregunta =
    valor.lastIndexOf("¿");

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

function obtenerPromocionProducto(
  producto
) {
  if (
    !Array.isArray(
      producto?.promociones
    )
  ) {
    return null;
  }

  for (const promocion of producto.promociones) {
    if (
      typeof promocion ===
        "string" &&
      promocion.trim()
    ) {
      return promocion.trim();
    }

    if (
      promocion &&
      typeof promocion === "object"
    ) {
      const texto =
        promocion.texto ||
        promocion.nombre ||
        promocion.descripcion ||
        promocion.titulo ||
        null;

      if (texto) {
        return String(texto).trim();
      }
    }
  }

  return null;
}

function construirResumenPedido({
  contexto,
  producto,
  requiereAdelanto,
}) {
  const cantidad =
    Number(contexto?.cantidad || 1);

  const total =
    Number(
      contexto?.precio_acordado
    );

  const promocion =
    obtenerPromocionProducto(
      producto
    );

  const lineas = [];

  lineas.push(
    `NOMBRE: ${contexto.nombre}`
  );

  lineas.push(
    `D.N.I.: ${contexto.dni}`
  );

  if (contexto.telefono) {
    lineas.push(
      `CEL: ${contexto.telefono}`
    );
  }

  lineas.push(
    `CIUDAD: ${contexto.ciudad}`
  );

  if (contexto.agencia) {
    lineas.push("");
    lineas.push(
      "EMPRESA DE ENVIO:"
    );

    const destino =
      contexto.sede_envio
        ? ` - ${contexto.sede_envio}`
        : "";

    lineas.push(
      `${contexto.agencia}${destino}`
    );
  }

  lineas.push("");
  lineas.push("PEDIDO:");

  lineas.push(
    `${String(cantidad).padStart(
      2,
      "0"
    )} ${producto?.nombre || "PRODUCTO"}`
  );

  if (promocion) {
    lineas.push(promocion);
  }

  if (
    Number.isFinite(total) &&
    total > 0
  ) {
    lineas.push("");
    lineas.push(
      `TOTAL: S/${total.toFixed(2)}`
    );
  }

  if (requiereAdelanto) {
    lineas.push(
      "ADELANTO PARA CONFIRMAR: S/30.00"
    );
  }

  lineas.push("");
  lineas.push(
    "Por favor, corrobora que todos tus datos esten correctos. ¿Todo está bien?"
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

/*
 * =========================================================
 * CIERRE DETERMINISTICO PARA ENVIOS POR AGENCIA
 * =========================================================
 *
 * OpenAI puede responder dudas, pero el sistema decide
 * cual es el siguiente dato que falta para cerrar el pedido.
 */

if (
  pasoFinal !== "postventa" &&
  envioPorAgencia &&
  producto
) {
  /*
   * Si ya estabamos esperando agencia,
   * intentar detectar Shalom u Olva.
   */
  if (
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
          "¿Cuantas unidades deseas?";
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
        `${respuestaDuda}\n\n¿Prefieres Shalom u Olva Courier?`.trim();
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
          "¿Cuantas unidades deseas?";
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
        "¿Cuantas unidades deseas?";
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
        `Perfecto. ¿A que sede o localidad de ${contexto.agencia} deseas que llegue tu pedido?`;
    } else {
      pasoFinal =
        "esperando_cantidad";

      mensajeControlado =
        "¿Cuantas unidades deseas?";
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
      /[?¿]/.test(sede);

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
        `${respuestaDuda}\n\n¿A que sede o localidad de ${contexto.agencia} deseas que llegue tu pedido?`.trim();
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
       * volver a enseñar el resumen actualizado.
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
    const pidePago =
      /\b(pago|pagar|numero|yape|plin|cuenta|deposito|depositar|transferencia|adelanto|donde pago|a que numero)\b/i.test(
        normalizar(texto)
      );

    if (pidePago) {
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
      `${adelanto}\n\n¿Prefieres Shalom u Olva Courier?`.trim();
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
