import "dotenv/config";
import express from "express";
import cors from "cors";
import qrcode from "qrcode";
import pg from "pg";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { decidirRespuestaBot } from "./bot/cerebro.mjs";
import { obtenerMemoriaBot, guardarMemoriaBot } from "./bot/memoria.mjs";
import { obtenerHistorialReciente } from "./bot/historial.mjs";
import { crearBufferMensajes } from "./bot/buffer-mensajes.mjs";
import { obtenerMultimediaProducto } from "./bot/catalogo.mjs";
import { transcribirAudio, analizarImagen, analizarDocumento, analizarVideo } from "./bot/media-ai.mjs";

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";

const { Pool } = pg;

function extensionMedia(mime = "") {
  const tipo = mime.split(";")[0].toLowerCase();
  const mapa = { "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp", "video/mp4":"mp4", "audio/ogg":"ogg", "audio/mpeg":"mp3", "audio/mp4":"m4a", "application/pdf":"pdf" };
  return mapa[tipo] || tipo.split("/")[1] || "bin";
}

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function prepararColumnasBot() {
  await pool.query(`
    ALTER TABLE clientes
      ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS temperatura TEXT DEFAULT 'frio',
      ADD COLUMN IF NOT EXISTS bot_activo BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS requiere_closer BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS bot_senales JSONB DEFAULT '[]'::jsonb,\n      ADD COLUMN IF NOT EXISTS bot_producto TEXT,\n      ADD COLUMN IF NOT EXISTS bot_paso TEXT,\n      ADD COLUMN IF NOT EXISTS bot_contexto JSONB DEFAULT '{}'::jsonb,\n      ADD COLUMN IF NOT EXISTS handoff_motivo TEXT DEFAULT 'ninguno',\n      ADD COLUMN IF NOT EXISTS cerrado_por TEXT,\n      ADD COLUMN IF NOT EXISTS cerrado_at TIMESTAMPTZ,\n      ADD COLUMN IF NOT EXISTS humano_hasta TIMESTAMPTZ;
  `);


  await pool.query(`
    ALTER TABLE conversaciones
      ADD COLUMN IF NOT EXISTS estado_whatsapp TEXT,
      ADD COLUMN IF NOT EXISTS enviado_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS entregado_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS leido_whatsapp_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS reproducido_at TIMESTAMPTZ;
  `);
}

let sock;
let qrActual = null;
let estado = "desconectado";
let whatsappQrId = null;
let empresaQrId = null;
const telefonoPorLidHistorial = new Map();

function estadoDesdeWAMessageStatus(status) {
  const numero = Number(status);
  if (numero === 2) return "enviado";
  if (numero === 3) return "entregado";
  if (numero === 4) return "leido";
  if (numero === 5) return "reproducido";

  const texto = String(status || "").toUpperCase();
  if (texto === "SERVER_ACK") return "enviado";
  if (texto === "DELIVERY_ACK") return "entregado";
  if (texto === "READ") return "leido";
  if (texto === "PLAYED") return "reproducido";
  return null;
}

function rangoEstadoWhatsApp(estadoWhatsApp) {
  if (estadoWhatsApp === "enviado") return 1;
  if (estadoWhatsApp === "entregado") return 2;
  if (estadoWhatsApp === "leido") return 3;
  if (estadoWhatsApp === "reproducido") return 4;
  return 0;
}

function fechaDesdeTimestampWhatsApp(valor) {
  if (valor === null || valor === undefined) return null;

  let numero = null;

  if (typeof valor === "number") numero = valor;
  else if (typeof valor === "bigint") numero = Number(valor);
  else if (typeof valor === "string") numero = Number(valor);
  else if (typeof valor?.toNumber === "function") numero = valor.toNumber();

  if (!Number.isFinite(numero) || numero <= 0) return null;

  const ms = numero > 1000000000000 ? numero : numero * 1000;
  const fecha = new Date(ms);

  return Number.isFinite(fecha.getTime()) ? fecha : null;
}

async function actualizarEstadoMensajeWhatsApp(
  whatsappMessageId,
  nuevoEstado,
  fechaEvento = null
) {
  if (!whatsappMessageId || !nuevoEstado || !whatsappQrId) return null;

  const rangoNuevo = rangoEstadoWhatsApp(nuevoEstado);
  if (!rangoNuevo) return null;

  const fecha =
    fechaEvento instanceof Date && Number.isFinite(fechaEvento.getTime())
      ? fechaEvento
      : new Date();

  const result = await pool.query(
    `
    UPDATE conversaciones
    SET estado_whatsapp = CASE
          WHEN (
            CASE COALESCE(estado_whatsapp, '')
              WHEN 'enviado' THEN 1
              WHEN 'entregado' THEN 2
              WHEN 'leido' THEN 3
              WHEN 'reproducido' THEN 4
              ELSE 0
            END
          ) <= $2
          THEN $1
          ELSE estado_whatsapp
        END,
        enviado_at = CASE
          WHEN $1 = 'enviado' THEN COALESCE(enviado_at, $5)
          ELSE enviado_at
        END,
        entregado_at = CASE
          WHEN $1 = 'entregado' THEN COALESCE(entregado_at, $5)
          ELSE entregado_at
        END,
        leido_whatsapp_at = CASE
          WHEN $1 = 'leido' THEN COALESCE(leido_whatsapp_at, $5)
          ELSE leido_whatsapp_at
        END,
        reproducido_at = CASE
          WHEN $1 = 'reproducido' THEN COALESCE(reproducido_at, $5)
          ELSE reproducido_at
        END
    WHERE whatsapp_message_id = $3
      AND whatsapp_qr_id = $4
      AND remitente IN ('bot', 'asesor')
    RETURNING id, cliente_id, estado_whatsapp
    `,
    [nuevoEstado, rangoNuevo, String(whatsappMessageId), whatsappQrId, fecha]
  );

  if (result.rowCount > 0) {
    const row = result.rows[0];
    console.log(
      "WHATSAPP ESTADO:",
      row.id,
      "CLIENTE:",
      row.cliente_id,
      "MENSAJE:",
      String(whatsappMessageId),
      "->",
      String(row.estado_whatsapp || nuevoEstado).toUpperCase()
    );
    return row;
  }

  return null;
}

async function cargarIntegracionQr() {
  const key = process.env.WHATSAPP_SESSION_KEY;
  if (!key) throw new Error("WHATSAPP_SESSION_KEY no configurado");
  const r = await pool.query("SELECT id, empresa_id FROM integraciones_whatsapp_qr WHERE session_key=$1 LIMIT 1", [key]);
  if (!r.rows[0]) throw new Error("Integracion QR no encontrada");
  whatsappQrId = r.rows[0].id;
  empresaQrId = r.rows[0].empresa_id;
  console.log("Integracion QR cargada:", { whatsappQrId, empresaQrId });
}

function normalizarTexto(t){return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}

function extraerMontoComprobante(analisis) {
  const textoOriginal = String(analisis || "");
  const texto = normalizarTexto(textoOriginal);

  const estructurado = textoOriginal.match(
    /COMPROBANTE_MONTO:\s*([0-9]+(?:[.,][0-9]{1,2})?|null)/i
  );

  if (estructurado) {
    if (String(estructurado[1]).toLowerCase() === "null") {
      return null;
    }

    const monto = Number(String(estructurado[1]).replace(",", "."));

    if (Number.isFinite(monto) && monto > 0 && monto <= 100000) {
      return monto;
    }
  }

  const pareceComprobante =
    /\b(comprobante|voucher|yapeaste|yape|plin|transferencia|deposito|pago realizado)\b/.test(
      texto
    );

  if (!pareceComprobante) {
    return null;
  }

  const patrones = [
    /(?:s\s*\/\s*|s\s*\/\.\s*)([0-9]+(?:[.,][0-9]{1,2})?)/i,
    /\b(?:monto|importe|total pagado|pago de|pagado)\s*[:=-]?\s*(?:s\s*\/\s*)?([0-9]+(?:[.,][0-9]{1,2})?)/i,
  ];

  for (const patron of patrones) {
    const match = textoOriginal.match(patron);
    if (!match) continue;

    const monto = Number(String(match[1]).replace(",", "."));

    if (Number.isFinite(monto) && monto > 0 && monto <= 100000) {
      return monto;
    }
  }

  return null;
}

