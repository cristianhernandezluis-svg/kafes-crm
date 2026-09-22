const fs = require("fs");

const file = "app/whatsapp-qr-server/server.mjs";
let s = fs.readFileSync(file, "utf8");

function fail(msg) {
  throw new Error(msg);
}

const inicio = s.indexOf("async function procesarSeguimientosSilencio()");
if (inicio < 0) fail("No encontre procesarSeguimientosSilencio()");

const siguienteFuncion = s.indexOf("\nasync function ", inicio + 20);
const fin = siguienteFuncion > inicio ? siguienteFuncion : s.length;

let bloque = s.slice(inicio, fin);

/* 1) Traer estado real del ultimo mensaje */
if (!bloque.includes("ult.estado_whatsapp AS ultimo_estado_whatsapp")) {
  const outerOld = "ult.remitente AS ultimo_remitente";
  if (!bloque.includes(outerOld)) {
    fail("No encontre ult.remitente AS ultimo_remitente");
  }

  bloque = bloque.replace(
    outerOld,
    `ult.remitente AS ultimo_remitente,
        ult.estado_whatsapp AS ultimo_estado_whatsapp,
        ult.entregado_at AS ultimo_entregado_at,
        ult.leido_whatsapp_at AS ultimo_leido_whatsapp_at,
        ult.created_at AS ultimo_mensaje_at`
  );
}

if (!bloque.includes("conv.estado_whatsapp")) {
  const innerOld = "SELECT conv.remitente";
  if (!bloque.includes(innerOld)) {
    fail("No encontre SELECT conv.remitente");
  }

  bloque = bloque.replace(
    innerOld,
    `SELECT
          conv.remitente,
          conv.estado_whatsapp,
          conv.entregado_at,
          conv.leido_whatsapp_at,
          conv.created_at`
  );
}

/* 2) Antes de enviar seguimiento, decidir segun WhatsApp */
if (!bloque.includes("SEGUIMIENTO SILENCIO ESPERA WHATSAPP:")) {
  const marker = "        if (intento >= 3) {";
  const idx = bloque.indexOf(marker);

  if (idx < 0) {
    fail("No encontre if (intento >= 3)");
  }

  const logic = `        const estadoUltimoWhatsApp = String(
          cliente.ultimo_estado_whatsapp || ""
        ).toLowerCase();

        const ultimoFueLeido =
          estadoUltimoWhatsApp === "leido" ||
          estadoUltimoWhatsApp === "reproducido";

        const ultimoFueEntregado =
          estadoUltimoWhatsApp === "entregado" ||
          ultimoFueLeido;

        const estadoWhatsAppConocido = [
          "enviado",
          "entregado",
          "leido",
          "reproducido",
        ].includes(estadoUltimoWhatsApp);

        if (!ultimoFueLeido && estadoWhatsAppConocido) {
          let esperarWhatsApp = true;
          let motivoEspera = "NO ENTREGADO";

          if (ultimoFueEntregado) {
            motivoEspera = "ENTREGADO SIN LEER";

            const referenciaEntrega =
              cliente.ultimo_entregado_at || cliente.ultimo_mensaje_at;

            const fechaEntrega = referenciaEntrega
              ? new Date(referenciaEntrega)
              : null;

            const limiteSinLecturaMs =
              FOLLOWUP_2_HORAS * 60 * 60 * 1000;

            if (
              fechaEntrega &&
              Number.isFinite(fechaEntrega.getTime()) &&
              Date.now() - fechaEntrega.getTime() >= limiteSinLecturaMs
            ) {
              esperarWhatsApp = false;

              console.log(
                "SEGUIMIENTO SILENCIO SIN CONFIRMACION DE LECTURA -> CONTINUA:",
                clienteId,
                "HORAS:",
                FOLLOWUP_2_HORAS
              );
            }
          }

          if (esperarWhatsApp) {
            const proximaRevision = fechaDesdeAhora(
              FOLLOWUP_1_MIN * 60 * 1000
            );

            await pool.query(
              \`
              UPDATE clientes
              SET proximo_seguimiento = $2
              WHERE id = $1
                AND COALESCE(
                  bot_contexto->>'seguimiento_silencio_activo',
                  'false'
                ) = 'true'
              \`,
              [clienteId, proximaRevision]
            );

            console.log(
              "SEGUIMIENTO SILENCIO ESPERA WHATSAPP:",
              clienteId,
              motivoEspera,
              "ESTADO:",
              estadoUltimoWhatsApp,
              "REVISION:",
              proximaRevision.toISOString()
            );

            continue;
          }
        }

`;

  bloque = bloque.slice(0, idx) + logic + bloque.slice(idx);
}

s = s.slice(0, inicio) + bloque + s.slice(fin);

/* Validaciones */
const required = [
  "ult.estado_whatsapp AS ultimo_estado_whatsapp",
  "conv.estado_whatsapp",
  "SEGUIMIENTO SILENCIO ESPERA WHATSAPP:",
  "ENTREGADO SIN LEER",
  "NO ENTREGADO",
  "SEGUIMIENTO SILENCIO SIN CONFIRMACION DE LECTURA -> CONTINUA:",
];

for (const text of required) {
  if (!s.includes(text)) {
    fail("Validacion fallo: " + text);
  }
}

fs.writeFileSync(file, s, "utf8");

console.log("ULTIMO ESTADO WHATSAPP EN QUERY: OK");
console.log("NO ENTREGADO -> ESPERA: OK");
console.log("ENTREGADO SIN LEER -> ESPERA: OK");
console.log("LEIDO -> CONTINUA SEGUIMIENTO: OK");
console.log("FALLBACK SIN LECTURA DESPUES DE FOLLOWUP_2_HORAS: OK");
console.log("PATCH FOLLOWUP WHATSAPP INTELIGENTE V1 OK");
