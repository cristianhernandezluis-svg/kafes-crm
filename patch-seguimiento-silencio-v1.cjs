const fs = require("fs");

const path = "app/whatsapp-qr-server/server.mjs";
let s = fs.readFileSync(path, "utf8");

function requireOnce(needle, label) {
  if (!s.includes(needle)) throw new Error(label);
}

/* 1) Motor persistente de seguimiento por silencio */
if (!s.includes("async function procesarSeguimientosSilencio()")) {
  const marker = "async function procesarLoteBot(lote) {";
  requireOnce(marker, "SERVER: no encontre procesarLoteBot");

  const block = `
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
    \`
    UPDATE clientes
    SET proximo_seguimiento = NULL,
        bot_contexto = jsonb_set(
          jsonb_set(
            COALESCE(bot_contexto, '{}'::jsonb),
            '{seguimiento_silencio_activo}',
            'false'::jsonb,
            true
          ),
          '{seguimiento_silencio_intento}',
          '0'::jsonb,
          true
        )
    WHERE id = $1
    \`,
    [clienteId]
  );
}

async function programarSeguimientoSilencio({
  clienteId,
  analisisCRM,
  requiereCloserIA,
}) {
  if (
    requiereCloserIA === true ||
    analisisCRM?.seguimiento === true
  ) {
    await cancelarSeguimientoSilencio(clienteId);
    return;
  }

  const proximaFecha = fechaDesdeAhora(FOLLOWUP_1_MIN * 60 * 1000);

  const result = await pool.query(
    \`
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
    \`,
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
      \`
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
      \`,
      [empresaQrId, whatsappQrId]
    );

    for (const cliente of pendientes.rows) {
      try {
        const clienteId = Number(cliente.id);
        const telefono = String(cliente.telefono || "").replace(/\\D/g, "");
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
            \`
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
            \`,
            [clienteId]
          );

          console.log("SEGUIMIENTO SILENCIO FINALIZADO -> NO RESPONDE:", clienteId);
          continue;
        }

        const mensaje = mensajeSeguimientoSilencio(intento);
        const jid = \`\${telefono}@s.whatsapp.net\`;

        const enviado = await sock.sendMessage(jid, { text: mensaje });

        await pool.query(
          \`
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
          \`,
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
          \`
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
          \`,
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

`;

  s = s.replace(marker, block + marker);
  console.log("SERVER: motor de seguimiento por silencio agregado");
} else {
  console.log("SERVER: motor de seguimiento ya estaba");
}

/* 2) Cancelar seguimiento apenas responde el cliente */
if (!s.includes("SEGUIMIENTO SILENCIO CANCELADO POR RESPUESTA CLIENTE")) {
  const marker = `  const clienteId = cliente.rows[0].id;

  await pool.query(
    \`INSERT INTO clientes_whatsapp_qr`;

  requireOnce(marker, "SERVER: no encontre clienteId antes de clientes_whatsapp_qr");

  const replacement = `  const clienteId = cliente.rows[0].id;

  if (!esMio) {
    await cancelarSeguimientoSilencio(clienteId);
    console.log(
      "SEGUIMIENTO SILENCIO CANCELADO POR RESPUESTA CLIENTE:",
      clienteId
    );
  }

  await pool.query(
    \`INSERT INTO clientes_whatsapp_qr`;

  s = s.replace(marker, replacement);
  console.log("SERVER: cancelacion al responder agregada");
} else {
  console.log("SERVER: cancelacion al responder ya estaba");
}

/* 3) Programar el primer seguimiento solo después de que el BOT realmente envía */
if (!s.includes("await programarSeguimientoSilencio({")) {
  const marker = `  await pool.query(
    \`
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
    \`,
    [
      clienteId,
      telefono,
      enviadoBot?.key?.id || null,
      respuestaBot.mensaje,
      empresaQrId,
      whatsappQrId,
    ]
  );`;

  requireOnce(marker, "SERVER: no encontre INSERT de respuesta BOT");

  const replacement = `${marker}

  await programarSeguimientoSilencio({
    clienteId,
    analisisCRM,
    requiereCloserIA,
  });`;

  s = s.replace(marker, replacement);
  console.log("SERVER: programacion despues de respuesta BOT agregada");
} else {
  console.log("SERVER: programacion despues de BOT ya estaba");
}

/* 4) Un mensaje manual del asesor cancela la secuencia automática */
if (!s.includes("SEGUIMIENTO SILENCIO CANCELADO POR MENSAJE MANUAL")) {
  const marker = `if (cliente.rows.length > 0) {
  await pool.query(
    \`
    INSERT INTO conversaciones (`;

  requireOnce(marker, "SERVER: no encontre bloque /send cliente");

  const replacement = `if (cliente.rows.length > 0) {
  await cancelarSeguimientoSilencio(cliente.rows[0].id);
  console.log(
    "SEGUIMIENTO SILENCIO CANCELADO POR MENSAJE MANUAL:",
    cliente.rows[0].id
  );

  await pool.query(
    \`
    INSERT INTO conversaciones (`;

  s = s.replace(marker, replacement);
  console.log("SERVER: cancelacion por mensaje manual agregada");
} else {
  console.log("SERVER: cancelacion por mensaje manual ya estaba");
}

/* 5) Arrancar reloj de seguimiento una sola vez al iniciar el servidor */
if (!s.includes("MOTOR SEGUIMIENTO SILENCIO ACTIVO")) {
  const marker = `app.listen(PORT, async () => {
  console.log(\`Servidor WhatsApp QR en puerto \${PORT}\`);
  await cargarIntegracionQr();
  await iniciarWhatsApp();
});`;

  requireOnce(marker, "SERVER: no encontre app.listen final");

  const replacement = `app.listen(PORT, async () => {
  console.log(\`Servidor WhatsApp QR en puerto \${PORT}\`);
  await cargarIntegracionQr();
  await iniciarWhatsApp();

  setInterval(() => {
    procesarSeguimientosSilencio().catch((error) => {
      console.error(
        "ERROR INTERVALO SEGUIMIENTO SILENCIO:",
        error?.message || error
      );
    });
  }, 60 * 1000);

  console.log("MOTOR SEGUIMIENTO SILENCIO ACTIVO");
});`;

  s = s.replace(marker, replacement);
  console.log("SERVER: reloj de seguimiento agregado");
} else {
  console.log("SERVER: reloj de seguimiento ya estaba");
}

fs.writeFileSync(path, s, "utf8");
console.log("PATCH SEGUIMIENTO SILENCIO V1 OK");