function detectarMotivoHandoff(textoAccion,textoBot){const accion=normalizarTexto(textoAccion);const completo=normalizarTexto(textoBot);const archivo=String(textoBot||'').includes('[ANALISIS INTERNO DEL ARCHIVO');if(archivo&&/\b(comprobante|voucher|constancia|pago realizado|transferencia realizada|deposito realizado)\b/.test(completo))return 'validar_pago';if(/\b(asesor|persona|humano|vendedor)\b/.test(accion))return 'pide_humano';return 'bot_no_puede';}

const ETAPAS_AUTOMATICAS = new Set([
  "mantener",
  "Nuevo",
  "Interesado",
  "Calificado",
  "Seguimiento",
  "Pago por validar",
  "Descartado",
]);

function resolverEtapaAutomatica(etapaActual, etapaSugerida) {
  const actual = String(etapaActual || "").trim();
  const sugerida = String(etapaSugerida || "").trim();

  if (!ETAPAS_AUTOMATICAS.has(sugerida) || sugerida === "mantener") {
    return null;
  }

  if (["Pag\u00f3 Adelanto", "Enviado", "Entregado"].includes(actual)) {
    return null;
  }

  // Un comprobante pendiente queda aqui hasta validacion humana.
  if (actual === "Pago por validar") {
    return null;
  }

  // Nunca retroceder a Nuevo.
  if (sugerida === "Nuevo") {
    return !actual || actual === "Nuevo" ? "Nuevo" : null;
  }

  // Estados disparados por senal explicita del mensaje actual.
  if (
    sugerida === "Pago por validar" ||
    sugerida === "Seguimiento" ||
    sugerida === "Descartado"
  ) {
    return sugerida;
  }

  // Una oportunidad puede reactivarse si vuelve con interes real.
  if (["Descartado", "Seguimiento", "No Responde"].includes(actual)) {
    return ["Interesado", "Calificado"].includes(sugerida)
      ? sugerida
      : null;
  }

  const rango = {
    Nuevo: 0,
    Interesado: 1,
    Calificado: 2,
  };

  const actualRango = Object.prototype.hasOwnProperty.call(rango, actual)
    ? rango[actual]
    : -1;

  const sugeridoRango = Object.prototype.hasOwnProperty.call(rango, sugerida)
    ? rango[sugerida]
    : -1;

  if (sugeridoRango < 0) return null;

  return sugeridoRango >= actualRango ? sugerida : null;
}

function calificarMensajeCliente(texto){const t=normalizarTexto(texto);const senales=[];if(/\b(precio|cuanto|costo|vale)\b/.test(t))senales.push('precio');if(/\b(envio|envios|delivery|entrega|entregas|llega|llegan|agencia|agencias|shalom|olva)\b/.test(t))senales.push('envio');if(/\b(ciudad|distrito|provincia|departamento|direccion|soy de|vivo en)\b/.test(t))senales.push('ubicacion');if(/\b(garantia)\b/.test(t))senales.push('garantia');if(/\b(yape|plin|transferencia|transferir|deposito|depositar|pago|pagos|pagar)\b/.test(t))senales.push('pago');if(/\b(quiero|compro|comprar|separar|separame|reservar|pedido|quiero uno)\b/.test(t))senales.push('intencion_compra');if(/\b(hoy|ahora|ya mismo)\b/.test(t))senales.push('urgencia');return {senales};}

const PESOS_SENALES={precio:5,envio:10,ubicacion:10,garantia:5,pago:30,intencion_compra:60,urgencia:10};

async function actualizarCalificacionCliente(clienteId,texto){
  const detectado=calificarMensajeCliente(texto);

  await pool.query(
    `UPDATE clientes
     SET bot_activo=true, humano_hasta=NULL
     WHERE id=$1
       AND bot_activo=false
       AND humano_hasta IS NOT NULL
       AND humano_hasta <= NOW()`
,    [clienteId]
  );

  const r=await pool.query(
    `SELECT COALESCE(bot_senales,'[]'::jsonb) AS bot_senales,
            COALESCE(bot_activo,true) AS bot_activo
     FROM clientes
     WHERE id=$1
     LIMIT 1`,
    [clienteId]
  );

  if(!r.rows[0] || r.rows[0].bot_activo===false) return null;

  const anteriores=Array.isArray(r.rows[0].bot_senales)?r.rows[0].bot_senales:[];
  const senales=[...new Set([...anteriores,...detectado.senales])];
  const score=Math.min(100,senales.reduce((t,x)=>t+(PESOS_SENALES[x]||0),0));
  const temperatura=score>=80?'caliente':score>=25?'tibio':'frio';

  await pool.query(
    `UPDATE clientes
     SET bot_senales=$1::jsonb, score=$2, temperatura=$3
     WHERE id=$4`,
    [JSON.stringify(senales),score,temperatura,clienteId]
  );

  return {senales,score,temperatura,requiereCloser:false};
}


const FOLLOWUP_1_MIN = Math.max(
  1,
  Number(process.env.BOT_FOLLOWUP_1_MIN || 60)
);
const FOLLOWUP_2_HORAS = Math.max(
  1,
  Number(process.env.BOT_FOLLOWUP_2_HORAS || 24)
);
const FOLLOWUP_3_HORAS = Math.max(
  1,
  Number(process.env.BOT_FOLLOWUP_3_HORAS || 48)
);
const FOLLOWUP_CIERRE_HORAS = Math.max(
  1,
  Number(process.env.BOT_FOLLOWUP_CIERRE_HORAS || 24)
);

let seguimientoSilencioEnCurso = false;

function fechaDesdeAhora(ms) {
  return new Date(Date.now() + ms);
}

async function cancelarSeguimientoSilencio(clienteId) {
  await pool.query(
    `
    UPDATE clientes
    SET proximo_seguimiento = CASE
          WHEN COALESCE(bot_contexto->>'seguimiento_silencio_activo', 'false') = 'true'
            OR COALESCE(bot_contexto->>'seguimiento_explicito_activo', 'false') = 'true'
          THEN NULL
          ELSE proximo_seguimiento
        END,
        bot_contexto = COALESCE(bot_contexto, '{}'::jsonb) ||
          jsonb_build_object(
            'seguimiento_silencio_activo', false,
            'seguimiento_silencio_intento', 0,
            'seguimiento_explicito_activo', false,
            'seguimiento_explicito_para', NULL
          )
    WHERE id = $1
    `,
    [clienteId]
  );
}

function resolverFechaSeguimientoExplicito(analisisCRM) {
  const raw = String(analisisCRM?.seguimiento_fecha || "").trim();

  if (raw) {
    const fecha = new Date(raw);
    const ahora = Date.now();
    const maximo = ahora + 366 * 24 * 60 * 60 * 1000;

    if (
      Number.isFinite(fecha.getTime()) &&
      fecha.getTime() > ahora + 30 * 1000 &&
      fecha.getTime() <= maximo
    ) {
      return { fecha, origen: "ia" };
    }
  }

  return {
    fecha: new Date(Date.now() + 48 * 60 * 60 * 1000),
    origen: "respaldo_48h",
  };
}

async function programarSeguimientoExplicito({
  clienteId,
  analisisCRM,
  requiereCloserIA,
}) {
  if (requiereCloserIA === true) {
    await cancelarSeguimientoSilencio(clienteId);
    return;
  }

  const seguimientoPara = String(analisisCRM?.seguimiento_para || "").trim();
  const { fecha, origen } = resolverFechaSeguimientoExplicito(analisisCRM);

  const result = await pool.query(
    `
    UPDATE clientes
    SET etapa = CASE
          WHEN etapa IN ('Nuevo', 'Interesado', 'Calificado', 'Seguimiento')
          THEN 'Seguimiento'
          ELSE etapa
        END,
        proximo_seguimiento = $2,
        bot_contexto = COALESCE(bot_contexto, '{}'::jsonb) ||
          jsonb_build_object(
            'seguimiento_silencio_activo', false,
            'seguimiento_silencio_intento', 0,
            'seguimiento_explicito_activo', true,
            'seguimiento_explicito_para', NULLIF($3, '')
          )
    WHERE id = $1
      AND bot_activo = true
      AND COALESCE(requiere_closer, false) = false
      AND etapa NOT IN (
        'Pago por validar',
        'Pagó Adelanto',
        'Enviado',
        'Entregado',
        'Descartado'
      )
    RETURNING id
    `,
    [clienteId, fecha, seguimientoPara]
  );

  if (result.rowCount > 0) {
    console.log(
      "SEGUIMIENTO EXPLICITO PROGRAMADO:",
      clienteId,
      fecha.toISOString(),
      "ORIGEN:",
      origen,
      "PARA:",
      seguimientoPara || "sin detalle"
    );
  }
}

