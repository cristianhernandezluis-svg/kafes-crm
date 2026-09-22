const fs = require("fs");
const path = require("path");

const file = path.join(
  process.cwd(),
  "app",
  "flujos",
  "preview",
  "page.tsx"
);

if (!fs.existsSync(file)) {
  throw new Error(`No existe: ${file}`);
}

const backup =
  `${file}.backup-iniciar-flujo-preview`;

if (!fs.existsSync(backup)) {
  fs.copyFileSync(file, backup);
}

let text = fs.readFileSync(
  file,
  "utf8"
);

const HELPERS = "type GrafoPreview = {\n  flujoId: number;\n  flujoNombre: string;\n  nodos: NodoFlujo[];\n  conexiones: ConexionFlujo[];\n  nodosPorId: Map<string, NodoFlujo>;\n  siguientePorId: Map<string, string>;\n  siguientePorHandle: Map<string, string>;\n};\n\ntype FramePreview = {\n  grafo: GrafoPreview;\n  continuarNodoUid: string | null;\n};\n\nfunction crearGrafoPreview({\n  flujoId,\n  flujoNombre,\n  nodos,\n  conexiones,\n}: {\n  flujoId: number;\n  flujoNombre: string;\n  nodos: NodoFlujo[];\n  conexiones: ConexionFlujo[];\n}): GrafoPreview {\n  const nodosPorId =\n    new Map<string, NodoFlujo>();\n\n  for (const nodo of nodos) {\n    nodosPorId.set(\n      nodo.nodo_uid,\n      nodo\n    );\n  }\n\n  const siguientePorId =\n    new Map<string, string>();\n\n  const siguientePorHandle =\n    new Map<string, string>();\n\n  for (\n    const conexion of conexiones\n  ) {\n    if (\n      !siguientePorId.has(\n        conexion.source_uid\n      )\n    ) {\n      siguientePorId.set(\n        conexion.source_uid,\n        conexion.target_uid\n      );\n    }\n\n    if (\n      conexion.source_handle\n    ) {\n      siguientePorHandle.set(\n        `${conexion.source_uid}::${conexion.source_handle}`,\n        conexion.target_uid\n      );\n    }\n  }\n\n  return {\n    flujoId,\n    flujoNombre,\n    nodos,\n    conexiones,\n    nodosPorId,\n    siguientePorId,\n    siguientePorHandle,\n  };\n}\n\nasync function cargarGrafoPreview({\n  empresaId,\n  flujoId,\n}: {\n  empresaId: number;\n  flujoId: number;\n}) {\n  const response = await fetch(\n    `/api/flujos?empresa_id=${empresaId}&id=${flujoId}`,\n    {\n      cache: \"no-store\",\n    }\n  );\n\n  const data =\n    await response.json();\n\n  if (\n    !response.ok ||\n    !data.success\n  ) {\n    throw new Error(\n      data.error ||\n        \"No se pudo cargar el flujo.\"\n    );\n  }\n\n  return crearGrafoPreview({\n    flujoId,\n    flujoNombre:\n      data.flujo?.nombre ||\n      `Flujo ${flujoId}`,\n    nodos:\n      Array.isArray(data.nodos)\n        ? data.nodos\n        : [],\n    conexiones:\n      Array.isArray(\n        data.conexiones\n      )\n        ? data.conexiones\n        : [],\n  });\n}\n\nfunction nodoInicialGrafo(\n  grafo: GrafoPreview\n) {\n  return (\n    grafo.nodos.find(\n      (nodo) =>\n        nodo.tipo === \"inicio\"\n    )?.nodo_uid ||\n    grafo.nodos[0]?.nodo_uid ||\n    null\n  );\n}";
const RUNTIME = "  const ejecutarDesde = useCallback(\n    async (\n      nodoUid: string | null,\n      grafoForzado?: GrafoPreview | null\n    ) => {\n      if (\n        !nodoUid ||\n        ejecutando\n      ) {\n        return;\n      }\n\n      if (!empresaId) {\n        agregarMensaje({\n          id: idTemporal(),\n          lado: \"sistema\",\n          tipo: \"sistema\",\n          texto:\n            \"No se pudo determinar la empresa para ejecutar el subflujo.\",\n        });\n        return;\n      }\n\n      setEjecutando(true);\n      setEsperando(false);\n\n      try {\n        let grafo =\n          grafoForzado ||\n          grafoActualRef.current;\n\n        if (!grafo) {\n          agregarMensaje({\n            id: idTemporal(),\n            lado: \"sistema\",\n            tipo: \"sistema\",\n            texto:\n              \"No hay un flujo cargado para ejecutar.\",\n          });\n          return;\n        }\n\n        let actual:\n          | string\n          | null = nodoUid;\n\n        let pasosTotales = 0;\n\n        while (\n          pasosTotales < 500\n        ) {\n          /*\n           * Si terminó el grafo actual,\n           * regresamos al padre por\n           * Continuar. Si no hay padre,\n           * termina la simulación.\n           */\n          if (!actual) {\n            const frame =\n              pilaPreviewRef.current.pop();\n\n            if (!frame) {\n              agregarMensaje({\n                id: idTemporal(),\n                lado: \"sistema\",\n                tipo: \"sistema\",\n                texto:\n                  \"Fin del flujo.\",\n              });\n\n              grafoActualRef.current =\n                grafo;\n\n              return;\n            }\n\n            grafo = frame.grafo;\n\n            grafoActualRef.current =\n              grafo;\n\n            setFlujoNombre(\n              grafo.flujoNombre\n            );\n\n            agregarMensaje({\n              id: idTemporal(),\n              lado: \"sistema\",\n              tipo: \"sistema\",\n              texto:\n                `↩ Regresando a ${grafo.flujoNombre}`,\n            });\n\n            actual =\n              frame.continuarNodoUid;\n\n            /*\n             * El nodo Iniciar Flujo era\n             * el último paso del padre.\n             * En ese caso seguimos\n             * subiendo por la pila.\n             */\n            continue;\n          }\n\n          pasosTotales += 1;\n\n          const nodo =\n            grafo.nodosPorId.get(\n              actual\n            );\n\n          if (!nodo) {\n            agregarMensaje({\n              id: idTemporal(),\n              lado: \"sistema\",\n              tipo: \"sistema\",\n              texto:\n                \"El siguiente paso no existe.\",\n            });\n\n            actual = null;\n            continue;\n          }\n\n          if (\n            nodo.tipo === \"inicio\"\n          ) {\n            actual =\n              grafo.siguientePorId.get(\n                nodo.nodo_uid\n              ) || null;\n\n            continue;\n          }\n\n          if (\n            nodo.tipo ===\n            \"iniciar_flujo\"\n          ) {\n            const destinoId =\n              Number(\n                nodo.config\n                  ?.flujoDestinoId ||\n                  0\n              );\n\n            const continuar =\n              grafo.siguientePorId.get(\n                nodo.nodo_uid\n              ) || null;\n\n            if (!destinoId) {\n              agregarMensaje({\n                id: idTemporal(),\n                lado: \"sistema\",\n                tipo: \"sistema\",\n                texto:\n                  \"↗ Iniciar Flujo sin flujo seleccionado. Se continúa por la salida Continuar.\",\n              });\n\n              actual =\n                continuar;\n\n              continue;\n            }\n\n            if (\n              destinoId ===\n                grafo.flujoId ||\n              pilaPreviewRef.current\n                .length >= 20\n            ) {\n              agregarMensaje({\n                id: idTemporal(),\n                lado: \"sistema\",\n                tipo: \"sistema\",\n                texto:\n                  \"↗ Subflujo omitido para evitar un bucle.\",\n              });\n\n              actual =\n                continuar;\n\n              continue;\n            }\n\n            const yaEnPila =\n              pilaPreviewRef.current.some(\n                (frame) =>\n                  frame.grafo\n                    .flujoId ===\n                  destinoId\n              );\n\n            if (yaEnPila) {\n              agregarMensaje({\n                id: idTemporal(),\n                lado: \"sistema\",\n                tipo: \"sistema\",\n                texto:\n                  \"↗ Subflujo omitido porque produciría un ciclo entre flujos.\",\n              });\n\n              actual =\n                continuar;\n\n              continue;\n            }\n\n            try {\n              const destino =\n                await cargarGrafoPreview({\n                  empresaId,\n                  flujoId:\n                    destinoId,\n                });\n\n              pilaPreviewRef.current.push(\n                {\n                  grafo,\n                  continuarNodoUid:\n                    continuar,\n                }\n              );\n\n              grafo =\n                destino;\n\n              grafoActualRef.current =\n                destino;\n\n              setFlujoNombre(\n                `${destino.flujoNombre}`\n              );\n\n              agregarMensaje({\n                id: idTemporal(),\n                lado: \"sistema\",\n                tipo: \"sistema\",\n                texto:\n                  `↗ Iniciando flujo: ${destino.flujoNombre}`,\n              });\n\n              actual =\n                nodoInicialGrafo(\n                  destino\n                );\n\n              continue;\n            } catch (err) {\n              agregarMensaje({\n                id: idTemporal(),\n                lado: \"sistema\",\n                tipo: \"sistema\",\n                texto:\n                  err instanceof Error\n                    ? `No se pudo iniciar el subflujo: ${err.message}`\n                    : \"No se pudo iniciar el subflujo.\",\n              });\n\n              actual =\n                continuar;\n\n              continue;\n            }\n          }\n\n          if (\n            nodo.tipo === \"mensaje\"\n          ) {\n            const config =\n              nodo.config || {};\n\n            const contenidos =\n              Array.isArray(\n                config.contenidos\n              )\n                ? config.contenidos\n                : [];\n\n            if (\n              config.tipoMensaje ===\n                \"webchat\" ||\n              config.tipoMensaje ===\n                \"omnichannel\" ||\n              !config.tipoMensaje\n            ) {\n              for (\n                const contenido of contenidos\n              ) {\n                if (\n                  contenido.tipo ===\n                  \"escribiendo\"\n                ) {\n                  setEscribiendo(true);\n\n                  const segundos =\n                    Math.min(\n                      5,\n                      Math.max(\n                        0.3,\n                        Number(\n                          contenido.segundos ||\n                            1.5\n                        )\n                      )\n                    );\n\n                  await dormir(\n                    segundos * 1000\n                  );\n\n                  setEscribiendo(false);\n                  continue;\n                }\n\n                if (\n                  contenido.tipo ===\n                  \"texto\"\n                ) {\n                  agregarMensaje({\n                    id: idTemporal(),\n                    lado: \"bot\",\n                    tipo: \"texto\",\n                    texto:\n                      contenido.texto ||\n                      \"\",\n                  });\n\n                  await dormir(250);\n                  continue;\n                }\n\n                if (\n                  contenido.tipo ===\n                    \"imagen\" &&\n                  contenido.url\n                ) {\n                  agregarMensaje({\n                    id: idTemporal(),\n                    lado: \"bot\",\n                    tipo: \"imagen\",\n                    url:\n                      contenido.url,\n                  });\n\n                  await dormir(250);\n                  continue;\n                }\n\n                if (\n                  contenido.tipo ===\n                    \"video\" &&\n                  contenido.url\n                ) {\n                  agregarMensaje({\n                    id: idTemporal(),\n                    lado: \"bot\",\n                    tipo: \"video\",\n                    url:\n                      contenido.url,\n                  });\n\n                  await dormir(250);\n                  continue;\n                }\n\n                if (\n                  contenido.tipo ===\n                    \"boton\" ||\n                  contenido.tipo ===\n                    \"respuesta_rapida\"\n                ) {\n                  agregarMensaje({\n                    id: idTemporal(),\n                    lado: \"bot\",\n                    tipo: \"boton\",\n                    texto:\n                      contenido.texto ||\n                      \"Continuar\",\n                  });\n\n                  await dormir(150);\n                }\n              }\n            }\n\n            actual =\n              grafo.siguientePorId.get(\n                nodo.nodo_uid\n              ) || null;\n\n            continue;\n          }\n\n          if (\n            nodo.tipo ===\n            \"condicion\"\n          ) {\n            const grupos =\n              gruposCondicionPreview(\n                nodo.config || {}\n              );\n\n            const ahora =\n              new Date();\n\n            const contexto: Record<\n              string,\n              unknown\n            > = {\n              ultimo_mensaje:\n                ultimoTextoClienteRef.current,\n              tipo_ultimo_mensaje:\n                \"text\",\n              canal: \"webchat\",\n              flujo_id:\n                grafo.flujoId,\n              flujo_estado:\n                \"preview\",\n              hora_actual:\n                ahora.toLocaleTimeString(\n                  \"es-PE\",\n                  {\n                    hour: \"2-digit\",\n                    minute:\n                      \"2-digit\",\n                    hour12: false,\n                  }\n                ),\n              dia_semana:\n                ahora.toLocaleDateString(\n                  \"es-PE\",\n                  {\n                    weekday: \"long\",\n                  }\n                ),\n            };\n\n            let indiceCoincidente =\n              -1;\n\n            for (\n              let i = 0;\n              i < grupos.length;\n              i += 1\n            ) {\n              if (\n                evaluarGrupoCondicionPreview(\n                  grupos[i],\n                  contexto\n                )\n              ) {\n                indiceCoincidente =\n                  i;\n                break;\n              }\n            }\n\n            const salida =\n              indiceCoincidente === 0\n                ? \"si\"\n                : indiceCoincidente >\n                  0\n                ? `grupo:${\n                    grupos[\n                      indiceCoincidente\n                    ].id\n                  }`\n                : \"no\";\n\n            agregarMensaje({\n              id: idTemporal(),\n              lado: \"sistema\",\n              tipo: \"sistema\",\n              texto:\n                indiceCoincidente >= 0\n                  ? `◇ Condición → Condición ${\n                      indiceCoincidente +\n                      1\n                    }`\n                  : \"◇ Condición → NINGUNA\",\n            });\n\n            actual =\n              grafo.siguientePorHandle.get(\n                `${nodo.nodo_uid}::${salida}`\n              ) || null;\n\n            continue;\n          }\n\n          if (\n            nodo.tipo ===\n            \"accion\"\n          ) {\n            const accion =\n              nodo.config\n                ?.accionFlujo ||\n              \"activar_bot\";\n\n            if (\n              accion ===\n              \"finalizar_flujo\"\n            ) {\n              agregarMensaje({\n                id: idTemporal(),\n                lado: \"sistema\",\n                tipo: \"sistema\",\n                texto:\n                  \"✅ Aquí finalizaría el flujo. El mensaje actual no se enviaría a OpenAI.\",\n              });\n\n              return;\n            }\n\n            agregarMensaje({\n              id: idTemporal(),\n              lado: \"sistema\",\n              tipo: \"sistema\",\n              texto:\n                \"🤖 Aquí se activaría el bot con OpenAI. La vista previa no consume OpenAI.\",\n            });\n\n            return;\n          }\n\n          if (\n            nodo.tipo ===\n            \"esperar_tiempo\"\n          ) {\n            const segundos =\n              Math.min(\n                60,\n                Math.max(\n                  1,\n                  Number(\n                    nodo.config\n                      ?.esperaSegundos ||\n                      3\n                  )\n                )\n              );\n\n            agregarMensaje({\n              id: idTemporal(),\n              lado: \"sistema\",\n              tipo: \"sistema\",\n              texto:\n                `⏱ Esperando ${segundos} segundo${segundos === 1 ? \"\" : \"s\"}...`,\n            });\n\n            setEscribiendo(true);\n\n            await dormir(\n              segundos * 1000\n            );\n\n            setEscribiendo(false);\n\n            actual =\n              grafo.siguientePorId.get(\n                nodo.nodo_uid\n              ) || null;\n\n            continue;\n          }\n\n          if (\n            nodo.tipo ===\n            \"esperar_respuesta\"\n          ) {\n            nodoEsperandoRef.current =\n              nodo.nodo_uid;\n\n            grafoEsperandoRef.current =\n              grafo;\n\n            grafoActualRef.current =\n              grafo;\n\n            setEsperando(true);\n\n            return;\n          }\n\n          if (\n            nodo.tipo ===\n            \"activar_bot\"\n          ) {\n            agregarMensaje({\n              id: idTemporal(),\n              lado: \"sistema\",\n              tipo: \"sistema\",\n              texto:\n                \"🤖 Aquí se activaría el bot con OpenAI. La vista previa no consume OpenAI.\",\n            });\n\n            return;\n          }\n\n          actual =\n            grafo.siguientePorId.get(\n              nodo.nodo_uid\n            ) || null;\n        }\n\n        agregarMensaje({\n          id: idTemporal(),\n          lado: \"sistema\",\n          tipo: \"sistema\",\n          texto:\n            \"La vista previa se detuvo por alcanzar el límite de pasos.\",\n        });\n      } finally {\n        setEjecutando(false);\n      }\n    },\n    [\n      agregarMensaje,\n      ejecutando,\n      empresaId,\n    ]\n  );";
const SEND_RESPONSE = "  function enviarRespuesta() {\n    const texto =\n      input.trim();\n\n    if (\n      !texto ||\n      !esperando\n    ) {\n      return;\n    }\n\n    agregarMensaje({\n      id: idTemporal(),\n      lado: \"cliente\",\n      tipo: \"texto\",\n      texto,\n    });\n\n    ultimoTextoClienteRef.current =\n      texto;\n\n    setInput(\"\");\n    setEsperando(false);\n\n    const nodoEsperando =\n      nodoEsperandoRef.current;\n\n    const grafoEsperando =\n      grafoEsperandoRef.current;\n\n    nodoEsperandoRef.current =\n      null;\n\n    grafoEsperandoRef.current =\n      null;\n\n    const siguiente =\n      nodoEsperando &&\n      grafoEsperando\n        ? grafoEsperando\n            .siguientePorId.get(\n              nodoEsperando\n            ) || null\n        : null;\n\n    if (grafoEsperando) {\n      grafoActualRef.current =\n        grafoEsperando;\n    }\n\n    setTimeout(() => {\n      ejecutarDesde(\n        siguiente,\n        grafoEsperando\n      );\n    }, 250);\n  }";


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

