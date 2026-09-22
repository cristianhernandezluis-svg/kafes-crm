const fs = require("fs");
const path = require("path");

const root = process.cwd();

const serverFile = path.join(
  root,
  "app",
  "whatsapp-qr-server",
  "server.mjs"
);

const flujoFile = path.join(
  root,
  "app",
  "whatsapp-qr-server",
  "bot",
  "flujos.mjs"
);

const serverBackup =
  serverFile + ".backup-flujos-primer-contacto";

if (!fs.existsSync(serverFile)) {
  console.error("No existe:", serverFile);
  process.exit(1);
}

let server = fs
  .readFileSync(serverFile, "utf8")
  .replace(/\r\n/g, "\n");

if (server.includes("procesarFlujoCliente")) {
  console.log(
    "server.mjs ya parece tener el motor de flujos. No se aplicaron cambios."
  );
  process.exit(0);
}

fs.copyFileSync(serverFile, serverBackup);

function replaceOnce(oldText, newText, label) {
  if (!server.includes(oldText)) {
    console.error("No encontre el bloque:", label);
    console.error("Backup:", serverBackup);
    process.exit(1);
  }

  server = server.replace(oldText, newText);
}

const flujoModule = "import {\n  mkdir,\n  writeFile,\n} from \"fs/promises\";\n\nfunction dormir(ms) {\n  return new Promise((resolve) =>\n    setTimeout(resolve, ms)\n  );\n}\n\nfunction numeroSeguro(valor, fallback = 0) {\n  const numero = Number(valor);\n\n  return Number.isFinite(numero)\n    ? numero\n    : fallback;\n}\n\nfunction extensionDesdeMime(\n  mimeType,\n  tipo\n) {\n  const mime = String(\n    mimeType || \"\"\n  ).toLowerCase();\n\n  if (mime.includes(\"png\")) return \"png\";\n  if (mime.includes(\"webp\")) return \"webp\";\n  if (mime.includes(\"gif\")) return \"gif\";\n  if (mime.includes(\"jpeg\")) return \"jpg\";\n  if (mime.includes(\"jpg\")) return \"jpg\";\n  if (mime.includes(\"mp4\")) return \"mp4\";\n  if (mime.includes(\"webm\")) return \"webm\";\n  if (mime.includes(\"quicktime\")) return \"mov\";\n\n  return tipo === \"video\"\n    ? \"mp4\"\n    : \"jpg\";\n}\n\nasync function guardarTextoBot({\n  pool,\n  clienteId,\n  telefono,\n  empresaId,\n  whatsappQrId,\n  enviado,\n  texto,\n}) {\n  await pool.query(\n    `\n    INSERT INTO conversaciones (\n      cliente_id,\n      telefono,\n      whatsapp_message_id,\n      mensaje,\n      remitente,\n      tipo,\n      empresa_id,\n      whatsapp_qr_id,\n      estado_whatsapp,\n      enviado_at,\n      canal\n    )\n    VALUES (\n      $1, $2, $3, $4,\n      'bot', 'text',\n      $5, $6,\n      'enviado', NOW(), 'qr'\n    )\n    ON CONFLICT (whatsapp_message_id)\n    WHERE whatsapp_message_id IS NOT NULL\n    DO NOTHING\n    `,\n    [\n      clienteId,\n      telefono,\n      enviado?.key?.id || null,\n      texto,\n      empresaId,\n      whatsappQrId,\n    ]\n  );\n}\n\nasync function enviarTexto({\n  pool,\n  sock,\n  jidRespuesta,\n  clienteId,\n  telefono,\n  empresaId,\n  whatsappQrId,\n  texto,\n}) {\n  const limpio = String(\n    texto || \"\"\n  ).trim();\n\n  if (!limpio) return;\n\n  const enviado =\n    await sock.sendMessage(\n      jidRespuesta,\n      {\n        text: limpio,\n      }\n    );\n\n  await guardarTextoBot({\n    pool,\n    clienteId,\n    telefono,\n    empresaId,\n    whatsappQrId,\n    enviado,\n    texto: limpio,\n  });\n}\n\nasync function enviarMultimedia({\n  pool,\n  sock,\n  jidRespuesta,\n  clienteId,\n  telefono,\n  empresaId,\n  whatsappQrId,\n  mediaDir,\n  url,\n  tipo,\n}) {\n  const archivo = String(\n    url || \"\"\n  ).trim();\n\n  if (!archivo) return;\n\n  const response =\n    await fetch(archivo);\n\n  if (!response.ok) {\n    throw new Error(\n      `HTTP ${response.status} descargando multimedia del flujo`\n    );\n  }\n\n  const mimeType =\n    response.headers\n      .get(\"content-type\")\n      ?.split(\";\")[0] ||\n    (tipo === \"video\"\n      ? \"video/mp4\"\n      : \"image/jpeg\");\n\n  const buffer = Buffer.from(\n    await response.arrayBuffer()\n  );\n\n  let enviado;\n\n  if (tipo === \"video\") {\n    enviado =\n      await sock.sendMessage(\n        jidRespuesta,\n        {\n          video: buffer,\n          mimetype: mimeType,\n        }\n      );\n  } else {\n    enviado =\n      await sock.sendMessage(\n        jidRespuesta,\n        {\n          image: buffer,\n          mimetype: mimeType,\n        }\n      );\n  }\n\n  await mkdir(\n    mediaDir,\n    {\n      recursive: true,\n    }\n  );\n\n  const extension =\n    extensionDesdeMime(\n      mimeType,\n      tipo\n    );\n\n  const mediaId =\n    `flujo-${Date.now()}-${Math.random()\n      .toString(36)\n      .slice(2, 8)}.${extension}`;\n\n  await writeFile(\n    `${mediaDir}/${mediaId}`,\n    buffer\n  );\n\n  await pool.query(\n    `\n    INSERT INTO conversaciones (\n      cliente_id,\n      telefono,\n      whatsapp_message_id,\n      mensaje,\n      remitente,\n      tipo,\n      empresa_id,\n      whatsapp_qr_id,\n      canal,\n      media_id,\n      mime_type,\n      estado_whatsapp,\n      enviado_at\n    )\n    VALUES (\n      $1, $2, $3, $4,\n      'bot', $5,\n      $6, $7, 'qr',\n      $8, $9,\n      'enviado', NOW()\n    )\n    ON CONFLICT (whatsapp_message_id)\n    WHERE whatsapp_message_id IS NOT NULL\n    DO NOTHING\n    `,\n    [\n      clienteId,\n      telefono,\n      enviado?.key?.id || null,\n      tipo === \"video\"\n        ? \"[Video]\"\n        : \"[Imagen]\",\n      tipo,\n      empresaId,\n      whatsappQrId,\n      mediaId,\n      mimeType,\n    ]\n  );\n}\n\nasync function ejecutarContenidosMensaje({\n  pool,\n  sock,\n  jidRespuesta,\n  clienteId,\n  telefono,\n  empresaId,\n  whatsappQrId,\n  mediaDir,\n  config,\n}) {\n  if (\n    config?.tipoMensaje ===\n    \"webchat\"\n  ) {\n    return;\n  }\n\n  const contenidos =\n    Array.isArray(\n      config?.contenidos\n    )\n      ? config.contenidos\n      : [];\n\n  for (\n    const contenido of contenidos\n  ) {\n    const tipo = String(\n      contenido?.tipo || \"\"\n    );\n\n    if (tipo === \"texto\") {\n      await enviarTexto({\n        pool,\n        sock,\n        jidRespuesta,\n        clienteId,\n        telefono,\n        empresaId,\n        whatsappQrId,\n        texto:\n          contenido?.texto || \"\",\n      });\n\n      continue;\n    }\n\n    if (\n      tipo === \"imagen\" ||\n      tipo === \"video\"\n    ) {\n      await enviarMultimedia({\n        pool,\n        sock,\n        jidRespuesta,\n        clienteId,\n        telefono,\n        empresaId,\n        whatsappQrId,\n        mediaDir,\n        url:\n          contenido?.url || \"\",\n        tipo,\n      });\n\n      continue;\n    }\n\n    if (\n      tipo === \"escribiendo\"\n    ) {\n      const segundos =\n        Math.min(\n          10,\n          Math.max(\n            0.5,\n            numeroSeguro(\n              contenido?.segundos,\n              1.5\n            )\n          )\n        );\n\n      try {\n        await sock\n          ?.sendPresenceUpdate?.(\n            \"composing\",\n            jidRespuesta\n          );\n      } catch {}\n\n      await dormir(\n        segundos * 1000\n      );\n\n      try {\n        await sock\n          ?.sendPresenceUpdate?.(\n            \"paused\",\n            jidRespuesta\n          );\n      } catch {}\n\n      continue;\n    }\n\n    if (\n      tipo === \"boton\" ||\n      tipo ===\n        \"respuesta_rapida\"\n    ) {\n      // En WhatsApp QR/Baileys usamos\n      // texto como fallback estable.\n      await enviarTexto({\n        pool,\n        sock,\n        jidRespuesta,\n        clienteId,\n        telefono,\n        empresaId,\n        whatsappQrId,\n        texto:\n          contenido?.texto || \"\",\n      });\n    }\n  }\n}\n\nfunction construirSiguiente(\n  conexiones\n) {\n  const mapa = new Map();\n\n  for (\n    const conexion of conexiones\n  ) {\n    if (\n      !mapa.has(\n        conexion.source_uid\n      )\n    ) {\n      mapa.set(\n        conexion.source_uid,\n        conexion.target_uid\n      );\n    }\n  }\n\n  return mapa;\n}\n\nasync function cargarFlujo(\n  pool,\n  {\n    empresaId,\n    flujoId,\n  }\n) {\n  const flujoResult =\n    await pool.query(\n      `\n      SELECT\n        id,\n        nombre,\n        slug,\n        producto_slug\n      FROM flujos_bot\n      WHERE id = $1\n        AND empresa_id = $2\n        AND activo = true\n      LIMIT 1\n      `,\n      [\n        flujoId,\n        empresaId,\n      ]\n    );\n\n  if (\n    flujoResult.rowCount === 0\n  ) {\n    return null;\n  }\n\n  const nodosResult =\n    await pool.query(\n      `\n      SELECT\n        nodo_uid,\n        tipo,\n        posicion_x,\n        posicion_y,\n        config\n      FROM flujo_nodos\n      WHERE flujo_id = $1\n      ORDER BY id ASC\n      `,\n      [flujoId]\n    );\n\n  const conexionesResult =\n    await pool.query(\n      `\n      SELECT\n        source_uid,\n        target_uid,\n        source_handle,\n        target_handle,\n        config\n      FROM flujo_conexiones\n      WHERE flujo_id = $1\n      ORDER BY id ASC\n      `,\n      [flujoId]\n    );\n\n  return {\n    flujo:\n      flujoResult.rows[0],\n    nodos:\n      nodosResult.rows,\n    conexiones:\n      conexionesResult.rows,\n  };\n}\n\nasync function actualizarEstado(\n  pool,\n  {\n    clienteId,\n    whatsappQrId,\n    estado,\n    nodoUid,\n    completar = false,\n  }\n) {\n  await pool.query(\n    `\n    UPDATE clientes_whatsapp_qr\n    SET\n      flujo_estado = $3,\n      flujo_nodo_uid = $4,\n      flujo_iniciado_at =\n        COALESCE(\n          flujo_iniciado_at,\n          NOW()\n        ),\n      flujo_completado_at =\n        CASE\n          WHEN $5 = true\n          THEN NOW()\n          ELSE flujo_completado_at\n        END,\n      updated_at = NOW()\n    WHERE cliente_id = $1\n      AND whatsapp_qr_id = $2\n    `,\n    [\n      clienteId,\n      whatsappQrId,\n      estado,\n      nodoUid || null,\n      completar,\n    ]\n  );\n}\n\nexport async function prepararEsquemaFlujos(\n  pool\n) {\n  await pool.query(\n    `\n    CREATE TABLE IF NOT EXISTS flujos_bot (\n      id SERIAL PRIMARY KEY,\n      empresa_id INTEGER NOT NULL,\n      nombre TEXT NOT NULL,\n      slug TEXT,\n      producto_slug TEXT,\n      activo BOOLEAN NOT NULL DEFAULT true,\n      created_at TIMESTAMP NOT NULL DEFAULT NOW(),\n      updated_at TIMESTAMP NOT NULL DEFAULT NOW()\n    );\n\n    CREATE UNIQUE INDEX IF NOT EXISTS\n      flujos_bot_empresa_slug_uq\n    ON flujos_bot(\n      empresa_id,\n      slug\n    )\n    WHERE slug IS NOT NULL;\n\n    CREATE TABLE IF NOT EXISTS flujo_nodos (\n      id SERIAL PRIMARY KEY,\n      flujo_id INTEGER NOT NULL\n        REFERENCES flujos_bot(id)\n        ON DELETE CASCADE,\n      nodo_uid TEXT NOT NULL,\n      tipo TEXT NOT NULL,\n      posicion_x DOUBLE PRECISION NOT NULL DEFAULT 0,\n      posicion_y DOUBLE PRECISION NOT NULL DEFAULT 0,\n      config JSONB NOT NULL DEFAULT '{}'::jsonb,\n      created_at TIMESTAMP NOT NULL DEFAULT NOW(),\n      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),\n      UNIQUE(\n        flujo_id,\n        nodo_uid\n      )\n    );\n\n    CREATE TABLE IF NOT EXISTS flujo_conexiones (\n      id SERIAL PRIMARY KEY,\n      flujo_id INTEGER NOT NULL\n        REFERENCES flujos_bot(id)\n        ON DELETE CASCADE,\n      conexion_uid TEXT NOT NULL,\n      source_uid TEXT NOT NULL,\n      target_uid TEXT NOT NULL,\n      source_handle TEXT,\n      target_handle TEXT,\n      config JSONB NOT NULL DEFAULT '{}'::jsonb,\n      created_at TIMESTAMP NOT NULL DEFAULT NOW(),\n      UNIQUE(\n        flujo_id,\n        conexion_uid\n      )\n    );\n    `\n  );\n\n  await pool.query(\n    `\n    ALTER TABLE grupos_distribucion\n      ADD COLUMN IF NOT EXISTS\n        flujo_id INTEGER\n        REFERENCES flujos_bot(id)\n        ON DELETE SET NULL;\n    `\n  );\n\n  await pool.query(\n    `\n    ALTER TABLE clientes_whatsapp_qr\n      ADD COLUMN IF NOT EXISTS\n        distribucion_flujo_id INTEGER,\n      ADD COLUMN IF NOT EXISTS\n        flujo_estado TEXT DEFAULT 'sin_iniciar',\n      ADD COLUMN IF NOT EXISTS\n        flujo_nodo_uid TEXT,\n      ADD COLUMN IF NOT EXISTS\n        flujo_iniciado_at TIMESTAMPTZ,\n      ADD COLUMN IF NOT EXISTS\n        flujo_completado_at TIMESTAMPTZ;\n    `\n  );\n}\n\nexport async function procesarFlujoCliente({\n  pool,\n  sock,\n  empresaId,\n  whatsappQrId,\n  clienteId,\n  telefono,\n  jidRespuesta,\n  mediaDir = \"./auth/media\",\n}) {\n  const estadoResult =\n    await pool.query(\n      `\n      SELECT\n        distribucion_flujo_id,\n        flujo_estado,\n        flujo_nodo_uid\n      FROM clientes_whatsapp_qr\n      WHERE cliente_id = $1\n        AND whatsapp_qr_id = $2\n      LIMIT 1\n      `,\n      [\n        clienteId,\n        whatsappQrId,\n      ]\n    );\n\n  if (\n    estadoResult.rowCount === 0\n  ) {\n    return {\n      consumido: false,\n      botActivado: false,\n      motivo: \"sin_estado\",\n    };\n  }\n\n  const estado =\n    estadoResult.rows[0];\n\n  const flujoId =\n    estado.distribucion_flujo_id\n      ? Number(\n          estado.distribucion_flujo_id\n        )\n      : null;\n\n  if (!flujoId) {\n    return {\n      consumido: false,\n      botActivado: false,\n      motivo: \"sin_flujo\",\n    };\n  }\n\n  if (\n    estado.flujo_estado ===\n    \"completado\"\n  ) {\n    return {\n      consumido: false,\n      botActivado: true,\n      motivo:\n        \"flujo_completado\",\n    };\n  }\n\n  const cargado =\n    await cargarFlujo(\n      pool,\n      {\n        empresaId,\n        flujoId,\n      }\n    );\n\n  if (!cargado) {\n    await actualizarEstado(\n      pool,\n      {\n        clienteId,\n        whatsappQrId,\n        estado: \"completado\",\n        nodoUid: null,\n        completar: true,\n      }\n    );\n\n    return {\n      consumido: false,\n      botActivado: true,\n      motivo:\n        \"flujo_no_disponible\",\n    };\n  }\n\n  const nodosPorId =\n    new Map(\n      cargado.nodos.map(\n        (nodo) => [\n          nodo.nodo_uid,\n          nodo,\n        ]\n      )\n    );\n\n  const siguiente =\n    construirSiguiente(\n      cargado.conexiones\n    );\n\n  let nodoActual = null;\n\n  if (\n    estado.flujo_estado ===\n      \"esperando_respuesta\" &&\n    estado.flujo_nodo_uid\n  ) {\n    nodoActual =\n      siguiente.get(\n        estado.flujo_nodo_uid\n      ) || null;\n  } else if (\n    estado.flujo_nodo_uid &&\n    estado.flujo_estado ===\n      \"ejecutando\"\n  ) {\n    nodoActual =\n      estado.flujo_nodo_uid;\n  } else {\n    const inicio =\n      cargado.nodos.find(\n        (nodo) =>\n          nodo.tipo ===\n          \"inicio\"\n      );\n\n    nodoActual =\n      inicio?.nodo_uid ||\n      cargado.nodos[0]\n        ?.nodo_uid ||\n      null;\n  }\n\n  if (!nodoActual) {\n    await actualizarEstado(\n      pool,\n      {\n        clienteId,\n        whatsappQrId,\n        estado: \"completado\",\n        nodoUid: null,\n        completar: true,\n      }\n    );\n\n    return {\n      consumido: false,\n      botActivado: true,\n      motivo:\n        \"flujo_vacio\",\n    };\n  }\n\n  for (\n    let pasos = 0;\n    pasos < 100 &&\n    nodoActual;\n    pasos += 1\n  ) {\n    const nodo =\n      nodosPorId.get(\n        nodoActual\n      );\n\n    if (!nodo) break;\n\n    await actualizarEstado(\n      pool,\n      {\n        clienteId,\n        whatsappQrId,\n        estado: \"ejecutando\",\n        nodoUid:\n          nodo.nodo_uid,\n      }\n    );\n\n    if (\n      nodo.tipo === \"inicio\"\n    ) {\n      nodoActual =\n        siguiente.get(\n          nodo.nodo_uid\n        ) || null;\n\n      continue;\n    }\n\n    if (\n      nodo.tipo === \"mensaje\"\n    ) {\n      await ejecutarContenidosMensaje(\n        {\n          pool,\n          sock,\n          jidRespuesta,\n          clienteId,\n          telefono,\n          empresaId,\n          whatsappQrId,\n          mediaDir,\n          config:\n            nodo.config || {},\n        }\n      );\n\n      nodoActual =\n        siguiente.get(\n          nodo.nodo_uid\n        ) || null;\n\n      continue;\n    }\n\n    if (\n      nodo.tipo ===\n      \"esperar_respuesta\"\n    ) {\n      await actualizarEstado(\n        pool,\n        {\n          clienteId,\n          whatsappQrId,\n          estado:\n            \"esperando_respuesta\",\n          nodoUid:\n            nodo.nodo_uid,\n        }\n      );\n\n      return {\n        consumido: true,\n        botActivado: false,\n        motivo:\n          \"esperando_respuesta\",\n        flujoId,\n        flujoNombre:\n          cargado.flujo.nombre,\n      };\n    }\n\n    if (\n      nodo.tipo ===\n      \"activar_bot\"\n    ) {\n      await actualizarEstado(\n        pool,\n        {\n          clienteId,\n          whatsappQrId,\n          estado: \"completado\",\n          nodoUid:\n            nodo.nodo_uid,\n          completar: true,\n        }\n      );\n\n      return {\n        consumido: false,\n        botActivado: true,\n        motivo: \"activar_bot\",\n        flujoId,\n        flujoNombre:\n          cargado.flujo.nombre,\n      };\n    }\n\n    nodoActual =\n      siguiente.get(\n        nodo.nodo_uid\n      ) || null;\n  }\n\n  await actualizarEstado(\n    pool,\n    {\n      clienteId,\n      whatsappQrId,\n      estado: \"completado\",\n      nodoUid:\n        nodoActual || null,\n      completar: true,\n    }\n  );\n\n  return {\n    consumido: false,\n    botActivado: true,\n    motivo:\n      \"fin_del_flujo\",\n    flujoId,\n    flujoNombre:\n      cargado.flujo.nombre,\n  };\n}";