function mensajeSeguimientoExplicito() {
  return "Hola 👋 Quedamos en retomar tu consulta por estas horas. ¿Deseas continuar con tu pedido?";
}

let seguimientoExplicitoEnCurso = false;

async function procesarSeguimientosExplicitos() {
  if (seguimientoExplicitoEnCurso) return;
  if (!sock || estado !== "conectado" || !empresaQrId || !whatsappQrId) return;

  seguimientoExplicitoEnCurso = true;

  try {
    const pendientes = await pool.query(
      `
      SELECT
        c.id,
        c.telefono,
        c.etapa,
        c.bot_contexto->>'seguimiento_explicito_para' AS seguimiento_para,
        ult.remitente AS ultimo_remitente
      FROM clientes c
      JOIN clientes_whatsapp_qr cwq
        ON cwq.cliente_id = c.id
       AND cwq.empresa_id = c.empresa_id
       AND cwq.whatsapp_qr_id = $2
      LEFT JOIN LATERAL (
        SELECT conv.remitente
        FROM conversaciones conv
        WHERE conv.cliente_id = c.id
          AND conv.whatsapp_qr_id = $2
        ORDER BY conv.created_at DESC, conv.id DESC
        LIMIT 1
      ) ult ON true
      WHERE c.empresa_id = $1
        AND c.proximo_seguimiento IS NOT NULL
        AND c.proximo_seguimiento <= NOW()
        AND COALESCE(c.bot_contexto->>'seguimiento_explicito_activo', 'false') = 'true'
        AND c.bot_activo = true
        AND COALESCE(c.requiere_closer, false) = false
        AND (c.humano_hasta IS NULL OR c.humano_hasta <= NOW())
        AND c.etapa NOT IN (
          'Pago por validar',
          'Pagó Adelanto',
          'Enviado',
          'Entregado',
          'Descartado'
        )
      ORDER BY c.proximo_seguimiento ASC
      LIMIT 20
      `,
      [empresaQrId, whatsappQrId]
    );

    for (const cliente of pendientes.rows) {
      try {
        const clienteId = Number(cliente.id);
        const telefono = String(cliente.telefono || "").replace(/\D/g, "");

        if (!clienteId || !telefono) {
          if (clienteId) await cancelarSeguimientoSilencio(clienteId);
          continue;
        }

        if (cliente.ultimo_remitente !== "bot") {
          await cancelarSeguimientoSilencio(clienteId);
          console.log(
            "SEGUIMIENTO EXPLICITO CANCELADO POR NUEVA INTERACCION:",
            clienteId,
            cliente.ultimo_remitente || "sin remitente"
          );
          continue;
        }

        const mensaje = mensajeSeguimientoExplicito();
        const jid = `${telefono}@s.whatsapp.net`;
        const enviado = await sock.sendMessage(jid, { text: mensaje });

        await pool.query(
          `
          INSERT INTO conversaciones (
            cliente_id,
            telefono,
            whatsapp_message_id,
            mensaje,
            remitente,
            tipo,
            empresa_id,
            whatsapp_qr_id,
            canal
          )
          VALUES ($1, $2, $3, $4, 'bot', 'text', $5, $6, 'qr')
          ON CONFLICT (whatsapp_message_id)
          WHERE whatsapp_message_id IS NOT NULL
          DO UPDATE SET
            mensaje = EXCLUDED.mensaje,
            remitente = 'bot'
          `,
          [
            clienteId,
            telefono,
            enviado?.key?.id || null,
            mensaje,
            empresaQrId,
            whatsappQrId,
          ]
        );

        const siguienteSilencio = fechaDesdeAhora(FOLLOWUP_1_MIN * 60 * 1000);

        await pool.query(
          `
          UPDATE clientes
          SET proximo_seguimiento = $2,
              cantidad_seguimientos = COALESCE(cantidad_seguimientos, 0) + 1,
              bot_contexto = COALESCE(bot_contexto, '{}'::jsonb) ||
                jsonb_build_object(
                  'seguimiento_explicito_activo', false,
                  'seguimiento_explicito_para', NULL,
                  'seguimiento_silencio_activo', true,
                  'seguimiento_silencio_intento', 0
                )
          WHERE id = $1
          `,
          [clienteId, siguienteSilencio]
        );

        console.log(
          "SEGUIMIENTO EXPLICITO ENVIADO:",
          clienteId,
          "SIGUIENTE SILENCIO:",
          siguienteSilencio.toISOString()
        );
      } catch (errorCliente) {
        console.error(
          "ERROR SEGUIMIENTO EXPLICITO CLIENTE:",
          cliente?.id,
          errorCliente?.message || errorCliente
        );
      }
    }
  } catch (error) {
    console.error(
      "ERROR MOTOR SEGUIMIENTO EXPLICITO:",
      error?.message || error
    );
  } finally {
    seguimientoExplicitoEnCurso = false;
  }
}

async function programarSeguimientoSilencio({
  clienteId,
  analisisCRM,
  requiereCloserIA,
}) {
  if (analisisCRM?.seguimiento === true) {
    await programarSeguimientoExplicito({
      clienteId,
      analisisCRM,
      requiereCloserIA,
    });
    return;
  }

  if (requiereCloserIA === true) {
    await cancelarSeguimientoSilencio(clienteId);
    return;
  }

  const proximaFecha = fechaDesdeAhora(FOLLOWUP_1_MIN * 60 * 1000);

  const result = await pool.query(
    `
    UPDATE clientes
    SET proximo_seguimiento = $2,
        bot_contexto = jsonb_set(
          jsonb_set(
            COALESCE(bot_contexto, '{}'::jsonb),
            '{seguimiento_silencio_activo}',
            'true'::jsonb,
            true
          ),
          '{seguimiento_silencio_intento}',
          '0'::jsonb,
          true
        )
    WHERE id = $1
      AND bot_activo = true
      AND COALESCE(requiere_closer, false) = false
      AND etapa NOT IN (
        'Pago por validar',
        'Pagó Adelanto',
        'Enviado',
        'Entregado',
        'Descartado'
      )
    RETURNING id
    `,
    [clienteId, proximaFecha]
  );

  if (result.rowCount > 0) {
    console.log(
      "SEGUIMIENTO SILENCIO PROGRAMADO:",
      clienteId,
      proximaFecha.toISOString()
    );
  }
}

function mensajeSeguimientoSilencio(intento) {
  if (intento === 0) {
    return "Hola 👋 ¿Pudiste revisar la información que te envié? Si deseas, te ayudo a completar tu pedido.";
  }

  if (intento === 1) {
    return "Hola nuevamente 👋 ¿Aún estás interesado en el producto? Si tienes alguna duda antes de pedirlo, dime y te ayudo.";
  }

  return "Hola 👋 Te escribo por última vez para saber si todavía deseas continuar con tu pedido. Si más adelante lo necesitas, con gusto te ayudamos.";
}

