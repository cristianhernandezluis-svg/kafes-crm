const fs = require("fs");
const path = require("path");

const file = path.join(
  process.cwd(),
  "app",
  "whatsapp-qr-server",
  "bot",
  "flujos.mjs"
);

if (!fs.existsSync(file)) {
  throw new Error(`No existe: ${file}`);
}

const backup =
  `${file}.backup-iniciar-flujo-runtime`;

if (!fs.existsSync(backup)) {
  fs.copyFileSync(file, backup);
}

let text = fs.readFileSync(
  file,
  "utf8"
);

const HELPERS = "function normalizarPilaFlujos(\n  valor\n) {\n  if (Array.isArray(valor)) {\n    return valor;\n  }\n\n  if (typeof valor === \"string\") {\n    try {\n      const parsed =\n        JSON.parse(valor);\n\n      return Array.isArray(parsed)\n        ? parsed\n        : [];\n    } catch {\n      return [];\n    }\n  }\n\n  return [];\n}\n\nasync function guardarContextoEjecucionFlujo(\n  pool,\n  {\n    clienteId,\n    whatsappQrId,\n    flujoEjecucionId,\n    pila,\n    estado,\n    nodoUid,\n  }\n) {\n  await pool.query(\n    `\n    UPDATE clientes_whatsapp_qr\n    SET\n      flujo_ejecucion_id = $3,\n      flujo_pila = $4::jsonb,\n      flujo_estado = $5,\n      flujo_nodo_uid = $6,\n      flujo_iniciado_at =\n        COALESCE(\n          flujo_iniciado_at,\n          NOW()\n        ),\n      flujo_completado_at = NULL,\n      updated_at = NOW()\n    WHERE cliente_id = $1\n      AND whatsapp_qr_id = $2\n    `,\n    [\n      clienteId,\n      whatsappQrId,\n      flujoEjecucionId || null,\n      JSON.stringify(\n        Array.isArray(pila)\n          ? pila\n          : []\n      ),\n      estado,\n      nodoUid || null,\n    ]\n  );\n}\n\nasync function retornarDesdeSubflujo({\n  pool,\n  clienteId,\n  whatsappQrId,\n  flujoRaizId,\n  pila,\n}) {\n  const restante = [\n    ...normalizarPilaFlujos(\n      pila\n    ),\n  ];\n\n  while (restante.length > 0) {\n    const frame =\n      restante.pop();\n\n    const flujoPadreId =\n      Number(\n        frame?.flujo_id || 0\n      );\n\n    if (!flujoPadreId) {\n      continue;\n    }\n\n    const continuarNodoUid =\n      String(\n        frame\n          ?.continuar_nodo_uid ||\n          \"\"\n      ).trim() || null;\n\n    if (!continuarNodoUid) {\n      /*\n       * El padre también terminó al\n       * volver del subflujo. Seguimos\n       * subiendo por la pila.\n       */\n      continue;\n    }\n\n    await guardarContextoEjecucionFlujo(\n      pool,\n      {\n        clienteId,\n        whatsappQrId,\n        flujoEjecucionId:\n          flujoPadreId,\n        pila: restante,\n        estado: \"ejecutando\",\n        nodoUid:\n          continuarNodoUid,\n      }\n    );\n\n    return {\n      reanudar: true,\n      flujoId:\n        flujoPadreId,\n      nodoUid:\n        continuarNodoUid,\n    };\n  }\n\n  /*\n   * Ya no existe un padre al cual\n   * regresar. Dejamos la ejecución\n   * nuevamente anclada al flujo raíz.\n   */\n  await guardarContextoEjecucionFlujo(\n    pool,\n    {\n      clienteId,\n      whatsappQrId,\n      flujoEjecucionId:\n        flujoRaizId || null,\n      pila: [],\n      estado: \"ejecutando\",\n      nodoUid: null,\n    }\n  );\n\n  return {\n    reanudar: false,\n  };\n}";
const BRANCH = "    if (\n      nodo.tipo ===\n      \"iniciar_flujo\"\n    ) {\n      const flujoDestinoId =\n        Number(\n          nodo.config\n            ?.flujoDestinoId ||\n            0\n        );\n\n      const continuarNodoUid =\n        siguiente.get(\n          nodo.nodo_uid\n        ) || null;\n\n      if (\n        !flujoDestinoId ||\n        flujoDestinoId ===\n          flujoId ||\n        pilaFlujo.length >=\n          20 ||\n        _profundidadSubflujo >=\n          20\n      ) {\n        console.warn(\n          \"FLUJO SUBFLUJO OMITIDO:\",\n          {\n            clienteId,\n            flujoId,\n            nodoUid:\n              nodo.nodo_uid,\n            flujoDestinoId:\n              flujoDestinoId ||\n              null,\n            profundidad:\n              pilaFlujo.length,\n          }\n        );\n\n        nodoActual =\n          continuarNodoUid;\n\n        continue;\n      }\n\n      const destinoCargado =\n        await cargarFlujo(\n          pool,\n          {\n            empresaId,\n            flujoId:\n              flujoDestinoId,\n          }\n        );\n\n      if (!destinoCargado) {\n        console.warn(\n          \"FLUJO SUBFLUJO NO DISPONIBLE:\",\n          {\n            clienteId,\n            flujoId,\n            nodoUid:\n              nodo.nodo_uid,\n            flujoDestinoId,\n          }\n        );\n\n        nodoActual =\n          continuarNodoUid;\n\n        continue;\n      }\n\n      const nuevaPila = [\n        ...pilaFlujo,\n        {\n          flujo_id:\n            flujoId,\n          nodo_iniciar_uid:\n            nodo.nodo_uid,\n          continuar_nodo_uid:\n            continuarNodoUid,\n        },\n      ];\n\n      console.log(\n        \"FLUJO INICIAR SUBFLUJO:\",\n        {\n          clienteId,\n          flujoOrigenId:\n            flujoId,\n          flujoDestinoId,\n          nodoUid:\n            nodo.nodo_uid,\n          continuarNodoUid,\n          profundidad:\n            nuevaPila.length,\n        }\n      );\n\n      await guardarContextoEjecucionFlujo(\n        pool,\n        {\n          clienteId,\n          whatsappQrId,\n          flujoEjecucionId:\n            flujoDestinoId,\n          pila: nuevaPila,\n          estado:\n            \"ejecutando\",\n          nodoUid: null,\n        }\n      );\n\n      return procesarFlujoCliente({\n        pool,\n        sock,\n        empresaId,\n        whatsappQrId,\n        clienteId,\n        telefono,\n        textoCliente,\n        tipoMensajeCliente,\n        jidRespuesta,\n        mediaDir,\n        _profundidadSubflujo:\n          _profundidadSubflujo +\n          1,\n      });\n    }\n\n";
const NATURAL_RETURN = "  if (\n    pilaFlujo.length > 0\n  ) {\n    const retorno =\n      await retornarDesdeSubflujo({\n        pool,\n        clienteId,\n        whatsappQrId,\n        flujoRaizId,\n        pila: pilaFlujo,\n      });\n\n    if (retorno.reanudar) {\n      console.log(\n        \"FLUJO REGRESAR AL PADRE:\",\n        {\n          clienteId,\n          desdeFlujoId:\n            flujoId,\n          flujoPadreId:\n            retorno.flujoId,\n          nodoUid:\n            retorno.nodoUid,\n        }\n      );\n\n      return procesarFlujoCliente({\n        pool,\n        sock,\n        empresaId,\n        whatsappQrId,\n        clienteId,\n        telefono,\n        textoCliente,\n        tipoMensajeCliente,\n        jidRespuesta,\n        mediaDir,\n        _profundidadSubflujo:\n          _profundidadSubflujo +\n          1,\n      });\n    }\n  }\n\n";
const EMPTY_RETURN = "  if (!nodoActual) {\n    if (\n      pilaFlujo.length > 0\n    ) {\n      const retorno =\n        await retornarDesdeSubflujo({\n          pool,\n          clienteId,\n          whatsappQrId,\n          flujoRaizId,\n          pila: pilaFlujo,\n        });\n\n      if (retorno.reanudar) {\n        return procesarFlujoCliente({\n          pool,\n          sock,\n          empresaId,\n          whatsappQrId,\n          clienteId,\n          telefono,\n          textoCliente,\n          tipoMensajeCliente,\n          jidRespuesta,\n          mediaDir,\n          _profundidadSubflujo:\n            _profundidadSubflujo +\n            1,\n        });\n      }\n    }\n\n    await actualizarEstado(\n      pool,\n      {\n        clienteId,\n        whatsappQrId,\n        estado: \"completado\",\n        nodoUid: null,\n        completar: true,\n      }\n    );\n\n    return {\n      consumido: false,\n      botActivado: true,\n      motivo:\n        \"flujo_vacio\",\n    };\n  }";