fs.writeFileSync(
  flujoFile,
  flujoModule,
  "utf8"
);

// 1) Importar motor de flujos.
replaceOnce(
`import { resolverDistribucionPorPostId } from "./bot/distribucion.mjs";`,
`import { resolverDistribucionPorPostId } from "./bot/distribucion.mjs";
import {
  prepararEsquemaFlujos,
  procesarFlujoCliente,
} from "./bot/flujos.mjs";`,
"import flujos"
);

// 2) Preparar esquema en startup.
replaceOnce(
`  await pool.query(\`
    ALTER TABLE conversaciones`,
`  await prepararEsquemaFlujos(pool);

  await pool.query(\`
    ALTER TABLE conversaciones`,
"prepararEsquemaFlujos"
);

// 3) Guardar flujo congelado junto con distribucion.
replaceOnce(
`      distribucion_usando_reemplazo = CASE
        WHEN distribucion_grupo_id IS NULL
        THEN $8
        ELSE distribucion_usando_reemplazo
      END,

      distribucion_grupo_id = COALESCE(`,
`      distribucion_usando_reemplazo = CASE
        WHEN distribucion_grupo_id IS NULL
        THEN $8
        ELSE distribucion_usando_reemplazo
      END,

      distribucion_flujo_id = CASE
        WHEN distribucion_grupo_id IS NULL
        THEN $9
        ELSE distribucion_flujo_id
      END,

      distribucion_grupo_id = COALESCE(`,
"guardar distribucion_flujo_id"
);