async function procesarSeguimientosSilencio() {
  if (seguimientoSilencioEnCurso) return;
  if (!sock || estado !== "conectado" || !empresaQrId || !whatsappQrId) return;

  seguimientoSilencioEnCurso = true;

  try {
    const pendientes = await pool.query(
      `
      SELECT
        c.id,
        c.telefono,
        c.etapa,
        CASE
          WHEN COALESCE(c.bot_contexto->>'seguimiento_silencio_intento', '') ~ '^[0-9]+$'
          THEN (c.bot_contexto->>'seguimiento_silencio_intento')::int
          ELSE 0
        END AS intento,
        ult.remitente AS ultimo_remitente
      FROM clientes c
      JOIN clientes_whatsapp_qr cwq
        ON cwq.cliente_id = c.id
       AND cwq.empresa_id = c.empresa_id
       AND cwq.whatsapp_qr_id = $2
      LEFT JOIN LATERAL (
        SELECT conv.remitente
        FROM conversaciones conv
        WHERE conv.cliente_id = c.id
          AND conv.whatsapp_qr_id = $2
        ORDER BY conv.created_at DESC, conv.id DESC
        LIMIT 1
      ) ult ON true
      WHERE c.empresa_id = $1
        AND c.proximo_seguimiento IS NOT NULL
        AND c.proximo_seguimiento <= NOW()
        AND COALESCE(c.bot_contexto->>'seguimiento_silencio_activo', 'false') = 'true'
        AND c.bot_activo = true
        AND COALESCE(c.requiere_closer, false) = false
        AND (c.humano_hasta IS NULL OR c.humano_hasta <= NOW())
        AND c.etapa NOT IN (
          'Pago por validar',
          'Pagó Adelanto',
          'Enviado',
          'Entregado',
          'Descartado'
        )
      ORDER BY c.proximo_seguimiento ASC
      LIMIT 20
      `,
      [empresaQrId, whatsappQrId]
    );

    for (const cliente of pendientes.rows) {
      try {
        const clienteId = Number(cliente.id);
        const telefono = String(cliente.telefono || "").replace(/\D/g, "");
        const intento = Number(cliente.intento || 0);

        if (!clienteId || !telefono) {
          if (clienteId) await cancelarSeguimientoSilencio(clienteId);
          continue;
        }

        if (cliente.ultimo_remitente !== "bot") {
          await cancelarSeguimientoSilencio(clienteId);
          console.log(
            "SEGUIMIENTO SILENCIO CANCELADO POR NUEVA INTERACCION:",
            clienteId,
            cliente.ultimo_remitente || "sin remitente"
          );
          continue;
        }

        if (intento >= 3) {
          await pool.query(
            `
            UPDATE clientes
            SET etapa = CASE
                  WHEN etapa IN ('Nuevo', 'Interesado', 'Calificado', 'Seguimiento')
                  THEN 'No Responde'
                  ELSE etapa
                END,
                proximo_seguimiento = NULL,
                bot_contexto = jsonb_set(
                  jsonb_set(
                    COALESCE(bot_contexto, '{}'::jsonb),
                    '{seguimiento_silencio_activo}',
                    'false'::jsonb,
                    true
                  ),
                  '{seguimiento_silencio_intento}',
                  to_jsonb(3),
                  true
                )
            WHERE id = $1
            `,
            [clienteId]
          );

          console.log(
            "SEGUIMIENTO SILENCIO FINALIZADO -> NO RESPONDE:",
            clienteId
          );
          continue;
        }

        const mensaje = mensajeSeguimientoSilencio(intento);
        const jid = `${telefono}@s.whatsapp.net`;
        const enviado = await sock.sendMessage(jid, { text: mensaje });

        await pool.query(
          `
          INSERT INTO conversaciones (
            cliente_id,
            telefono,
            whatsapp_message_id,
            mensaje,
            remitente,
            tipo,
            empresa_id,
            whatsapp_qr_id,
            canal
          )
          VALUES ($1, $2, $3, $4, 'bot', 'text', $5, $6, 'qr')
          ON CONFLICT (whatsapp_message_id)
          WHERE whatsapp_message_id IS NOT NULL
          DO UPDATE SET
            mensaje = EXCLUDED.mensaje,
            remitente = 'bot'
          `,
          [
            clienteId,
            telefono,
            enviado?.key?.id || null,
            mensaje,
            empresaQrId,
            whatsappQrId,
          ]
        );

        const nuevoIntento = intento + 1;

        let siguienteMs;
        if (nuevoIntento === 1) {
          siguienteMs = FOLLOWUP_2_HORAS * 60 * 60 * 1000;
        } else if (nuevoIntento === 2) {
          siguienteMs = FOLLOWUP_3_HORAS * 60 * 60 * 1000;
        } else {
          siguienteMs = FOLLOWUP_CIERRE_HORAS * 60 * 60 * 1000;
        }

        const proximaFecha = fechaDesdeAhora(siguienteMs);

        await pool.query(
          `
          UPDATE clientes
          SET etapa = CASE
                WHEN etapa IN ('Nuevo', 'Interesado', 'Calificado')
                THEN 'Seguimiento'
                ELSE etapa
              END,
              proximo_seguimiento = $2,
              cantidad_seguimientos = COALESCE(cantidad_seguimientos, 0) + 1,
              bot_contexto = jsonb_set(
                jsonb_set(
                  COALESCE(bot_contexto, '{}'::jsonb),
                  '{seguimiento_silencio_activo}',
                  'true'::jsonb,
                  true
                ),
                '{seguimiento_silencio_intento}',
                to_jsonb($3::int),
                true
              )
          WHERE id = $1
          `,
          [clienteId, proximaFecha, nuevoIntento]
        );

        console.log(
          "SEGUIMIENTO SILENCIO ENVIADO:",
          clienteId,
          "INTENTO:",
          nuevoIntento,
          "SIGUIENTE:",
          proximaFecha.toISOString()
        );
      } catch (errorCliente) {
        console.error(
          "ERROR SEGUIMIENTO SILENCIO CLIENTE:",
          cliente?.id,
          errorCliente?.message || errorCliente
        );
      }
    }
  } catch (error) {
    console.error(
      "ERROR MOTOR SEGUIMIENTO SILENCIO:",
      error?.message || error
    );
  } finally {
    seguimientoSilencioEnCurso = false;
  }
}