function mustReplace(
  texto,
  regex,
  replacement,
  label
) {
  if (!regex.test(texto)) {
    throw new Error(
      `No encontré: ${label}`
    );
  }

  return texto.replace(
    regex,
    replacement
  );
}

/* 1) Helpers persistentes */
if (
  !text.includes(
    "async function guardarContextoEjecucionFlujo("
  )
) {
  text = mustReplace(
    text,
    /(?=async function cargarFlujo\()/,
    HELPERS + "\n\n",
    "antes de cargarFlujo"
  );
}

/* 2) Al completar, limpiar pila */
if (
  !text.includes(
    "flujo_pila ="
  ) ||
  !text.includes(
    "CASE\n          WHEN $5 = true\n          THEN '[]'::jsonb"
  )
) {
  text = mustReplace(
    text,
    /(flujo_completado_at =\s*\n\s*CASE[\s\S]*?\n\s*END,)/,
    `$1
      flujo_pila =
        CASE
          WHEN $5 = true
          THEN '[]'::jsonb
          ELSE flujo_pila
        END,
      flujo_ejecucion_id =
        CASE
          WHEN $5 = true
          THEN distribucion_flujo_id
          ELSE flujo_ejecucion_id
        END,`,
    "actualizarEstado"
  );
}

/* 3) Nuevas columnas */
if (
  !text.includes(
    "flujo_ejecucion_id INTEGER"
  )
) {
  text = mustReplace(
    text,
    /(ADD COLUMN IF NOT EXISTS\s*\n\s*distribucion_flujo_id INTEGER,)/,
    `$1
      ADD COLUMN IF NOT EXISTS
        flujo_ejecucion_id INTEGER
        REFERENCES flujos_bot(id)
        ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS
        flujo_pila JSONB NOT NULL
        DEFAULT '[]'::jsonb,`,
    "ALTER clientes columnas"
  );
}

/* 4) Firma interna con profundidad */
if (
  !text.includes(
    "_profundidadSubflujo = 0"
  )
) {
  text = mustReplace(
    text,
    /(mediaDir = "\.\/auth\/media",\s*\n)/,
    `$1  _profundidadSubflujo = 0,\n`,
    "firma procesarFlujoCliente"
  );
}

/* 5) SELECT estado */
if (
  !text.includes(
    "flujo_ejecucion_id,"
  )
) {
  text = mustReplace(
    text,
    /(SELECT\s*\n\s*distribucion_flujo_id,)/,
    `$1
        flujo_ejecucion_id,
        flujo_pila,`,
    "SELECT contexto flujo"
  );
}

/* 6) flujoId efectivo + pila */
if (
  !text.includes(
    "const flujoRaizId ="
  )
) {
  text = mustReplace(
    text,
    /  const flujoId =\s*\n\s*estado\.distribucion_flujo_id[\s\S]*?\n\s*: null;/,
    `  const flujoRaizId =
    estado.distribucion_flujo_id
      ? Number(
          estado.distribucion_flujo_id
        )
      : null;

  const flujoEjecucionId =
    estado.flujo_ejecucion_id
      ? Number(
          estado.flujo_ejecucion_id
        )
      : null;

  const flujoId =
    flujoEjecucionId ||
    flujoRaizId;

  const pilaFlujo =
    normalizarPilaFlujos(
      estado.flujo_pila
    );`,
    "definición flujoId"
  );
}

/* 7) flujo vacío también regresa */
if (
  !text.includes(
    "const pilaFlujo ="
  )
) {
  throw new Error(
    "La pila no fue insertada correctamente."
  );
}

text = mustReplace(
  text,
  /  if \(!nodoActual\) \{[\s\S]*?\n  \}\n\n(?=  for \()/,
  EMPTY_RETURN + "\n\n",
  "bloque flujo vacío"
);

/* 8) Nodo iniciar_flujo */
if (
  !text.includes(
    'nodo.tipo ===\n      "iniciar_flujo"'
  )
) {
  text = mustReplace(
    text,
    /(?=    if \(\s*\n\s*nodo\.tipo ===\s*\n\s*"condicion")/,
    BRANCH,
    "antes de condicion"
  );
}

/* 9) Fin natural: retornar al padre */
if (
  !text.includes(
    "FLUJO REGRESAR AL PADRE:"
  )
) {
  text = mustReplace(
    text,
    /(?=  await actualizarEstado\(\s*\n\s*pool,\s*\n\s*\{\s*\n\s*clienteId,\s*\n\s*whatsappQrId,\s*\n\s*estado: "completado",\s*\n\s*nodoUid:\s*\n\s*nodoActual \|\| null,)/,
    NATURAL_RETURN,
    "fin natural antes de completar"
  );
}

fs.writeFileSync(
  file,
  text,
  "utf8"
);

console.log("");
console.log(
  "✅ Runtime persistente de ↗ Iniciar Flujo aplicado."
);
console.log(
  "✅ Pila de subflujos agregada a PostgreSQL."
);
console.log(
  "✅ Esperar respuesta dentro del subflujo queda persistente."
);
console.log(
  "✅ Al terminar naturalmente vuelve al padre por Continuar."
);
console.log(
  "✅ Protección de profundidad máxima: 20."
);
console.log("");
console.log("Valida:");
console.log(
  "node --check app\\whatsapp-qr-server\\bot\\flujos.mjs"
);
console.log(
  "node --check app\\whatsapp-qr-server\\server.mjs"
);
console.log("npm run build");
