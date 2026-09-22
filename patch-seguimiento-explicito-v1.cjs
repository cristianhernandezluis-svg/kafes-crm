const fs = require("fs");

const files = {
  esquema: "app/whatsapp-qr-server/bot/esquema.mjs",
  prompt: "app/whatsapp-qr-server/bot/prompt.mjs",
  ia: "app/whatsapp-qr-server/bot/ia.mjs",
  server: "app/whatsapp-qr-server/server.mjs",
};

const src = Object.fromEntries(
  Object.entries(files).map(([k, p]) => [k, fs.readFileSync(p, "utf8")])
);

function fail(msg) {
  throw new Error(msg);
}

function replaceOnce(text, oldText, newText, label) {
  if (!text.includes(oldText)) fail(label);
  return text.replace(oldText, newText);
}

let esquema = src.esquema;
if (!esquema.includes("seguimiento_fecha:")) {
  esquema = replaceOnce(
    esquema,
    `  seguimiento_para: z.string().nullable(),\n  precio_acordado: z.number().nullable(),`,
    `  seguimiento_para: z.string().nullable(),\n  seguimiento_fecha: z.string().nullable(),\n  precio_acordado: z.number().nullable(),`,
    "ESQUEMA: no encontre seguimiento_para/precio_acordado"
  );
}

let ia = src.ia;
if (!ia.includes("function obtenerFechaHoraPeru()")) {
  const marker = `function prepararCatalogo() {`;
  if (!ia.includes(marker)) fail("IA: no encontre prepararCatalogo");

  const helper = `function obtenerFechaHoraPeru() {\n  const partes = new Intl.DateTimeFormat("en-CA", {\n    timeZone: "America/Lima",\n    year: "numeric",\n    month: "2-digit",\n    day: "2-digit",\n    hour: "2-digit",\n    minute: "2-digit",\n    second: "2-digit",\n    hourCycle: "h23",\n  }).formatToParts(new Date());\n\n  const valores = Object.fromEntries(\n    partes\n      .filter((p) => p.type !== "literal")\n      .map((p) => [p.type, p.value])\n  );\n\n  return \`\${valores.year}-\${valores.month}-\${valores.day}T\${valores.hour}:\${valores.minute}:\${valores.second}-05:00\`;\n}\n\n`;

  ia = ia.replace(marker, helper + marker);
}

if (!ia.includes("FECHA Y HORA ACTUAL EN PERU:")) {
  ia = replaceOnce(
    ia,
    `  const contexto = \`\nCATALOGO REAL:`,
    `  const fechaHoraPeru = obtenerFechaHoraPeru();\n\n  const contexto = \`\nFECHA Y HORA ACTUAL EN PERU:\n\${fechaHoraPeru}\nZona horaria: America/Lima (UTC-05:00)\n\nCATALOGO REAL:`,
    "IA: no encontre inicio de contexto"
  );
}

let prompt = src.prompt;
if (!prompt.includes('seguimiento_fecha = fecha/hora ISO 8601')) {
  prompt = replaceOnce(
    prompt,
    `- seguimiento = true;\n- seguimiento_para = conserva de forma breve el momento indicado por el cliente si existe, por ejemplo "mañana", "fin de mes", "cuando me paguen";\n- motivo_etapa explica brevemente por que necesita seguimiento.\nNo uses Seguimiento simplemente porque el cliente demora en responder.`,
    `- seguimiento = true;\n- seguimiento_para = conserva de forma breve el momento indicado por el cliente si existe, por ejemplo "mañana", "fin de mes", "cuando me paguen";\n- seguimiento_fecha = fecha/hora ISO 8601 con offset -05:00 cuando el momento pueda resolverse con seguridad usando FECHA Y HORA ACTUAL EN PERU.\n- motivo_etapa explica brevemente por que necesita seguimiento.\n\nREGLAS PARA seguimiento_fecha:\n- Nunca inventes una fecha pasada.\n- Si dice "mañana" sin hora, programa mañana a las 10:00:00-05:00.\n- Si dice "mañana a las 4", interpreta 16:00:00-05:00 salvo que el contexto indique claramente 4 a. m.\n- Si dice "en la mañana" sin hora, usa 10:00:00-05:00.\n- Si dice "en la tarde" sin hora, usa 15:00:00-05:00.\n- Si dice "en la noche" sin hora, usa 19:00:00-05:00.\n- Si dice un dia concreto como "viernes", resuelvelo contra la fecha actual y usa 10:00:00-05:00 si no dio hora.\n- Si dice "fin de mes", usa el ultimo dia del mes a las 10:00:00-05:00.\n- Si dice "en X minutos" o "en X horas", calcula la fecha/hora correspondiente desde FECHA Y HORA ACTUAL EN PERU.\n- Si el momento es demasiado ambiguo, por ejemplo "despues", "lo voy a pensar" o "cuando me paguen", seguimiento_fecha = null. El servidor aplicara un respaldo de 48 horas.\nNo uses Seguimiento simplemente porque el cliente demora en responder.`,
    "PROMPT: no encontre bloque Seguimiento"
  );
}