async function procesarLoteBot(lote) {
  if (!Array.isArray(lote) || lote.length === 0) return;

  const ultimo = lote[lote.length - 1];
  const clienteId = ultimo.clienteId;
  const telefono = ultimo.telefono;
  const jidRespuesta = ultimo.jidRespuesta || `${telefono}@s.whatsapp.net`;

  const ids = lote
    .map((item) => Number(item.idConversacion))
    .filter((id) => Number.isFinite(id));

  const primerId = ids.length ? Math.min(...ids) : Number.MAX_SAFE_INTEGER;

  const partesBot = lote.map((item) => item.textoBot).filter(Boolean);
  const partesAccion = lote.map((item) => item.textoAccion).filter(Boolean);

  const textoBot =
    partesBot.length > 1
      ? `MENSAJES CONSECUTIVOS DEL CLIENTE - responde una sola vez al conjunto:\n${partesBot.join("\n")}`
      : (partesBot[0] || "");

  const textoAccion = partesAccion.join("\n").trim();

  if (!textoBot) return;

  console.log("BUFFER BOT PROCESANDO:", {
    clienteId,
    mensajes: lote.length,
    primerId,
  });

  const calificacion = await actualizarCalificacionCliente(
    clienteId,
    textoAccion || ""
  );

  console.log("CALIFICACION BOT:", calificacion);

  if (!calificacion || calificacion.requiereCloser) return;

  const memoria = await obtenerMemoriaBot(pool, clienteId);
  const historial = await obtenerHistorialReciente(pool, clienteId, primerId);

  const respuestaBot = await decidirRespuestaBot({
    texto: textoBot,
    textoAccion: textoAccion || "",
    calificacion,
    memoria,
    historial,
  });

  const analisisCRM = respuestaBot?.analisis || null;

  const etapaAutomatica = resolverEtapaAutomatica(
    memoria?.etapa,
    analisisCRM?.etapa_sugerida
  );

  if (etapaAutomatica && etapaAutomatica !== memoria?.etapa) {
    await pool.query(
      `
      UPDATE clientes
      SET etapa = $2
      WHERE id = $1
      `,
      [clienteId, etapaAutomatica]
    );

    memoria.etapa = etapaAutomatica;

    console.log(
      "ETAPA CRM BOT:",
      clienteId,
      "->",
      etapaAutomatica,
      "|",
      analisisCRM?.motivo_etapa || "sin motivo"
    );
  }

  const requiereCloserIA =
    respuestaBot?.handoff === true ||
    analisisCRM?.requiere_closer === true ||
    etapaAutomatica === "Pago por validar";

  if (requiereCloserIA) {
    const motivoIA = String(analisisCRM?.motivo_closer || "").trim();

    const handoffMotivo =
      etapaAutomatica === "Pago por validar"
        ? "validar_pago"
        : motivoIA && motivoIA !== "ninguno"
        ? motivoIA
        : detectarMotivoHandoff(textoAccion, textoBot);

    const asesorResult = await pool.query(
      `
      SELECT u.nombre
      FROM usuarios u
      JOIN clientes c ON c.empresa_id = u.empresa_id
      WHERE c.id = $1
        AND u.rol = 'asesor'
      ORDER BY u.id ASC
      LIMIT 1
      `,
      [clienteId]
    );

    const asesor = asesorResult.rows[0]?.nombre || null;

    await pool.query(
      `
      UPDATE clientes
      SET requiere_closer = true,
          handoff_motivo = $3,
          asesor = COALESCE($2, asesor)
      WHERE id = $1
      `,
      [clienteId, asesor, handoffMotivo]
    );

    console.log(
      "ALERTA CLOSER:",
      clienteId,
      "MOTIVO:",
      handoffMotivo,
      "ASESOR:",
      asesor || "SIN ASESOR"
    );
  }

  if (respuestaBot?.memoria) {
    await guardarMemoriaBot(pool, clienteId, respuestaBot.memoria);
  }

  if (!respuestaBot?.mensaje) return;

  const largo = String(respuestaBot.mensaje).length;
  const demoraHumanaMs = Math.min(
    4000,
    1500 + Math.floor(largo * 7) + Math.floor(Math.random() * 700)
  );

  console.log("DEMORA HUMANA BOT:", demoraHumanaMs, "ms");

  try {
    await sock?.sendPresenceUpdate?.("composing", jidRespuesta);
  } catch {}

  await new Promise((resolve) => setTimeout(resolve, demoraHumanaMs));

  try {
    await sock?.sendPresenceUpdate?.("paused", jidRespuesta);
  } catch {}

  const multimediaSolicitada = respuestaBot?.multimedia || "ninguno";
  const archivosMultimedia =
    multimediaSolicitada !== "ninguno" && respuestaBot?.producto
      ? obtenerMultimediaProducto(respuestaBot.producto, multimediaSolicitada)
      : [];

  if (archivosMultimedia.length > 0) {
    const limite = multimediaSolicitada === "foto" ? 2 : 1;

    for (const archivo of archivosMultimedia.slice(0, limite)) {
      try {
        const bufferArchivo = await readFile(archivo);

        if (multimediaSolicitada === "foto") {
          await sock.sendMessage(jidRespuesta, { image: bufferArchivo });
        } else if (multimediaSolicitada === "video") {
          await sock.sendMessage(jidRespuesta, { video: bufferArchivo });
        } else if (multimediaSolicitada === "audio") {
          const ruta = String(archivo).toLowerCase();
          const mimetype = ruta.endsWith(".ogg")
            ? "audio/ogg; codecs=opus"
            : ruta.endsWith(".m4a") || ruta.endsWith(".mp4")
              ? "audio/mp4"
              : "audio/mpeg";

          await sock.sendMessage(jidRespuesta, {
            audio: bufferArchivo,
            mimetype,
            ptt: false,
          });
        }

        console.log("MULTIMEDIA BOT ENVIADO:", {
          clienteId,
          producto: respuestaBot.producto,
          tipo: multimediaSolicitada,
          archivo,
        });
      } catch (error) {
        console.error(
          "ERROR ENVIANDO MULTIMEDIA BOT:",
          archivo,
          error?.message || error
        );
      }
    }
  }

  const enviadoBot = await sock.sendMessage(jidRespuesta, {
    text: respuestaBot.mensaje,
  });

  await pool.query(
    `
    INSERT INTO conversaciones (
      cliente_id,
      telefono,
      whatsapp_message_id,
      mensaje,
      remitente,
      tipo,
      empresa_id,
      whatsapp_qr_id,
      canal
     )
    VALUES ($1, $2, $3, $4, 'bot', 'text', $5, $6, 'qr')
    ON CONFLICT (whatsapp_message_id)
    WHERE whatsapp_message_id IS NOT NULL
    DO UPDATE SET
      mensaje = EXCLUDED.mensaje,
      remitente = 'bot'
    `,
    [
      clienteId,
      telefono,
      enviadoBot?.key?.id || null,
      respuestaBot.mensaje,
      empresaQrId,
      whatsappQrId,
    ]
  );

  await programarSeguimientoSilencio({
    clienteId,
    analisisCRM,
    requiereCloserIA,
  });

  console.log("BOT RESPONDIO:", {
    tipo: respuestaBot?.tipo,
    producto: respuestaBot?.producto,
    intencion: respuestaBot?.intencion,
    objecion: respuestaBot?.objecion,
    nivelInteres: respuestaBot?.nivelInteres,
    accion: respuestaBot?.accion,
    handoff: respuestaBot?.handoff,
    mensajesAgrupados: lote.length,
  });
}

const bufferMensajesBot = crearBufferMensajes({
  silencioMs: 3000,
  maxEsperaMs: 10000,
  procesarLote: procesarLoteBot,
});

