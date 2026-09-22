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

const flujoModule = String.raw`import {
  mkdir,
  writeFile,
} from "fs/promises";

function dormir(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function numeroSeguro(valor, fallback = 0) {
  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : fallback;
}

function extensionDesdeMime(
  mimeType,
  tipo
) {
  const mime = String(
    mimeType || ""
  ).toLowerCase();

  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("jpg")) return "jpg";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";

  return tipo === "video"
    ? "mp4"
    : "jpg";
}

async function guardarTextoBot({
  pool,
  clienteId,
  telefono,
  empresaId,
  whatsappQrId,
  enviado,
  texto,
}) {
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
      estado_whatsapp,
      enviado_at,
      canal
    )
    VALUES (
      $1, $2, $3, $4,
      'bot', 'text',
      $5, $6,
      'enviado', NOW(), 'qr'
    )
    ON CONFLICT (whatsapp_message_id)
    WHERE whatsapp_message_id IS NOT NULL
    DO NOTHING
    `,
    [
      clienteId,
      telefono,
      enviado?.key?.id || null,
      texto,
      empresaId,
      whatsappQrId,
    ]
  );
}

async function enviarTexto({
  pool,
  sock,
  jidRespuesta,
  clienteId,
  telefono,
  empresaId,
  whatsappQrId,
  texto,
}) {
  const limpio = String(
    texto || ""
  ).trim();

  if (!limpio) return;

  const enviado =
    await sock.sendMessage(
      jidRespuesta,
      {
        text: limpio,
      }
    );

  await guardarTextoBot({
    pool,
    clienteId,
    telefono,
    empresaId,
    whatsappQrId,
    enviado,
    texto: limpio,
  });
}