if (!prompt.includes("Si seguimiento = false, seguimiento_para = null y seguimiento_fecha = null.")) {
  prompt = replaceOnce(
    prompt,
    `- Si seguimiento = false, seguimiento_para = null.`,
    `- Si seguimiento = false, seguimiento_para = null y seguimiento_fecha = null.\n- Siempre devuelve seguimiento_fecha.`,
    "PROMPT: no encontre regla seguimiento=false"
  );
}

let server = src.server;

if (!server.includes("seguimiento_explicito_activo")) {
  const oldCancel = `async function cancelarSeguimientoSilencio(clienteId) {\n  await pool.query(\n    \`\n    UPDATE clientes\n    SET proximo_seguimiento = CASE\n          WHEN COALESCE(bot_contexto->>'seguimiento_silencio_activo', 'false') = 'true'\n          THEN NULL\n          ELSE proximo_seguimiento\n        END,\n        bot_contexto = jsonb_set(\n          jsonb_set(\n            COALESCE(bot_contexto, '{}'::jsonb),\n            '{seguimiento_silencio_activo}',\n            'false'::jsonb,\n            true\n          ),\n          '{seguimiento_silencio_intento}',\n          '0'::jsonb,\n          true\n        )\n    WHERE id = $1\n    \`,\n    [clienteId]\n  );\n}`;

  const newCancel = `async function cancelarSeguimientoSilencio(clienteId) {\n  await pool.query(\n    \`\n    UPDATE clientes\n    SET proximo_seguimiento = CASE\n          WHEN COALESCE(bot_contexto->>'seguimiento_silencio_activo', 'false') = 'true'\n            OR COALESCE(bot_contexto->>'seguimiento_explicito_activo', 'false') = 'true'\n          THEN NULL\n          ELSE proximo_seguimiento\n        END,\n        bot_contexto = COALESCE(bot_contexto, '{}'::jsonb) ||\n          jsonb_build_object(\n            'seguimiento_silencio_activo', false,\n            'seguimiento_silencio_intento', 0,\n            'seguimiento_explicito_activo', false,\n            'seguimiento_explicito_para', NULL\n          )\n    WHERE id = $1\n    \`,\n    [clienteId]\n  );\n}`;

  server = replaceOnce(
    server,
    oldCancel,
    newCancel,
    "SERVER: no encontre cancelarSeguimientoSilencio actual"
  );
}