replaceOnce(
`      distribucionLead.closerId || null,
      distribucionLead.usandoReemplazo === true,
    ]`,
`      distribucionLead.closerId || null,
      distribucionLead.usandoReemplazo === true,
      distribucionLead.flujoId || null,
    ]`,
"parametro flujo distribucion"
);

replaceOnce(
`    closer: distribucionLead.closerNombre,
    usandoReemplazo:
      distribucionLead.usandoReemplazo === true,`,
`    closer: distribucionLead.closerNombre,
    flujoId:
      distribucionLead.flujoId || null,
    flujo:
      distribucionLead.flujoNombre || null,
    usandoReemplazo:
      distribucionLead.usandoReemplazo === true,`,
"log flujo distribucion"
);

// 4) Antes del analisis IA de archivos, saber si el flujo fijo aun controla al lead.
replaceOnce(
`let tipoMensaje = "text";
let textoGuardado = texto;`,
`let estadoFlujoPrevio = null;

if (
  msg.key.fromMe !== true &&
  empresaQrId &&
  whatsappQrId &&
  telefono
) {
  try {
    const estadoFlujoPrevioResult =
      await pool.query(
        \`
        SELECT
          cwq.distribucion_flujo_id,
          cwq.flujo_estado
        FROM clientes c
        JOIN clientes_whatsapp_qr cwq
          ON cwq.cliente_id = c.id
         AND cwq.empresa_id = c.empresa_id
        WHERE c.empresa_id = $1
          AND c.telefono = $2
          AND cwq.whatsapp_qr_id = $3
        LIMIT 1
        \`,
        [
          empresaQrId,
          telefono,
          whatsappQrId,
        ]
      );

    estadoFlujoPrevio =
      estadoFlujoPrevioResult.rows[0] ||
      null;
  } catch (errorEstadoFlujo) {
    console.error(
      "ERROR LEYENDO ESTADO PREVIO DEL FLUJO:",
      errorEstadoFlujo?.message ||
        errorEstadoFlujo
    );
  }
}

const flujoFijoAntesIA =
  msg.key.fromMe !== true &&
  (
    Boolean(
      distribucionLead?.flujoId
    ) ||
    (
      Boolean(
        estadoFlujoPrevio
          ?.distribucion_flujo_id
      ) &&
      estadoFlujoPrevio
        ?.flujo_estado !==
        "completado"
    )
  );

let tipoMensaje = "text";
let textoGuardado = texto;`,
"estado flujo antes de IA"
);

