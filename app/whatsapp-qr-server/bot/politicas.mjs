export const POLITICAS_COMERCIALES = {
  envios: {
    confirmado: true,

    agencias: [
      "Shalom",
      "Olva Courier",
    ],

    courierAgencia: {
      adelantoMinimo: 30,
      moneda: "PEN",
      saldo: "El saldo restante se paga cuando el producto ya se encuentra en la agencia.",
    },

    interprovincial: {
      pagoNormal: "100%",
      excepcionAceptada: true,
      adelantoExcepcion: 20,
      condicionExcepcion:
        "Si el cliente lo solicita, puede adelantar S/20 y pagar el saldo cuando el motorizado se encuentre en la agencia, lo contacte y le envíe evidencia o foto.",
    },

    costo: null,
    tiempoEntrega: null,

    observaciones: [
      "No inventar costos de envío.",
      "No inventar tiempos de entrega.",
      "Si el cliente pregunta el costo exacto del envío y no está disponible, debe confirmarlo un asesor.",
    ],
  },

  pagos: {
    confirmado: true,

    metodos: [
      "Yape",
      "Plin",
      "BCP",
      "Interbank",
      "BBVA",
      "Banco de la Nación",
    ],

    datosCuentaDisponibles: false,

    observaciones: [
      "Los números de cuenta y teléfonos de pago se obtienen desde variables privadas del servidor.",
      "No inventar ni modificar números de cuenta.",
      "No proporcionar datos bancarios si el sistema no los recibió explícitamente.",
    ],
  },

  adelantos: {
    confirmado: true,

    courierAgencia: {
      requerido: true,
      montoMinimo: 30,
      moneda: "PEN",
    },

    interprovincial: {
      pagoNormal: "100%",
      excepcionAceptada: true,
      montoAdelantoExcepcion: 20,
      moneda: "PEN",
    },
  },

  garantia: {
    confirmado: false,
    general: null,
    porProducto: {},
    condiciones: [],
  },

  confianza: {
    confirmado: true,

    mensajesPermitidos: [
      "Para envíos por Shalom u Olva Courier se trabaja con un adelanto mínimo de S/30 y el saldo se paga cuando el producto se encuentra en agencia.",
      "Para transporte interprovincial normalmente se solicita el pago completo.",
      "Si el cliente solicita otra modalidad para interprovincial, se puede aceptar un adelanto de S/20 y el saldo cuando el motorizado esté en agencia y envíe evidencia.",
    ],
  },
};

export function obtenerPoliticasComerciales() {
  const datosPagoDisponibles = Boolean(
    process.env.PAYMENT_ACCOUNT_HOLDER &&
    (
      process.env.PAYMENT_BCP_ACCOUNT ||
      process.env.PAYMENT_INTERBANK_ACCOUNT ||
      process.env.PAYMENT_BBVA_ACCOUNT ||
      process.env.PAYMENT_BN_ACCOUNT ||
      process.env.PAYMENT_YAPE_PHONE ||
      process.env.PAYMENT_PLIN_PHONE
    )
  );

  return {
    ...POLITICAS_COMERCIALES,
    pagos: {
      ...POLITICAS_COMERCIALES.pagos,
      datosCuentaDisponibles: datosPagoDisponibles,
    },
  };
}

export function obtenerDatosPagoPrivados() {
  return {
    titular: process.env.PAYMENT_ACCOUNT_HOLDER || null,
    bcp: process.env.PAYMENT_BCP_ACCOUNT || null,
    interbank: process.env.PAYMENT_INTERBANK_ACCOUNT || null,
    bbva: process.env.PAYMENT_BBVA_ACCOUNT || null,
    bancoNacion: process.env.PAYMENT_BN_ACCOUNT || null,
    yape: process.env.PAYMENT_YAPE_PHONE || null,
    plin: process.env.PAYMENT_PLIN_PHONE || null,
  };
}