async function enviarMultimedia({
  pool,
  sock,
  jidRespuesta,
  clienteId,
  telefono,
  empresaId,
  whatsappQrId,
  mediaDir,
  url,
  tipo,
}) {
  const archivo = String(
    url || ""
  ).trim();

  if (!archivo) return;

  const response =
    await fetch(archivo);

  if (!response.ok) {
    throw new Error(
      \`HTTP \${response.status} descargando multimedia del flujo\`
    );
  }

  const mimeType =
    response.headers
      .get("content-type")
      ?.split(";")[0] ||
    (tipo === "video"
      ? "video/mp4"
      : "image/jpeg");

  const buffer = Buffer.from(
    await response.arrayBuffer()
  );

  let enviado;

  if (tipo === "video") {
    enviado =
      await sock.sendMessage(
        jidRespuesta,
        {
          video: buffer,
          mimetype: mimeType,
        }
      );
  } else {
    enviado =
      await sock.sendMessage(
        jidRespuesta,
        {
          image: buffer,
          mimetype: mimeType,
        }
      );
  }

  await mkdir(
    mediaDir,
    {
      recursive: true,
    }
  );

  const extension =
    extensionDesdeMime(
      mimeType,
      tipo
    );

  const mediaId =
    \`flujo-\${Date.now()}-\${Math.random()
      .toString(36)
      .slice(2, 8)}.\${extension}\`;

  await writeFile(
    \`\${mediaDir}/\${mediaId}\`,
    buffer
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
      media_id,
      mime_type,
      estado_whatsapp,
      enviado_at
    )
    VALUES (
      $1, $2, $3, $4,
      'bot', $5,
      $6, $7, 'qr',
      $8, $9,
      'enviado', NOW()
    )
    ON CONFLICT (whatsapp_message_id)
    WHERE whatsapp_message_id IS NOT NULL
    DO NOTHING
    `,
    [
      clienteId,
      telefono,
      enviado?.key?.id || null,
      tipo === "video"
        ? "[Video]"
        : "[Imagen]",
      tipo,
      empresaId,
      whatsappQrId,
      mediaId,
      mimeType,
    ]
  );
}

async function ejecutarContenidosMensaje({
  pool,
  sock,
  jidRespuesta,
  clienteId,
  telefono,
  empresaId,
  whatsappQrId,
  mediaDir,
  config,
}) {
  if (
    config?.tipoMensaje ===
    "webchat"
  ) {
    return;
  }

  const contenidos =
    Array.isArray(
      config?.contenidos
    )
      ? config.contenidos
      : [];

  for (
    const contenido of contenidos
  ) {
    const tipo = String(
      contenido?.tipo || ""
    );

    if (tipo === "texto") {
      await enviarTexto({
        pool,
        sock,
        jidRespuesta,
        clienteId,
        telefono,
        empresaId,
        whatsappQrId,
        texto:
          contenido?.texto || "",
      });

      continue;
    }

    if (
      tipo === "imagen" ||
      tipo === "video"
    ) {
      await enviarMultimedia({
        pool,
        sock,
        jidRespuesta,
        clienteId,
        telefono,
        empresaId,
        whatsappQrId,
        mediaDir,
        url:
          contenido?.url || "",
        tipo,
      });

      continue;
    }

    if (
      tipo === "escribiendo"
    ) {
      const segundos =
        Math.min(
          10,
          Math.max(
            0.5,
            numeroSeguro(
              contenido?.segundos,
              1.5
            )
          )
        );

      try {
        await sock
          ?.sendPresenceUpdate?.(
            "composing",
            jidRespuesta
          );
      } catch {}

      await dormir(
        segundos * 1000
      );

      try {
        await sock
          ?.sendPresenceUpdate?.(
            "paused",
            jidRespuesta
          );
      } catch {}

      continue;
    }

    if (
      tipo === "boton" ||
      tipo ===
        "respuesta_rapida"
    ) {
      // En WhatsApp QR/Baileys usamos
      // texto como fallback estable.
      await enviarTexto({
        pool,
        sock,
        jidRespuesta,
        clienteId,
        telefono,
        empresaId,
        whatsappQrId,
        texto:
          contenido?.texto || "",
      });
    }
  }
}

function construirSiguiente(
  conexiones
) {
  const mapa = new Map();

  for (
    const conexion of conexiones
  ) {
    if (
      !mapa.has(
        conexion.source_uid
      )
    ) {
      mapa.set(
        conexion.source_uid,
        conexion.target_uid
      );
    }
  }

  return mapa;
}

async function cargarFlujo(
  pool,
  {
    empresaId,
    flujoId,
  }
) {
  const flujoResult =
    await pool.query(
      `
      SELECT
        id,
        nombre,
        slug,
        producto_slug
      FROM flujos_bot
      WHERE id = $1
        AND empresa_id = $2
        AND activo = true
      LIMIT 1
      `,
      [
        flujoId,
        empresaId,
      ]
    );

  if (
    flujoResult.rowCount === 0
  ) {
    return null;
  }

  const nodosResult =
    await pool.query(
      `
      SELECT
        nodo_uid,
        tipo,
        posicion_x,
        posicion_y,
        config
      FROM flujo_nodos
      WHERE flujo_id = $1
      ORDER BY id ASC
      `,
      [flujoId]
    );

  const conexionesResult =
    await pool.query(
      `
      SELECT
        source_uid,
        target_uid,
        source_handle,
        target_handle,
        config
      FROM flujo_conexiones
      WHERE flujo_id = $1
      ORDER BY id ASC
      `,
      [flujoId]
    );

  return {
    flujo:
      flujoResult.rows[0],
    nodos:
      nodosResult.rows,
    conexiones:
      conexionesResult.rows,
  };
}

async function actualizarEstado(
  pool,
  {
    clienteId,
    whatsappQrId,
    estado,
    nodoUid,
    completar = false,
  }
) {
  await pool.query(
    `
    UPDATE clientes_whatsapp_qr
    SET
      flujo_estado = $3,
      flujo_nodo_uid = $4,
      flujo_iniciado_at =
        COALESCE(
          flujo_iniciado_at,
          NOW()
        ),
      flujo_completado_at =
        CASE
          WHEN $5 = true
          THEN NOW()
          ELSE flujo_completado_at
        END,
      updated_at = NOW()
    WHERE cliente_id = $1
      AND whatsapp_qr_id = $2
    `,
    [
      clienteId,
      whatsappQrId,
      estado,
      nodoUid || null,
      completar,
    ]
  );
}

export async function prepararEsquemaFlujos(
  pool
) {
  await pool.query(
    `
    CREATE TABLE IF NOT EXISTS flujos_bot (
      id SERIAL PRIMARY KEY,
      empresa_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      slug TEXT,
      producto_slug TEXT,
      activo BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS
      flujos_bot_empresa_slug_uq
    ON flujos_bot(
      empresa_id,
      slug
    )
    WHERE slug IS NOT NULL;

    CREATE TABLE IF NOT EXISTS flujo_nodos (
      id SERIAL PRIMARY KEY,
      flujo_id INTEGER NOT NULL
        REFERENCES flujos_bot(id)
        ON DELETE CASCADE,
      nodo_uid TEXT NOT NULL,
      tipo TEXT NOT NULL,
      posicion_x DOUBLE PRECISION NOT NULL DEFAULT 0,
      posicion_y DOUBLE PRECISION NOT NULL DEFAULT 0,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(
        flujo_id,
        nodo_uid
      )
    );

    CREATE TABLE IF NOT EXISTS flujo_conexiones (
      id SERIAL PRIMARY KEY,
      flujo_id INTEGER NOT NULL
        REFERENCES flujos_bot(id)
        ON DELETE CASCADE,
      conexion_uid TEXT NOT NULL,
      source_uid TEXT NOT NULL,
      target_uid TEXT NOT NULL,
      source_handle TEXT,
      target_handle TEXT,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(
        flujo_id,
        conexion_uid
      )
    );
    `
  );

  await pool.query(
    `
    ALTER TABLE grupos_distribucion
      ADD COLUMN IF NOT EXISTS
        flujo_id INTEGER
        REFERENCES flujos_bot(id)
        ON DELETE SET NULL;
    `
  );

  await pool.query(
    `
    ALTER TABLE clientes_whatsapp_qr
      ADD COLUMN IF NOT EXISTS
        distribucion_flujo_id INTEGER,
      ADD COLUMN IF NOT EXISTS
        flujo_estado TEXT DEFAULT 'sin_iniciar',
      ADD COLUMN IF NOT EXISTS
        flujo_nodo_uid TEXT,
      ADD COLUMN IF NOT EXISTS
        flujo_iniciado_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS
        flujo_completado_at TIMESTAMPTZ;
    `
  );
}

export async function procesarFlujoCliente({
  pool,
  sock,
  empresaId,
  whatsappQrId,
  clienteId,
  telefono,
  jidRespuesta,
  mediaDir = "./auth/media",
}) {
  const estadoResult =
    await pool.query(
      `
      SELECT
        distribucion_flujo_id,
        flujo_estado,
        flujo_nodo_uid
      FROM clientes_whatsapp_qr
      WHERE cliente_id = $1
        AND whatsapp_qr_id = $2
      LIMIT 1
      `,
      [
        clienteId,
        whatsappQrId,
      ]
    );

  if (
    estadoResult.rowCount === 0
  ) {
    return {
      consumido: false,
      botActivado: false,
      motivo: "sin_estado",
    };
  }

  const estado =
    estadoResult.rows[0];

  const flujoId =
    estado.distribucion_flujo_id
      ? Number(
          estado.distribucion_flujo_id
        )
      : null;

  if (!flujoId) {
    return {
      consumido: false,
      botActivado: false,
      motivo: "sin_flujo",
    };
  }

  if (
    estado.flujo_estado ===
    "completado"
  ) {
    return {
      consumido: false,
      botActivado: true,
      motivo:
        "flujo_completado",
    };
  }

  const cargado =
    await cargarFlujo(
      pool,
      {
        empresaId,
        flujoId,
      }
    );

  if (!cargado) {
    await actualizarEstado(
      pool,
      {
        clienteId,
        whatsappQrId,
        estado: "completado",
        nodoUid: null,
        completar: true,
      }
    );

    return {
      consumido: false,
      botActivado: true,
      motivo:
        "flujo_no_disponible",
    };
  }

  const nodosPorId =
    new Map(
      cargado.nodos.map(
        (nodo) => [
          nodo.nodo_uid,
          nodo,
        ]
      )
    );

  const siguiente =
    construirSiguiente(
      cargado.conexiones
    );

  let nodoActual = null;

  if (
    estado.flujo_estado ===
      "esperando_respuesta" &&
    estado.flujo_nodo_uid
  ) {
    nodoActual =
      siguiente.get(
        estado.flujo_nodo_uid
      ) || null;
  } else if (
    estado.flujo_nodo_uid &&
    estado.flujo_estado ===
      "ejecutando"
  ) {
    nodoActual =
      estado.flujo_nodo_uid;
  } else {
    const inicio =
      cargado.nodos.find(
        (nodo) =>
          nodo.tipo ===
          "inicio"
      );

    nodoActual =
      inicio?.nodo_uid ||
      cargado.nodos[0]
        ?.nodo_uid ||
      null;
  }

  if (!nodoActual) {
    await actualizarEstado(
      pool,
      {
        clienteId,
        whatsappQrId,
        estado: "completado",
        nodoUid: null,
        completar: true,
      }
    );

    return {
      consumido: false,
      botActivado: true,
      motivo:
        "flujo_vacio",
    };
  }

  for (
    let pasos = 0;
    pasos < 100 &&
    nodoActual;
    pasos += 1
  ) {
    const nodo =
      nodosPorId.get(
        nodoActual
      );

    if (!nodo) break;

    await actualizarEstado(
      pool,
      {
        clienteId,
        whatsappQrId,
        estado: "ejecutando",
        nodoUid:
          nodo.nodo_uid,
      }
    );

    if (
      nodo.tipo === "inicio"
    ) {
      nodoActual =
        siguiente.get(
          nodo.nodo_uid
        ) || null;

      continue;
    }

    if (
      nodo.tipo === "mensaje"
    ) {
      await ejecutarContenidosMensaje(
        {
          pool,
          sock,
          jidRespuesta,
          clienteId,
          telefono,
          empresaId,
          whatsappQrId,
          mediaDir,
          config:
            nodo.config || {},
        }
      );

      nodoActual =
        siguiente.get(
          nodo.nodo_uid
        ) || null;

      continue;
    }

    if (
      nodo.tipo ===
      "esperar_respuesta"
    ) {
      await actualizarEstado(
        pool,
        {
          clienteId,
          whatsappQrId,
          estado:
            "esperando_respuesta",
          nodoUid:
            nodo.nodo_uid,
        }
      );

      return {
        consumido: true,
        botActivado: false,
        motivo:
          "esperando_respuesta",
        flujoId,
        flujoNombre:
          cargado.flujo.nombre,
      };
    }

    if (
      nodo.tipo ===
      "activar_bot"
    ) {
      await actualizarEstado(
        pool,
        {
          clienteId,
          whatsappQrId,
          estado: "completado",
          nodoUid:
            nodo.nodo_uid,
          completar: true,
        }
      );

      return {
        consumido: false,
        botActivado: true,
        motivo: "activar_bot",
        flujoId,
        flujoNombre:
          cargado.flujo.nombre,
      };
    }

    nodoActual =
      siguiente.get(
        nodo.nodo_uid
      ) || null;
  }

  await actualizarEstado(
    pool,
    {
      clienteId,
      whatsappQrId,
      estado: "completado",
      nodoUid:
        nodoActual || null,
      completar: true,
    }
  );

  return {
    consumido: false,
    botActivado: true,
    motivo:
      "fin_del_flujo",
    flujoId,
    flujoNombre:
      cargado.flujo.nombre,
  };
}
`;

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