/* 1) Datos del nodo */
if (
  !text.includes(
    "flujoDestinoId?:"
  )
) {
  text = mustReplace(
    text,
    /(condicionGrupos\?: GrupoCondicion\[\];)/,
    `$1
  flujoDestinoId?: number | null;
  flujoDestinoNombre?: string;`,
    "DatosNodo"
  );
}

/* 2) Helpers de grafos/subflujos */
if (
  !text.includes(
    "function crearGrafoPreview("
  )
) {
  text = mustReplace(
    text,
    /(?=export default function FlujoPreviewPage\(\))/,
    HELPERS + "\n\n",
    "antes de FlujoPreviewPage"
  );
}

/* 3) Refs de ejecución */
if (
  !text.includes(
    "const grafoActualRef ="
  )
) {
  text = mustReplace(
    text,
    /(  const ultimoTextoClienteRef =\s*\n\s*useRef\(""\);)/,
    `$1

  const grafoActualRef =
    useRef<GrafoPreview | null>(
      null
    );

  const grafoEsperandoRef =
    useRef<GrafoPreview | null>(
      null
    );

  const pilaPreviewRef =
    useRef<FramePreview[]>([]);`,
    "refs preview"
  );
}

/* 4) Reemplazar motor ejecutarDesde */
text = mustReplace(
  text,
  /  const ejecutarDesde = useCallback\([\s\S]*?\n  \);\n\n(?=  useEffect\(\(\) => \{\s*\n\s*if \(\s*\n\s*!empresaId)/,
  RUNTIME + "\n\n",
  "ejecutarDesde completo"
);

/* 5) Guardar grafo raíz al cargar */
if (
  !text.includes(
    "grafoActualRef.current =\n          crearGrafoPreview"
  )
) {
  text = mustReplace(
    text,
    /(        setConexiones\(\s*\n\s*data\.conexiones \|\| \[\]\s*\n\s*\);)/,
    `$1

        grafoActualRef.current =
          crearGrafoPreview({
            flujoId,
            flujoNombre:
              data.flujo?.nombre ||
              "Vista previa",
            nodos:
              data.nodos || [],
            conexiones:
              data.conexiones || [],
          });

        pilaPreviewRef.current =
          [];

        grafoEsperandoRef.current =
          null;`,
    "grafo raíz en cargar"
  );
}

/* 6) Enviar respuesta dentro del grafo que espera */
text = mustReplace(
  text,
  /  function enviarRespuesta\(\) \{[\s\S]*?\n  \}\n\n(?=  return \()/,
  SEND_RESPONSE + "\n\n",
  "enviarRespuesta"
);

fs.writeFileSync(
  file,
  text,
  "utf8"
);

console.log("");
console.log(
  "✅ Vista previa de ↗ Iniciar Flujo aplicada."
);
console.log(
  "✅ El subflujo se carga y ejecuta en Webchat."
);
console.log(
  "✅ Esperar respuesta funciona dentro del subflujo."
);
console.log(
  "✅ Al terminar naturalmente regresa al padre por Continuar."
);
console.log(
  "✅ Protección contra ciclos entre flujos agregada."
);
console.log("");
console.log("Valida:");
console.log("npm run build");