if (!server.includes("async function programarSeguimientoExplicito(")) {
  const marker = `async function programarSeguimientoSilencio({`;
  if (!server.includes(marker)) fail("SERVER: no encontre programarSeguimientoSilencio");

  const block = `function resolverFechaSeguimientoExplicito(analisisCRM) {\n  const raw = String(analisisCRM?.seguimiento_fecha || "").trim();\n\n  if (raw) {\n    const fecha = new Date(raw);\n    const ahora = Date.now();\n    const maximo = ahora + 366 * 24 * 60 * 60 * 1000;\n\n    if (\n      Number.isFinite(fecha.getTime()) &&\n      fecha.getTime() > ahora + 30 * 1000 &&\n      fecha.getTime() <= maximo\n    ) {\n      return { fecha, origen: "ia" };\n    }\n  }\n\n  return {\n    fecha: new Date(Date.now() + 48 * 60 * 60 * 1000),\n    origen: "respaldo_48h",\n  };\n}\n\nasync function programarSeguimientoExplicito({\n  clienteId,\n  analisisCRM,\n  requiereCloserIA,\n}) {\n  if (requiereCloserIA === true) {\n    await cancelarSeguimientoSilencio(clienteId);\n    return;\n  }\n\n  const seguimientoPara = String(analisisCRM?.seguimiento_para || "").trim();\n  const { fecha, origen } = resolverFechaSeguimientoExplicito(analisisCRM);\n\n  const result = await pool.query(\n    \`\n    UPDATE clientes\n    SET etapa = CASE\n          WHEN etapa IN ('Nuevo', 'Interesado', 'Calificado', 'Seguimiento')\n          THEN 'Seguimiento'\n          ELSE etapa\n        END,\n        proximo_seguimiento = $2,\n        bot_contexto = COALESCE(bot_contexto, '{}'::jsonb) ||\n          jsonb_build_object(\n            'seguimiento_silencio_activo', false,\n            'seguimiento_silencio_intento', 0,\n            'seguimiento_explicito_activo', true,\n            'seguimiento_explicito_para', NULLIF($3, '')\n          )\n    WHERE id = $1\n      AND bot_activo = true\n      AND COALESCE(requiere_closer, false) = false\n      AND etapa NOT IN (\n        'Pago por validar',\n        'Pagó Adelanto',\n        'Enviado',\n        'Entregado',\n        'Descartado'\n      )\n    RETURNING id\n    \`,\n    [clienteId, fecha, seguimientoPara]\n  );\n\n  if (result.rowCount > 0) {\n    console.log(\n      "SEGUIMIENTO EXPLICITO PROGRAMADO:",\n      clienteId,\n      fecha.toISOString(),\n      "ORIGEN:",\n      origen,\n      "PARA:",\n      seguimientoPara || "sin detalle"\n    );\n  }\n}\n\nfunction mensajeSeguimientoExplicito() {\n  return "Hola 👋 Quedamos en retomar tu consulta por estas horas. ¿Deseas continuar con tu pedido?";\n}\n\nlet seguimientoExplicitoEnCurso = false;\n\nasync function procesarSeguimientosExplicitos() {\n  if (seguimientoExplicitoEnCurso) return;\n  if (!sock || estado !== "conectado" || !empresaQrId || !whatsappQrId) return;\n\n  seguimientoExplicitoEnCurso = true;\n\n  try {\n    const pendientes = await pool.query(\n      \`\n      SELECT\n        c.id,\n        c.telefono,\n        c.etapa,\n        c.bot_contexto->>'seguimiento_explicito_para' AS seguimiento_para,\n        ult.remitente AS ultimo_remitente\n      FROM clientes c\n      JOIN clientes_whatsapp_qr cwq\n        ON cwq.cliente_id = c.id\n       AND cwq.empresa_id = c.empresa_id\n       AND cwq.whatsapp_qr_id = $2\n      LEFT JOIN LATERAL (\n        SELECT conv.remitente\n        FROM conversaciones conv\n        WHERE conv.cliente_id = c.id\n          AND conv.whatsapp_qr_id = $2\n        ORDER BY conv.created_at DESC, conv.id DESC\n        LIMIT 1\n      ) ult ON true\n      WHERE c.empresa_id = $1\n        AND c.proximo_seguimiento IS NOT NULL\n        AND c.proximo_seguimiento <= NOW()\n        AND COALESCE(c.bot_contexto->>'seguimiento_explicito_activo', 'false') = 'true'\n        AND c.bot_activo = true\n        AND COALESCE(c.requiere_closer, false) = false\n        AND (c.humano_hasta IS NULL OR c.humano_hasta <= NOW())\n        AND c.etapa NOT IN (\n          'Pago por validar',\n          'Pagó Adelanto',\n          'Enviado',\n          'Entregado',\n          'Descartado'\n        )\n      ORDER BY c.proximo_seguimiento ASC\n      LIMIT 20\n      \`,\n      [empresaQrId, whatsappQrId]\n    );\n\n    for (const cliente of pendientes.rows) {\n      try {\n        const clienteId = Number(cliente.id);\n        const telefono = String(cliente.telefono || "").replace(/\\D/g, "");\n\n        if (!clienteId || !telefono) {\n          if (clienteId) await cancelarSeguimientoSilencio(clienteId);\n          continue;\n        }\n\n        if (cliente.ultimo_remitente !== "bot") {\n          await cancelarSeguimientoSilencio(clienteId);\n          console.log(\n            "SEGUIMIENTO EXPLICITO CANCELADO POR NUEVA INTERACCION:",\n            clienteId,\n            cliente.ultimo_remitente || "sin remitente"\n          );\n          continue;\n        }\n\n        const mensaje = mensajeSeguimientoExplicito();\n        const jid = \`\${telefono}@s.whatsapp.net\`;\n        const enviado = await sock.sendMessage(jid, { text: mensaje });\n\n        await pool.query(\n          \`\n          INSERT INTO conversaciones (\n            cliente_id,\n            telefono,\n            whatsapp_message_id,\n            mensaje,\n            remitente,\n            tipo,\n            empresa_id,\n            whatsapp_qr_id,\n            canal\n          )\n          VALUES ($1, $2, $3, $4, 'bot', 'text', $5, $6, 'qr')\n          ON CONFLICT (whatsapp_message_id)\n          WHERE whatsapp_message_id IS NOT NULL\n          DO UPDATE SET\n            mensaje = EXCLUDED.mensaje,\n            remitente = 'bot'\n          \`,\n          [\n            clienteId,\n            telefono,\n            enviado?.key?.id || null,\n            mensaje,\n            empresaQrId,\n            whatsappQrId,\n          ]\n        );\n\n        const siguienteSilencio = fechaDesdeAhora(FOLLOWUP_1_MIN * 60 * 1000);\n\n        await pool.query(\n          \`\n          UPDATE clientes\n          SET proximo_seguimiento = $2,\n              cantidad_seguimientos = COALESCE(cantidad_seguimientos, 0) + 1,\n              bot_contexto = COALESCE(bot_contexto, '{}'::jsonb) ||\n                jsonb_build_object(\n                  'seguimiento_explicito_activo', false,\n                  'seguimiento_explicito_para', NULL,\n                  'seguimiento_silencio_activo', true,\n                  'seguimiento_silencio_intento', 0\n                )\n          WHERE id = $1\n          \`,\n          [clienteId, siguienteSilencio]\n        );\n\n        console.log(\n          "SEGUIMIENTO EXPLICITO ENVIADO:",\n          clienteId,\n          "SIGUIENTE SILENCIO:",\n          siguienteSilencio.toISOString()\n        );\n      } catch (errorCliente) {\n        console.error(\n          "ERROR SEGUIMIENTO EXPLICITO CLIENTE:",\n          cliente?.id,\n          errorCliente?.message || errorCliente\n        );\n      }\n    }\n  } catch (error) {\n    console.error(\n      "ERROR MOTOR SEGUIMIENTO EXPLICITO:",\n      error?.message || error\n    );\n  } finally {\n    seguimientoExplicitoEnCurso = false;\n  }\n}\n\n`;

  server = server.replace(marker, block + marker);
}

