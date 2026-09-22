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

function normalizarUbicacion(texto = "") {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,;:/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DISTRITOS_LIMA_MOTORIZADO = [
  "miraflores",
  "san isidro",
  "santiago de surco",
  "surco",
  "la molina",
  "barranco",
  "chorrillos",
  "san borja",
  "pueblo libre",
  "jesus maria",
  "lince",
  "magdalena",
  "magdalena del mar",
  "san miguel",
  "brena",
  "rimac",
  "el agustino",
  "san juan de lurigancho",
  "san juan de miraflores",
  "villa el salvador",
  "villa maria del triunfo",
  "ate",
  "ate vitarte",
  "santa anita",
  "comas",
  "independencia",
  "los olivos",
  "san martin de porres",
  "puente piedra",
  "carabayllo",
  "callao",
  "bellavista",
  "la perla",
  "la punta",
  "carmen de la legua",
  "cercado de lima",
  "lima cercado",
  "la victoria",
  "surquillo",
];

const DISTRITOS_LIMA_AGENCIA = [
  "ancon",
  "chaclacayo",
  "cieneguilla",
  "lurigancho",
  "pachacamac",
  "pucusana",
  "punta hermosa",
  "punta negra",
  "san bartolo",
  "santa rosa",
];

function contieneLugar(texto, lugar) {
  const escape = lugar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escape}(\\s|$)`).test(texto);
}

export function resolverTipoEnvioPorUbicacion(ciudad) {
  const ubicacion = normalizarUbicacion(ciudad);

  if (!ubicacion) {
    return {
      zona: "sin_ubicacion",
      tipoEnvio: "sin_definir",
      contraEntrega: false,
      requiereAdelanto: false,
    };
  }

  // Primero comprobar los nombres más específicos.
  const motorizado = [...DISTRITOS_LIMA_MOTORIZADO]
    .sort((a, b) => b.length - a.length)
    .find((distrito) => contieneLugar(ubicacion, distrito));

  if (motorizado) {
    return {
      zona: "lima_motorizado",
      distrito: motorizado,
      tipoEnvio: "motorizado_contraentrega",
      contraEntrega: true,
      requiereAdelanto: false,
      adelantoMinimo: 0,
      agencias: [],
    };
  }

  const agenciaLima = [...DISTRITOS_LIMA_AGENCIA]
    .sort((a, b) => b.length - a.length)
    .find((distrito) => contieneLugar(ubicacion, distrito));

  if (agenciaLima) {
    return {
      zona: "lima_agencia",
      distrito: agenciaLima,
      tipoEnvio: "agencia",
      contraEntrega: false,
      requiereAdelanto: true,
      adelantoMinimo:
        POLITICAS_COMERCIALES.envios.courierAgencia.adelantoMinimo,
      agencias: POLITICAS_COMERCIALES.envios.agencias,
    };
  }

  // Si solamente dice Lima, todavía necesitamos el distrito.
  if (
    ubicacion === "lima" ||
    ubicacion === "lima metropolitana" ||
    ubicacion === "provincia de lima"
  ) {
    return {
      zona: "lima_distrito_pendiente",
      tipoEnvio: "preguntar_distrito",
      contraEntrega: false,
      requiereAdelanto: false,
    };
  }

  // Cualquier ubicación que no pertenezca a los distritos de Lima
  // configurados arriba se trata como provincia.
  return {
    zona: "provincia",
    distrito: null,
    tipoEnvio: "agencia",
    contraEntrega: false,
    requiereAdelanto: true,
    adelantoMinimo:
      POLITICAS_COMERCIALES.envios.courierAgencia.adelantoMinimo,
    agencias: POLITICAS_COMERCIALES.envios.agencias,
  };
}