async function iniciarWhatsApp() {
  const MEDIA_DIR = "./auth/media";
  await mkdir(MEDIA_DIR, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  const { version } = await fetchLatestWaWebVersion();
  console.log("Version WhatsApp Web:", version);

  sock = makeWASocket({
    auth: state,
    version,
    syncFullHistory: true,
    shouldSyncHistoryMessage: () => true,
  });

  sock.ev.on("creds.update", saveCreds);

sock.ev.on("messaging-history.set", async ({ chats = [], contacts = [], messages = [], lidPnMappings = [] }) => {
  console.log("Sincronizacion WhatsApp:", { contacts: contacts.length, chats: chats.length, messages: messages.length });

  for (const m of lidPnMappings) {
    if (m?.lid && m?.pn) telefonoPorLidHistorial.set(m.lid, m.pn);
  }
  const telefonoPorLid = telefonoPorLidHistorial;

  for (const contact of contacts) {
    try {
      const jidContacto = contact.phoneNumber || contact.id || "";
      if (!jidContacto || jidContacto.endsWith("@g.us") || jidContacto === "status@broadcast") continue;

      let telefonoContacto = "";
      if (jidContacto.endsWith("@s.whatsapp.net")) telefonoContacto = jidContacto.replace("@s.whatsapp.net", "");
      else if (jidContacto.endsWith("@c.us")) telefonoContacto = jidContacto.replace("@c.us", "");
      else if (/^\d+$/.test(jidContacto)) telefonoContacto = jidContacto;
      else if (jidContacto.endsWith("@lid")) {
        const pnMapeado = telefonoPorLid.get(jidContacto);
        if (pnMapeado?.endsWith("@s.whatsapp.net")) telefonoContacto = pnMapeado.replace("@s.whatsapp.net", "");
        else if (pnMapeado?.endsWith("@c.us")) telefonoContacto = pnMapeado.replace("@c.us", "");
        else if (/^\d+$/.test(pnMapeado || "")) telefonoContacto = pnMapeado;
        else continue;
      }
      else continue;

      const nombreContacto = contact.name || contact.notify || contact.verifiedName || telefonoContacto;

      const clienteContacto = await pool.query(
        `INSERT INTO clientes (nombre, telefono, etapa, empresa_id, canal)
         VALUES ($1, $2, 'Nuevo', $3, 'qr')
         ON CONFLICT (empresa_id, telefono) DO UPDATE
         SET nombre = CASE WHEN EXCLUDED.nombre <> clientes.telefono THEN EXCLUDED.nombre ELSE clientes.nombre END,
             canal = 'qr'
         RETURNING id`,
        [nombreContacto, telefonoContacto, empresaQrId]
      );

      await pool.query(
        `INSERT INTO clientes_whatsapp_qr (empresa_id, cliente_id, whatsapp_qr_id, origen, updated_at)
         VALUES ($1, $2, $3, 'contacto', NOW())
         ON CONFLICT (cliente_id, whatsapp_qr_id) DO UPDATE SET updated_at = NOW()`,
        [empresaQrId, clienteContacto.rows[0].id, whatsappQrId]
      );
    } catch (err) {
      console.error("Error importando contacto WhatsApp:", err);
    }
  }

  for (const chat of chats) {
    try {
      const jidChat = chat.pnJid || chat.id || "";
      if (!jidChat || jidChat.endsWith("@g.us") || jidChat === "status@broadcast") continue;

      let telefonoChat = "";
      if (jidChat.endsWith("@s.whatsapp.net")) telefonoChat = jidChat.replace("@s.whatsapp.net", "");
      else if (jidChat.endsWith("@c.us")) telefonoChat = jidChat.replace("@c.us", "");
      else if (/^\d+$/.test(jidChat)) telefonoChat = jidChat;
      else if (jidChat.endsWith("@lid")) {
        const pnMapeado = telefonoPorLid.get(jidChat);
        if (pnMapeado?.endsWith("@s.whatsapp.net")) telefonoChat = pnMapeado.replace("@s.whatsapp.net", "");
        else if (pnMapeado?.endsWith("@c.us")) telefonoChat = pnMapeado.replace("@c.us", "");
        else if (/^\d+$/.test(pnMapeado || "")) telefonoChat = pnMapeado;
        else continue;
      }
      else continue;

      const nombreChat = chat.name || chat.displayName || chat.username || telefonoChat;

      const clienteChat = await pool.query(
        `INSERT INTO clientes (nombre, telefono, etapa, empresa_id, canal)
         VALUES ($1, $2, 'Nuevo', $3, 'qr')
         ON CONFLICT (empresa_id, telefono) DO UPDATE
         SET nombre = CASE WHEN EXCLUDED.nombre <> clientes.telefono THEN EXCLUDED.nombre ELSE clientes.nombre END,
             canal = 'qr'
         RETURNING id`,
        [nombreChat, telefonoChat, empresaQrId]
      );

      await pool.query(
        `INSERT INTO clientes_whatsapp_qr (empresa_id, cliente_id, whatsapp_qr_id, origen, updated_at)
         VALUES ($1, $2, $3, 'chat', NOW())
         ON CONFLICT (cliente_id, whatsapp_qr_id) DO UPDATE SET updated_at = NOW()`,
        [empresaQrId, clienteChat.rows[0].id, whatsappQrId]
      );
    } catch (err) {
      console.error("Error importando chat WhatsApp:", err);
    }
  }

  for (const msg of messages) {
    try {
      if (!msg.message) continue;

      const jid = msg.key.remoteJid;
      const jidAlt = msg.key.remoteJidAlt;

      if (!jid || jid === "status@broadcast") continue;
      if (jid.endsWith("@g.us")) continue;

      let telefono = "";

      if (jidAlt && jidAlt.endsWith("@s.whatsapp.net")) {
        telefono = jidAlt.replace("@s.whatsapp.net", "");
      } else if (jid.endsWith("@s.whatsapp.net")) {
        telefono = jid.replace("@s.whatsapp.net", "");
      } else if (jid.endsWith("@c.us")) {
        telefono = jid.replace("@c.us", "");
      } else if (
        msg.key.participant &&
        msg.key.participant.endsWith("@s.whatsapp.net")
      ) {
        telefono = msg.key.participant.replace("@s.whatsapp.net", "");
      } else if (jid.endsWith("@lid")) {
        const pnMapeado = telefonoPorLid.get(jid);
        if (pnMapeado?.endsWith("@s.whatsapp.net")) telefono = pnMapeado.replace("@s.whatsapp.net", "");
        else if (pnMapeado?.endsWith("@c.us")) telefono = pnMapeado.replace("@c.us", "");
        else if (/^\d+$/.test(pnMapeado || "")) telefono = pnMapeado;
        else continue;
      } else {
        continue;
      }

      const contenido =
        msg.message.ephemeralMessage?.message ||
        msg.message.viewOnceMessage?.message ||
        msg.message.documentWithCaptionMessage?.message ||
        msg.message;

      const texto =
        contenido.conversation ||
        contenido.extendedTextMessage?.text ||
        contenido.imageMessage?.caption ||
        contenido.videoMessage?.caption ||
        contenido.documentMessage?.caption ||
        contenido.buttonsResponseMessage?.selectedDisplayText ||
        contenido.listResponseMessage?.title ||
        contenido.templateButtonReplyMessage?.selectedDisplayText ||
        "";

      let tipoMensaje = 'text';
      let textoGuardado = texto;

      if (!textoGuardado) {
        if (contenido.audioMessage) { tipoMensaje = 'audio'; textoGuardado = '[Audio]'; }
        else if (contenido.imageMessage) { tipoMensaje = 'image'; textoGuardado = '[Imagen]'; }
        else if (contenido.videoMessage) { tipoMensaje = 'video'; textoGuardado = '[Video]'; }
        else if (contenido.documentMessage) { tipoMensaje = 'document'; textoGuardado = '[Documento]'; }
        else if (contenido.stickerMessage) { tipoMensaje = 'sticker'; textoGuardado = '[Sticker]'; }
        else if (contenido.locationMessage) { tipoMensaje = 'location'; textoGuardado = '[Ubicacion]'; }
        else if (contenido.contactMessage || contenido.contactsArrayMessage) { tipoMensaje = 'contact'; textoGuardado = '[Contacto]'; }
        else continue;
      }

      const esMio = msg.key.fromMe === true;

      let nombreCliente = telefono;

      if (!esMio && msg.pushName) {
        nombreCliente = msg.pushName;
      }

      const remitente = esMio ? "asesor" : "cliente";

      const fechaMensaje = msg.messageTimestamp
        ? new Date(Number(msg.messageTimestamp) * 1000)
        : new Date();

      const cliente = await pool.query(
        `
        INSERT INTO clientes (
          nombre,
          telefono,
          etapa,
          empresa_id,
          canal
        )
        VALUES ($1, $2, 'Nuevo', $4, 'qr')
        ON CONFLICT (empresa_id, telefono) DO UPDATE
        SET
          nombre = CASE
            WHEN $3 = false AND EXCLUDED.nombre <> clientes.telefono
            THEN EXCLUDED.nombre
            ELSE clientes.nombre
          END,
          canal = 'qr'
        RETURNING id
        `,
        [nombreCliente, telefono, esMio, empresaQrId]
      );

      const clienteId = cliente.rows[0].id;

  if (!esMio && tipoMensaje === "image" && mediaAnalisis) {
    const montoComprobante = extraerMontoComprobante(mediaAnalisis);

    if (montoComprobante !== null) {
      await pool.query(
        `
        UPDATE clientes
        SET bot_contexto = jsonb_set(
          COALESCE(bot_contexto, '{}'::jsonb),
          '{adelanto_detectado}',
          to_jsonb($2::numeric),
          true
        )
        WHERE id = $1
        `,
        [clienteId, montoComprobante]
      );

      console.log(
        "ADELANTO DETECTADO EN COMPROBANTE:",
        clienteId,
        montoComprobante
      );
    }
  }


      await pool.query(
        `INSERT INTO clientes_whatsapp_qr (empresa_id, cliente_id, whatsapp_qr_id, origen, updated_at)
         VALUES ($1, $2, $3, 'historial', NOW())
         ON CONFLICT (cliente_id, whatsapp_qr_id) DO UPDATE SET updated_at = NOW()`,
        [empresaQrId, clienteId, whatsappQrId]
      );

      await pool.query(
        `
        INSERT INTO conversaciones (
          cliente_id,
          telefono,
          whatsapp_message_id,
          mensaje,
          remitente,
          tipo,
          empresa_id,
          whatsapp_qr_id,
          canal,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'qr', $9)
        ON CONFLICT (whatsapp_message_id)
        WHERE whatsapp_message_id IS NOT NULL
        DO NOTHING
        `,
        [clienteId, telefono, msg.key.id || null, textoGuardado, remitente, tipoMensaje, empresaQrId, whatsappQrId, fechaMensaje]
      );

      console.log("Historial guardado:", telefono, textoGuardado);
    } catch (err) {
      console.error("Error guardando historial:", err);
    }
  }
});

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      qrActual = await qrcode.toDataURL(qr);
      estado = "qr_pendiente";
      console.log("QR generado");
    }

    if (connection === "open") {
      estado = "conectado";
      qrActual = null;
      console.log("WhatsApp conectado");
    }

    if (connection === "close") {
      estado = "desconectado";

      const statusCode = lastDisconnect?.error?.output?.statusCode;

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log("Conexion cerrada. Reintentando:", shouldReconnect);

      if (shouldReconnect) {
        iniciarWhatsApp();
      }
    }
  });

  const inicioBotUnix = Math.floor(Date.now() / 1000);