if (!server.includes("await programarSeguimientoExplicito({")) {
  const oldBlock = `  if (\n    requiereCloserIA === true ||\n    analisisCRM?.seguimiento === true\n  ) {\n    await pool.query(\n      \`\n      UPDATE clientes\n      SET bot_contexto = jsonb_set(\n            jsonb_set(\n              COALESCE(bot_contexto, '{}'::jsonb),\n              '{seguimiento_silencio_activo}',\n              'false'::jsonb,\n              true\n            ),\n            '{seguimiento_silencio_intento}',\n            '0'::jsonb,\n            true\n          )\n      WHERE id = $1\n      \`,\n      [clienteId]\n    );\n    return;\n  }`;

  const newBlock = `  if (analisisCRM?.seguimiento === true) {\n    await programarSeguimientoExplicito({\n      clienteId,\n      analisisCRM,\n      requiereCloserIA,\n    });\n    return;\n  }\n\n  if (requiereCloserIA === true) {\n    await cancelarSeguimientoSilencio(clienteId);\n    return;\n  }`;

  server = replaceOnce(
    server,
    oldBlock,
    newBlock,
    "SERVER: no encontre bloque seguimiento/closer actual"
  );
}

if (!server.includes("ERROR INTERVALO SEGUIMIENTO EXPLICITO")) {
  const oldInterval = `  setInterval(() => {\n    procesarSeguimientosSilencio().catch((error) => {\n      console.error(\n        "ERROR INTERVALO SEGUIMIENTO SILENCIO:",\n        error?.message || error\n      );\n    });\n  }, 60 * 1000);`;

  const newInterval = `  setInterval(() => {\n    procesarSeguimientosExplicitos().catch((error) => {\n      console.error(\n        "ERROR INTERVALO SEGUIMIENTO EXPLICITO:",\n        error?.message || error\n      );\n    });\n\n    procesarSeguimientosSilencio().catch((error) => {\n      console.error(\n        "ERROR INTERVALO SEGUIMIENTO SILENCIO:",\n        error?.message || error\n      );\n    });\n  }, 60 * 1000);`;

  server = replaceOnce(
    server,
    oldInterval,
    newInterval,
    "SERVER: no encontre intervalo de seguimiento actual"
  );
}

if (!esquema.includes("seguimiento_fecha:")) fail("VALIDACION: falta seguimiento_fecha en esquema");
if (!ia.includes("FECHA Y HORA ACTUAL EN PERU:")) fail("VALIDACION: falta fecha Peru en IA");
if (!prompt.includes("Siempre devuelve seguimiento_fecha.")) fail("VALIDACION: falta regla seguimiento_fecha");
if (!server.includes("async function procesarSeguimientosExplicitos()")) fail("VALIDACION: falta motor explicito");
if (!server.includes("SEGUIMIENTO EXPLICITO PROGRAMADO:")) fail("VALIDACION: falta log programado");
if (!server.includes("SEGUIMIENTO EXPLICITO ENVIADO:")) fail("VALIDACION: falta log enviado");

fs.writeFileSync(files.esquema, esquema, "utf8");
fs.writeFileSync(files.prompt, prompt, "utf8");
fs.writeFileSync(files.ia, ia, "utf8");
fs.writeFileSync(files.server, server, "utf8");

console.log("ESQUEMA: seguimiento_fecha agregado");
console.log("IA: fecha/hora de Peru agregada");
console.log("PROMPT: reglas de seguimiento explicito agregadas");
console.log("SERVER: motor explicito integrado con motor de silencio");
console.log("PATCH SEGUIMIENTO EXPLICITO V1 OK");