// 5) Bloquear analisis IA de media mientras el flujo fijo esta activo.
replaceOnce(
`      if (tipoMensaje === "audio" && !esMio) {`,
`      if (
        tipoMensaje === "audio" &&
        !esMio &&
        !flujoFijoAntesIA
      ) {`,
"bloque audio IA"
);

replaceOnce(
`      if (tipoMensaje === "image" && !esMio) {`,
`      if (
        tipoMensaje === "image" &&
        !esMio &&
        !flujoFijoAntesIA
      ) {`,
"bloque imagen IA"
);

replaceOnce(
`      if (tipoMensaje === "video" && !esMio) {`,
`      if (
        tipoMensaje === "video" &&
        !esMio &&
        !flujoFijoAntesIA
      ) {`,
"bloque video IA"
);

replaceOnce(
`      if (tipoMensaje === "document" && mimeType === "application/pdf" && !esMio) {`,
`      if (
        tipoMensaje === "document" &&
        mimeType === "application/pdf" &&
        !esMio &&
        !flujoFijoAntesIA
      ) {`,
"bloque PDF IA"
);

// 6) Ejecutar flujo despues de guardar el mensaje y antes del buffer de OpenAI.
replaceOnce(
`console.log("Mensaje guardado en PostgreSQL");

      const textoBot = [texto, mediaAnalisis ? \`[ANALISIS INTERNO DEL ARCHIVO - NO ES TEXTO DEL CLIENTE]: \${mediaAnalisis}\` : ""]`,
`console.log("Mensaje guardado en PostgreSQL");

let resultadoFlujo = null;

if (!esMio) {
  try {
    const jidFlujo =
      msg.key.remoteJidAlt ||
      \`\${telefono}@s.whatsapp.net\`;

    resultadoFlujo =
      await procesarFlujoCliente({
        pool,
        sock,
        empresaId: empresaQrId,
        whatsappQrId,
        clienteId,
        telefono,
        jidRespuesta: jidFlujo,
        mediaDir: MEDIA_DIR,
      });

    console.log(
      "FLUJO PRIMER CONTACTO:",
      {
        clienteId,
        ...resultadoFlujo,
      }
    );
  } catch (errorFlujo) {
    console.error(
      "ERROR EJECUTANDO FLUJO:",
      errorFlujo?.message ||
        errorFlujo
    );

    resultadoFlujo = null;
  }
}

if (
  !esMio &&
  resultadoFlujo?.botActivado === true &&
  mediaContenido &&
  !mediaAnalisis
) {
  try {
    if (
      tipoMensaje === "audio" &&
      mediaId
    ) {
      mediaAnalisis =
        await transcribirAudio(
          \`\${MEDIA_DIR}/\${mediaId}\`
        );
    } else if (
      tipoMensaje === "image" &&
      mediaId
    ) {
      mediaAnalisis =
        await analizarImagen(
          \`\${MEDIA_DIR}/\${mediaId}\`,
          mimeType ||
            "image/jpeg"
        );
    } else if (
      tipoMensaje === "video" &&
      mediaId
    ) {
      mediaAnalisis =
        await analizarVideo(
          \`\${MEDIA_DIR}/\${mediaId}\`
        );
    } else if (
      tipoMensaje === "document" &&
      mimeType ===
        "application/pdf" &&
      mediaId
    ) {
      mediaAnalisis =
        await analizarDocumento(
          \`\${MEDIA_DIR}/\${mediaId}\`,
          filename ||
            "documento.pdf"
        );
    }

    if (mediaAnalisis) {
      await pool.query(
        \`
        UPDATE conversaciones
        SET media_analisis = $2
        WHERE id = $1
        \`,
        [
          mensajeGuardado.rows[0].id,
          mediaAnalisis,
        ]
      );
    }
  } catch (
    errorAnalisisPostFlujo
  ) {
    console.error(
      "ERROR ANALIZANDO MEDIA TRAS ACTIVAR BOT:",
      errorAnalisisPostFlujo
        ?.message ||
        errorAnalisisPostFlujo
    );
  }
}

if (
  resultadoFlujo?.consumido ===
  true
) {
  console.log(
    "MENSAJE CONSUMIDO POR FLUJO FIJO:",
    {
      clienteId,
      motivo:
        resultadoFlujo.motivo,
    }
  );

  continue;
}

      const textoBot = [texto, mediaAnalisis ? \`[ANALISIS INTERNO DEL ARCHIVO - NO ES TEXTO DEL CLIENTE]: \${mediaAnalisis}\` : ""]`,
"ejecutar flujo antes del buffer"
);

fs.writeFileSync(
  serverFile,
  server,
  "utf8"
);

console.log(
  "OK - motor de primer contacto agregado."
);
console.log(
  "Nuevo modulo:",
  flujoFile
);
console.log(
  "Backup:",
  serverBackup
);
console.log(
  "Valida con:"
);
console.log(
  "node --check app\\whatsapp-qr-server\\bot\\flujos.mjs"
);
console.log(
  "node --check app\\whatsapp-qr-server\\server.mjs"
);
console.log(
  "npm run build"
);