sock.ev.on("messages.update", async (updates = []) => {
  try {
    for (const item of updates || []) {
      const whatsappMessageId = item?.key?.id;
      const estadoWhatsApp = estadoDesdeWAMessageStatus(item?.update?.status);

      if (!whatsappMessageId || !estadoWhatsApp) continue;

      await actualizarEstadoMensajeWhatsApp(
        whatsappMessageId,
        estadoWhatsApp,
        new Date()
      );
    }
  } catch (error) {
    console.error(
      "ERROR ESTADO WHATSAPP messages.update:",
      error?.message || error
    );
  }
});

sock.ev.on("message-receipt.update", async (updates = []) => {
  try {
    for (const item of updates || []) {
      const whatsappMessageId = item?.key?.id;
      const receipt = item?.receipt || {};

      if (!whatsappMessageId) continue;

      const fechaPlayed = fechaDesdeTimestampWhatsApp(receipt?.playedTimestamp);
      const fechaRead = fechaDesdeTimestampWhatsApp(receipt?.readTimestamp);

      if (fechaPlayed) {
        await actualizarEstadoMensajeWhatsApp(
          whatsappMessageId,
          "reproducido",
          fechaPlayed
        );
        continue;
      }

      if (fechaRead) {
        await actualizarEstadoMensajeWhatsApp(
          whatsappMessageId,
          "leido",
          fechaRead
        );
      }
    }
  } catch (error) {
    console.error(
      "ERROR ESTADO WHATSAPP message-receipt.update:",
      error?.message || error
    );
  }
});

sock.ev.on("messages.upsert", async ({ messages, type }) => {
  if (type !== "notify") {
    console.log("HISTORIAL IGNORADO:", type);
    return;
  }
    for (const msg of messages) {

const timestampMensaje = Number(msg.messageTimestamp || 0);

if (timestampMensaje < inicioBotUnix) {
  console.log("MENSAJE ANTIGUO IGNORADO:", timestampMensaje);
  continue;
}

if (!msg.message) continue;

    const jid = msg.key.remoteJid;
const jidAlt = msg.key.remoteJidAlt;

if (!jid || jid === "status@broadcast") continue;

// Ignorar grupos
if (jid.endsWith("@g.us")) continue;

let telefono = "";

if (jidAlt && jidAlt.endsWith("@s.whatsapp.net")) {
  telefono = jidAlt.replace("@s.whatsapp.net", "");
} else if (jid.endsWith("@s.whatsapp.net")) {
  telefono = jid.replace("@s.whatsapp.net", "");
} else if (jid.endsWith("@c.us")) {
  telefono = jid.replace("@c.us", "");
} else if (
  msg.key.participant &&
  msg.key.participant.endsWith("@s.whatsapp.net")
) {
  telefono = msg.key.participant.replace("@s.whatsapp.net", "");
} else if (jid.endsWith("@lid")) {
  const pnMapeado = telefonoPorLidHistorial.get(jid);
  if (pnMapeado?.endsWith("@s.whatsapp.net")) telefono = pnMapeado.replace("@s.whatsapp.net", "");
  else if (pnMapeado?.endsWith("@c.us")) telefono = pnMapeado.replace("@c.us", "");
  else { console.log("LID sin telefono mapeado:", jid); continue; }
} else {
  console.log("No se pudo identificar el numero:", jid);
  continue;
}

console.log("JID RECIBIDO:", jid);
console.log("JID ALT:", jidAlt);
console.log("TELEFONO DETECTADO:", telefono);

    const contenido =
  msg.message.ephemeralMessage?.message ||
  msg.message.viewOnceMessage?.message ||
  msg.message.documentWithCaptionMessage?.message ||
  msg.message;

const texto =
  contenido.conversation ||
  contenido.extendedTextMessage?.text ||
  contenido.imageMessage?.caption ||
  contenido.videoMessage?.caption ||
  contenido.documentMessage?.caption ||
  contenido.buttonsResponseMessage?.selectedDisplayText ||
  contenido.listResponseMessage?.title ||
  contenido.templateButtonReplyMessage?.selectedDisplayText ||
  "";

let tipoMensaje = "text";
let textoGuardado = texto;

if (contenido.audioMessage) tipoMensaje = "audio";
else if (contenido.imageMessage) tipoMensaje = "image";
else if (contenido.videoMessage) tipoMensaje = "video";
else if (contenido.documentMessage) tipoMensaje = "document";
else if (contenido.stickerMessage) tipoMensaje = "sticker";
else if (contenido.locationMessage) tipoMensaje = "location";
else if (contenido.contactMessage || contenido.contactsArrayMessage) tipoMensaje = "contact";

if (!textoGuardado) {
  const etiquetas = { audio: "[Audio]", image: "[Imagen]", video: "[Video]", document: "[Documento]", sticker: "[Sticker]", location: "[Ubicacion]", contact: "[Contacto]" };
  textoGuardado = etiquetas[tipoMensaje] || "";
  if (!textoGuardado) { console.log("Mensaje sin contenido reconocido"); continue; }
}

const mediaContenido = contenido.imageMessage || contenido.videoMessage || contenido.audioMessage || contenido.documentMessage || contenido.stickerMessage || null;
let mediaId = null;
const mimeType = mediaContenido?.mimetype || null;
let filename = mediaContenido?.fileName || null;
let mediaAnalisis = null;

    console.log(JSON.stringify(msg, null, 2));

    try {
  const esMio = msg.key.fromMe === true;

  if (mediaContenido) {
    try {
      const extension = extensionMedia(mimeType || "");
      const baseId = String(msg.key.id || Date.now()).replace(/[^a-zA-Z0-9_-]/g, "_");
      mediaId = `${baseId}.${extension}`;
      const bufferMedia = await downloadMediaMessage(msg, "buffer", {});
      await writeFile(`${MEDIA_DIR}/${mediaId}`, bufferMedia);
      if (!filename) filename = mediaId;

      if (tipoMensaje === "audio" && !esMio) {
        try {
          mediaAnalisis = await transcribirAudio(`${MEDIA_DIR}/${mediaId}`);
          console.log("AUDIO TRANSCRITO:", mediaAnalisis);
        } catch (errorIA) {
          console.error("ERROR TRANSCRIBIENDO AUDIO:", errorIA?.message || errorIA);
          mediaAnalisis = null;
        }
      }

      if (tipoMensaje === "image" && !esMio) {
        try {
          mediaAnalisis = await analizarImagen(`${MEDIA_DIR}/${mediaId}`, mimeType || "image/jpeg");
          console.log("IMAGEN ANALIZADA:", mediaAnalisis);
        } catch (errorIA) {
          console.error("ERROR ANALIZANDO IMAGEN:", errorIA?.message || errorIA);
          mediaAnalisis = null;
        }
      }
      if (tipoMensaje === "video" && !esMio) {
        try {
          mediaAnalisis = await analizarVideo(MEDIA_DIR + "/" + mediaId);
          console.log("VIDEO ANALIZADO:", mediaAnalisis);
        } catch (errorIA) {
          console.error("ERROR ANALIZANDO VIDEO:", errorIA?.message || errorIA);
          mediaAnalisis = null;
        }
      }

      if (tipoMensaje === "document" && mimeType === "application/pdf" && !esMio) {
        try {
          mediaAnalisis = await analizarDocumento(`${MEDIA_DIR}/${mediaId}`, filename || "documento.pdf");
          console.log("PDF ANALIZADO");
        } catch (errorIA) {
          console.error("ERROR ANALIZANDO PDF:", errorIA?.message || errorIA);
          mediaAnalisis = null;
        }
      }
      console.log("MEDIA GUARDADO:", mediaId, mimeType);
    } catch (errorMedia) {
      console.error("ERROR DESCARGANDO MEDIA:", errorMedia?.message || errorMedia);
      mediaId = null;
    }
  }

const nombreCliente = !esMio && msg.pushName
  ? msg.pushName
  : telefono;

const remitente = esMio ? "asesor" : "cliente";
  const cliente = await pool.query(
    `
    INSERT INTO clientes (
  nombre,
  telefono,
  etapa,
  empresa_id,
  canal
)
VALUES ($1, $2, 'Nuevo', $4, 'qr')
ON CONFLICT (empresa_id, telefono) DO UPDATE
SET
  nombre = CASE
    WHEN $3 = false AND EXCLUDED.nombre <> clientes.telefono
    THEN EXCLUDED.nombre
    ELSE clientes.nombre
  END,
  ultima_gestion = NOW(),
  canal = 'qr'
RETURNING id
    `,
    [nombreCliente, telefono, esMio, empresaQrId]
  );

  const clienteId = cliente.rows[0].id;

  if (!esMio) {
    await cancelarSeguimientoSilencio(clienteId);
    console.log(
      "SEGUIMIENTO SILENCIO CANCELADO POR RESPUESTA CLIENTE:",
      clienteId
    );
  }

  await pool.query(
    `INSERT INTO clientes_whatsapp_qr (empresa_id, cliente_id, whatsapp_qr_id, origen, updated_at)
     VALUES ($1, $2, $3, 'mensaje', NOW())
     ON CONFLICT (cliente_id, whatsapp_qr_id) DO UPDATE SET updated_at = NOW()`,
    [empresaQrId, clienteId, whatsappQrId]
  );

  const mensajeGuardado = await pool.query(
  `
  INSERT INTO conversaciones (
    cliente_id,
    telefono,
    whatsapp_message_id,
    mensaje,
    remitente,
    tipo,
    empresa_id,
    whatsapp_qr_id,
    canal,
    media_id,
    mime_type,
    filename,
    media_analisis
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'qr', $9, $10, $11, $12)
  ON CONFLICT (whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL
  DO NOTHING
  RETURNING id
  `,
  [
    clienteId,
    telefono,
    msg.key.id || null,
    textoGuardado,
    remitente,
    tipoMensaje,
    empresaQrId,
    whatsappQrId,
    mediaId,
    mimeType,
    filename,
    mediaAnalisis,
  ]
);

if (mensajeGuardado.rowCount === 0) {
  console.log(
    "MENSAJE DUPLICADO IGNORADO:",
    msg.key.id
  );
  continue;
}

console.log("Mensaje guardado en PostgreSQL");

      const textoBot = [texto, mediaAnalisis ? `[ANALISIS INTERNO DEL ARCHIVO - NO ES TEXTO DEL CLIENTE]: ${mediaAnalisis}` : ""]
        .filter(Boolean)
        .join("\n\n");

      if (!esMio && textoBot) {
        const textoAccion = tipoMensaje === "audio" ? (mediaAnalisis || texto) : texto;
        const jidRespuesta = msg.key.remoteJidAlt || `${telefono}@s.whatsapp.net`;

        bufferMensajesBot.agregar(`${empresaQrId}:${clienteId}`, {
          idConversacion: mensajeGuardado.rows[0].id,
          clienteId,
          telefono,
          jidRespuesta,
          textoBot,
          textoAccion,
        });

        console.log("BUFFER BOT AGREGADO:", {
          clienteId,
          idConversacion: mensajeGuardado.rows[0].id,
          tipoMensaje,
        });
      }
    } catch (error) {
      console.error("Error guardando mensaje:", error);
    }
    }
  });
}

app.get("/media/:id", (req, res) => {
  const id = String(req.params.id || "");
  if (!/^[a-zA-Z0-9._-]+$/.test(id)) return res.status(400).json({ error: "Media invalido" });
  res.sendFile(id, { root: process.cwd() + "/auth/media" }, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: "Media no encontrado" });
  });
});

app.get("/qr", (req, res) => {
  res.json({
    estado,
    qr: qrActual,
    whatsapp_qr_id: whatsappQrId,
    empresa_id: empresaQrId,
  });
});

app.post("/sync-contacts", async (req, res) => {
  try {
    if (!sock) {
      return res.status(400).json({
        success: false,
        error: "WhatsApp no iniciado",
      });
    }

    if (estado !== "conectado") {
      return res.status(400).json({
        success: false,
        error: "WhatsApp no conectado",
      });
    }

    const resultado = await pool.query(`
      SELECT DISTINCT
        telefono,
        COALESCE(NULLIF(telefono, ''), telefono) AS nombre
      FROM conversaciones
      WHERE telefono IS NOT NULL
        AND telefono <> ''
        AND canal = 'qr'
    `);

    let contactosSincronizados = 0;

    for (const row of resultado.rows) {
      const telefono = String(row.telefono).replace(/\D/g, "");

      if (!telefono) continue;

      await pool.query(
        `
        INSERT INTO clientes (
          nombre,
          telefono,
          etapa,
          empresa_id,
          canal
        )
        VALUES ($1, $2, 'Nuevo', $3, 'qr')
        ON CONFLICT (empresa_id, telefono) DO UPDATE
        SET canal = 'qr'
        `,
        [row.nombre || telefono, telefono, empresaQrId]
      );

      contactosSincronizados++;
    }

    return res.json({
      success: true,
      contactos_sincronizados: contactosSincronizados,
    });
  } catch (error) {
    console.error("Error sincronizando contactos:", error);

    return res.status(500).json({
      success: false,
      error: "Error sincronizando contactos",
    });
  }
});
app.post("/send", async (req, res) => {
  try {
    const { telefono, mensaje } = req.body;

    if (!sock) {
      return res.status(400).json({ error: "WhatsApp no iniciado" });
    }

    await sock.sendMessage(`${telefono}@s.whatsapp.net`, {
  text: mensaje,
});

const cliente = await pool.query(
  `
  SELECT id FROM clientes
  WHERE telefono = $1
    AND empresa_id = $2
  LIMIT 1
  `,
  [telefono, empresaQrId]
);

if (cliente.rows.length > 0) {
  await cancelarSeguimientoSilencio(cliente.rows[0].id);
  console.log(
    "SEGUIMIENTO SILENCIO CANCELADO POR MENSAJE MANUAL:",
    cliente.rows[0].id
  );

  await pool.query(
    `
    INSERT INTO conversaciones (
      cliente_id,
      telefono,
      mensaje,
      remitente,
      tipo,
      empresa_id,
      whatsapp_qr_id,
      canal
    )
    VALUES ($1, $2, $3, 'asesor', 'text', $4, $5, 'qr')
    `,
    [cliente.rows[0].id, telefono, mensaje, empresaQrId, whatsappQrId]
  );
}

res.json({ success: true });
  } catch (error) {
    console.error("Error enviando mensaje:", error);
    res.status(500).json({ error: "Error enviando mensaje" });
  }
});

const PORT = process.env.PORT || 4001;

app.listen(PORT, async () => {
  console.log(`Servidor WhatsApp QR en puerto ${PORT}`);
  await cargarIntegracionQr();
  await iniciarWhatsApp();

  setInterval(() => {
    procesarSeguimientosExplicitos().catch((error) => {
      console.error(
        "ERROR INTERVALO SEGUIMIENTO EXPLICITO:",
        error?.message || error
      );
    });

    procesarSeguimientosSilencio().catch((error) => {
      console.error(
        "ERROR INTERVALO SEGUIMIENTO SILENCIO:",
        error?.message || error
      );
    });
  }, 60 * 1000);

  console.log("MOTOR SEGUIMIENTO SILENCIO ACTIVO");
});
