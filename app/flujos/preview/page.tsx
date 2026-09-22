"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ContenidoNodo = {
  id: string;
  tipo:
    | "texto"
    | "imagen"
    | "video"
    | "escribiendo"
    | "boton"
    | "respuesta_rapida";
  texto?: string;
  url?: string;
  segundos?: number;
};

type OperadorCondicion =
  | "igual"
  | "no_igual"
  | "contiene"
  | "no_contiene"
  | "empieza_con"
  | "termina_con"
  | "tiene_valor"
  | "sin_valor"
  | "mayor_que"
  | "menor_que"
  | "mayor_igual"
  | "menor_igual";

type CampoCondicion = string;

type ReglaCondicion = {
  id: string;
  campo: CampoCondicion;
  operador: OperadorCondicion;
  valor?: string;
};

type GrupoCondicion = {
  id: string;
  modo: "todas" | "cualquiera";
  reglas: ReglaCondicion[];
};

type DatosNodo = {
  titulo?: string;
  contenidos?: ContenidoNodo[];
  subtitulo?: string;
  tipoMensaje?: "omnichannel" | "webchat";
  esperaSegundos?: number;
  accionFlujo?:
    | "activar_bot"
    | "finalizar_flujo";
  condicionOperador?: OperadorCondicion;
  condicionValor?: string;
  condicionGrupos?: GrupoCondicion[];
  flujoDestinoId?: number | null;
  flujoDestinoNombre?: string;
};

type NodoFlujo = {
  nodo_uid: string;
  tipo: string;
  config: DatosNodo;
};

type ConexionFlujo = {
  source_uid: string;
  target_uid: string;
  source_handle?: string | null;
  target_handle?: string | null;
};

type MensajePreview =
  | {
      id: string;
      lado: "bot";
      tipo: "texto";
      texto: string;
    }
  | {
      id: string;
      lado: "bot";
      tipo: "imagen";
      url: string;
    }
  | {
      id: string;
      lado: "bot";
      tipo: "video";
      url: string;
    }
  | {
      id: string;
      lado: "bot";
      tipo: "boton";
      texto: string;
    }
  | {
      id: string;
      lado: "cliente";
      tipo: "texto";
      texto: string;
    }
  | {
      id: string;
      lado: "sistema";
      tipo: "sistema";
      texto: string;
    };

function idTemporal() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function dormir(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function normalizarCondicionPreview(
  valor: unknown
) {
  return String(
    valor == null ? "" : valor
  )
    .trim()
    .toLocaleLowerCase("es");
}

function gruposCondicionPreview(
  config: DatosNodo
): GrupoCondicion[] {
  if (
    Array.isArray(config?.condicionGrupos) &&
    config.condicionGrupos.length > 0
  ) {
    return config.condicionGrupos;
  }

  return [
    {
      id: "legacy",
      modo: "todas",
      reglas: [
        {
          id: "legacy-regla",
          campo: "ultimo_mensaje",
          operador:
            config?.condicionOperador ||
            "contiene",
          valor:
            config?.condicionValor || "",
        },
      ],
    },
  ];
}

function evaluarReglaCondicionPreview(
  actualRaw: unknown,
  operador: OperadorCondicion,
  esperadoRaw: unknown
) {
  const tieneActual =
    actualRaw !== null &&
    actualRaw !== undefined &&
    String(actualRaw).trim() !== "";

  if (operador === "tiene_valor") {
    return tieneActual;
  }

  if (operador === "sin_valor") {
    return !tieneActual;
  }

  const actual =
    normalizarCondicionPreview(
      actualRaw
    );

  const esperado =
    normalizarCondicionPreview(
      esperadoRaw
    );

  if (!esperado) {
    return false;
  }

  if (operador === "igual") {
    return actual === esperado;
  }

  if (operador === "no_igual") {
    return actual !== esperado;
  }

  if (operador === "contiene") {
    return actual.includes(esperado);
  }

  if (operador === "no_contiene") {
    return !actual.includes(esperado);
  }

  if (operador === "empieza_con") {
    return actual.startsWith(esperado);
  }

  if (operador === "termina_con") {
    return actual.endsWith(esperado);
  }

  const numeroActual = Number(
    String(actualRaw)
      .replace(",", ".")
  );

  const numeroEsperado = Number(
    String(esperadoRaw)
      .replace(",", ".")
  );

  if (
    !Number.isFinite(numeroActual) ||
    !Number.isFinite(numeroEsperado)
  ) {
    return false;
  }

  if (operador === "mayor_que") {
    return numeroActual >
      numeroEsperado;
  }

  if (operador === "menor_que") {
    return numeroActual <
      numeroEsperado;
  }

  if (operador === "mayor_igual") {
    return numeroActual >=
      numeroEsperado;
  }

  if (operador === "menor_igual") {
    return numeroActual <=
      numeroEsperado;
  }

  return false;
}

function evaluarGrupoCondicionPreview(
  grupo: GrupoCondicion,
  contexto: Record<string, unknown>
) {
  const reglas = Array.isArray(
    grupo?.reglas
  )
    ? grupo.reglas
    : [];

  if (reglas.length === 0) {
    return false;
  }

  const resultados = reglas.map(
    (regla) =>
      evaluarReglaCondicionPreview(
        contexto[regla.campo],
        regla.operador,
        regla.valor
      )
  );

  return grupo.modo ===
    "cualquiera"
    ? resultados.some(Boolean)
    : resultados.every(Boolean);
}

type GrafoPreview = {
  flujoId: number;
  flujoNombre: string;
  nodos: NodoFlujo[];
  conexiones: ConexionFlujo[];
  nodosPorId: Map<string, NodoFlujo>;
  siguientePorId: Map<string, string>;
  siguientePorHandle: Map<string, string>;
};

type FramePreview = {
  grafo: GrafoPreview;
  continuarNodoUid: string | null;
};

function crearGrafoPreview({
  flujoId,
  flujoNombre,
  nodos,
  conexiones,
}: {
  flujoId: number;
  flujoNombre: string;
  nodos: NodoFlujo[];
  conexiones: ConexionFlujo[];
}): GrafoPreview {
  const nodosPorId =
    new Map<string, NodoFlujo>();

  for (const nodo of nodos) {
    nodosPorId.set(
      nodo.nodo_uid,
      nodo
    );
  }

  const siguientePorId =
    new Map<string, string>();

  const siguientePorHandle =
    new Map<string, string>();

  for (
    const conexion of conexiones
  ) {
    if (
      !siguientePorId.has(
        conexion.source_uid
      )
    ) {
      siguientePorId.set(
        conexion.source_uid,
        conexion.target_uid
      );
    }

    if (
      conexion.source_handle
    ) {
      siguientePorHandle.set(
        `${conexion.source_uid}::${conexion.source_handle}`,
        conexion.target_uid
      );
    }
  }

  return {
    flujoId,
    flujoNombre,
    nodos,
    conexiones,
    nodosPorId,
    siguientePorId,
    siguientePorHandle,
  };
}

async function cargarGrafoPreview({
  empresaId,
  flujoId,
}: {
  empresaId: number;
  flujoId: number;
}) {
  const response = await fetch(
    `/api/flujos?empresa_id=${empresaId}&id=${flujoId}`,
    {
      cache: "no-store",
    }
  );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.success
  ) {
    throw new Error(
      data.error ||
        "No se pudo cargar el flujo."
    );
  }

  return crearGrafoPreview({
    flujoId,
    flujoNombre:
      data.flujo?.nombre ||
      `Flujo ${flujoId}`,
    nodos:
      Array.isArray(data.nodos)
        ? data.nodos
        : [],
    conexiones:
      Array.isArray(
        data.conexiones
      )
        ? data.conexiones
        : [],
  });
}

function nodoInicialGrafo(
  grafo: GrafoPreview
) {
  return (
    grafo.nodos.find(
      (nodo) =>
        nodo.tipo === "inicio"
    )?.nodo_uid ||
    grafo.nodos[0]?.nodo_uid ||
    null
  );
}

export default function FlujoPreviewPage() {
  const [empresaId, setEmpresaId] =
    useState<number | null>(null);

  const [flujoId, setFlujoId] =
    useState<number | null>(null);

  const [nodoInicialId, setNodoInicialId] =
    useState("");

  const [flujoNombre, setFlujoNombre] =
    useState("Vista previa");

  const [nodos, setNodos] = useState<
    NodoFlujo[]
  >([]);

  const [conexiones, setConexiones] =
    useState<ConexionFlujo[]>([]);

  const [mensajes, setMensajes] =
    useState<MensajePreview[]>([]);

  const [esperando, setEsperando] =
    useState(false);

const [
  botPreviewActivo,
  setBotPreviewActivo,
] = useState(false);

  const [ejecutando, setEjecutando] =
    useState(false);

  const [escribiendo, setEscribiendo] =
    useState(false);

  const [input, setInput] =
    useState("");

  const [error, setError] =
    useState("");

  const [cargando, setCargando] =
    useState(true);

const memoriaBotRef = useRef<
  Record<string, unknown>
>({
  paso: "conversacion",
  contexto: {
    presentacion_enviada: true,
  },
});

const historialBotRef = useRef<
  Array<{
    rol: "cliente" | "bot";
    texto: string;
  }>
>([]);

  const nodoEsperandoRef =
    useRef<string | null>(null);

  const ultimoTextoClienteRef =
    useRef("");

  const grafoActualRef =
    useRef<GrafoPreview | null>(
      null
    );

  const grafoEsperandoRef =
    useRef<GrafoPreview | null>(
      null
    );

  const pilaPreviewRef =
    useRef<FramePreview[]>([]);

  const inicializadoRef =
    useRef(false);

  const finalRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const empresa = Number(
      params.get("empresa_id") || 0
    );

    const flujo = Number(
      params.get("flujo_id") || 0
    );

    const nodo =
      params.get("nodo_uid") || "";

    setEmpresaId(
      empresa || null
    );

    setFlujoId(
      flujo || null
    );

    setNodoInicialId(nodo);
  }, []);

  useEffect(() => {
    finalRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [
    mensajes,
    escribiendo,
  ]);

  const nodosPorId = useMemo(
    () =>
      new Map(
        nodos.map((nodo) => [
          nodo.nodo_uid,
          nodo,
        ])
      ),
    [nodos]
  );

  const siguientePorId = useMemo(() => {
    const mapa =
      new Map<string, string>();

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
  }, [conexiones]);

  const siguientePorHandle = useMemo(
    () => {
      const mapa =
        new Map<string, string>();

      for (
        const conexion of conexiones
      ) {
        if (
          !conexion.source_handle
        ) {
          continue;
        }

        mapa.set(
          `${conexion.source_uid}::${conexion.source_handle}`,
          conexion.target_uid
        );
      }

      return mapa;
    },
    [conexiones]
  );

const agregarMensaje = useCallback(
  (mensaje: MensajePreview) => {
    if (
      mensaje.tipo === "texto" &&
      (
        mensaje.lado === "bot" ||
        mensaje.lado === "cliente"
      )
    ) {
      historialBotRef.current = [
        ...historialBotRef.current,
        {
          rol: mensaje.lado,
          texto: mensaje.texto,
        },
      ].slice(-30);
    }

    setMensajes((actuales) => [
      ...actuales,
      mensaje,
    ]);
  },
  []
);

const consultarBotPreview =
  useCallback(
    async (textoCliente: string) => {
      const texto =
        String(
          textoCliente || ""
        ).trim();

      if (
        !texto ||
        !empresaId
      ) {
        setEsperando(true);
        return;
      }

      try {
        setEjecutando(true);
        setEsperando(false);
        setEscribiendo(true);

        const response =
          await fetch(
            "/api/flujos/preview-ia",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                empresaId,
                texto,
                memoria:
                  memoriaBotRef.current,
                historial:
                  historialBotRef.current,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data?.ok
        ) {
          throw new Error(
            data?.error ||
              "No se pudo consultar al bot."
          );
        }

        const resultado =
          data?.resultado;

        if (!resultado) {
          throw new Error(
            "El bot no devolvió una respuesta."
          );
        }

        if (
          resultado.memoria &&
          typeof resultado.memoria ===
            "object"
        ) {
          memoriaBotRef.current =
            resultado.memoria;
        }

        setEscribiendo(false);

        const apertura =
          String(
            resultado.apertura || ""
          ).trim();

        if (apertura) {
          agregarMensaje({
            id: idTemporal(),
            lado: "bot",
            tipo: "texto",
            texto: apertura,
          });
        }

        const mensaje =
          String(
            resultado.mensaje || ""
          ).trim();

        if (mensaje) {
          agregarMensaje({
            id: idTemporal(),
            lado: "bot",
            tipo: "texto",
            texto: mensaje,
          });
        }

        if (
          resultado.multimedia &&
          resultado.multimedia !==
            "ninguno"
        ) {
          agregarMensaje({
            id: idTemporal(),
            lado: "sistema",
            tipo: "sistema",
            texto:
              `Multimedia solicitada por IA: ${resultado.multimedia}`,
          });
        }

        setBotPreviewActivo(true);

        // El chat queda abierto
        // para seguir conversando.
        setEsperando(true);
      } catch (error) {
        setEscribiendo(false);

        console.error(
          "ERROR BOT PREVIEW:",
          error
        );

        agregarMensaje({
          id: idTemporal(),
          lado: "sistema",
          tipo: "sistema",
          texto:
            error instanceof Error
              ? `Error IA: ${error.message}`
              : "Error consultando al bot.",
        });

        setEsperando(true);
      } finally {
        setEjecutando(false);
      }
    },
    [
      agregarMensaje,
      empresaId,
    ]
  );

  const ejecutarDesde = useCallback(
    async (
      nodoUid: string | null,
      grafoForzado?: GrafoPreview | null
    ) => {
      if (
        !nodoUid ||
        ejecutando
      ) {
        return;
      }

      if (!empresaId) {
        agregarMensaje({
          id: idTemporal(),
          lado: "sistema",
          tipo: "sistema",
          texto:
            "No se pudo determinar la empresa para ejecutar el subflujo.",
        });
        return;
      }

      setEjecutando(true);
      setEsperando(false);

      try {
        let grafo =
          grafoForzado ||
          grafoActualRef.current;

        if (!grafo) {
          agregarMensaje({
            id: idTemporal(),
            lado: "sistema",
            tipo: "sistema",
            texto:
              "No hay un flujo cargado para ejecutar.",
          });
          return;
        }

        let actual:
          | string
          | null = nodoUid;

        let pasosTotales = 0;

        while (
          pasosTotales < 500
        ) {
          /*
           * Si terminó el grafo actual,
           * regresamos al padre por
           * Continuar. Si no hay padre,
           * termina la simulación.
           */
          if (!actual) {
            const frame =
              pilaPreviewRef.current.pop();

            if (!frame) {
              agregarMensaje({
                id: idTemporal(),
                lado: "sistema",
                tipo: "sistema",
                texto:
                  "Fin del flujo.",
              });

              grafoActualRef.current =
                grafo;

              return;
            }

            grafo = frame.grafo;

            grafoActualRef.current =
              grafo;

            setFlujoNombre(
              grafo.flujoNombre
            );

            agregarMensaje({
              id: idTemporal(),
              lado: "sistema",
              tipo: "sistema",
              texto:
                `↩ Regresando a ${grafo.flujoNombre}`,
            });

            actual =
              frame.continuarNodoUid;

            /*
             * El nodo Iniciar Flujo era
             * el último paso del padre.
             * En ese caso seguimos
             * subiendo por la pila.
             */
            continue;
          }

          pasosTotales += 1;

          const nodo =
            grafo.nodosPorId.get(
              actual
            );

          if (!nodo) {
            agregarMensaje({
              id: idTemporal(),
              lado: "sistema",
              tipo: "sistema",
              texto:
                "El siguiente paso no existe.",
            });

            actual = null;
            continue;
          }

          if (
            nodo.tipo === "inicio"
          ) {
            actual =
              grafo.siguientePorId.get(
                nodo.nodo_uid
              ) || null;

            continue;
          }

          if (
            nodo.tipo ===
            "iniciar_flujo"
          ) {
            const destinoId =
              Number(
                nodo.config
                  ?.flujoDestinoId ||
                  0
              );

            const continuar =
              grafo.siguientePorId.get(
                nodo.nodo_uid
              ) || null;

            if (!destinoId) {
              agregarMensaje({
                id: idTemporal(),
                lado: "sistema",
                tipo: "sistema",
                texto:
                  "↗ Iniciar Flujo sin flujo seleccionado. Se continúa por la salida Continuar.",
              });

              actual =
                continuar;

              continue;
            }

            if (
              destinoId ===
                grafo.flujoId ||
              pilaPreviewRef.current
                .length >= 20
            ) {
              agregarMensaje({
                id: idTemporal(),
                lado: "sistema",
                tipo: "sistema",
                texto:
                  "↗ Subflujo omitido para evitar un bucle.",
              });

              actual =
                continuar;

              continue;
            }

            const yaEnPila =
              pilaPreviewRef.current.some(
                (frame) =>
                  frame.grafo
                    .flujoId ===
                  destinoId
              );

            if (yaEnPila) {
              agregarMensaje({
                id: idTemporal(),
                lado: "sistema",
                tipo: "sistema",
                texto:
                  "↗ Subflujo omitido porque produciría un ciclo entre flujos.",
              });

              actual =
                continuar;

              continue;
            }

            try {
              const destino =
                await cargarGrafoPreview({
                  empresaId,
                  flujoId:
                    destinoId,
                });

              pilaPreviewRef.current.push(
                {
                  grafo,
                  continuarNodoUid:
                    continuar,
                }
              );

              grafo =
                destino;

              grafoActualRef.current =
                destino;

              setFlujoNombre(
                `${destino.flujoNombre}`
              );

              agregarMensaje({
                id: idTemporal(),
                lado: "sistema",
                tipo: "sistema",
                texto:
                  `↗ Iniciando flujo: ${destino.flujoNombre}`,
              });

              actual =
                nodoInicialGrafo(
                  destino
                );

              continue;
            } catch (err) {
              agregarMensaje({
                id: idTemporal(),
                lado: "sistema",
                tipo: "sistema",
                texto:
                  err instanceof Error
                    ? `No se pudo iniciar el subflujo: ${err.message}`
                    : "No se pudo iniciar el subflujo.",
              });

              actual =
                continuar;

              continue;
            }
          }

          if (
            nodo.tipo === "mensaje"
          ) {
            const config =
              nodo.config || {};

            const contenidos =
              Array.isArray(
                config.contenidos
              )
                ? config.contenidos
                : [];

            if (
              config.tipoMensaje ===
                "webchat" ||
              config.tipoMensaje ===
                "omnichannel" ||
              !config.tipoMensaje
            ) {
              for (
                const contenido of contenidos
              ) {
                if (
                  contenido.tipo ===
                  "escribiendo"
                ) {
                  setEscribiendo(true);

                  const segundos =
                    Math.min(
                      5,
                      Math.max(
                        0.3,
                        Number(
                          contenido.segundos ||
                            1.5
                        )
                      )
                    );

                  await dormir(
                    segundos * 1000
                  );

                  setEscribiendo(false);
                  continue;
                }

                if (
                  contenido.tipo ===
                  "texto"
                ) {
                  agregarMensaje({
                    id: idTemporal(),
                    lado: "bot",
                    tipo: "texto",
                    texto:
                      contenido.texto ||
                      "",
                  });

                  await dormir(250);
                  continue;
                }

                if (
                  contenido.tipo ===
                    "imagen" &&
                  contenido.url
                ) {
                  agregarMensaje({
                    id: idTemporal(),
                    lado: "bot",
                    tipo: "imagen",
                    url:
                      contenido.url,
                  });

                  await dormir(250);
                  continue;
                }

                if (
                  contenido.tipo ===
                    "video" &&
                  contenido.url
                ) {
                  agregarMensaje({
                    id: idTemporal(),
                    lado: "bot",
                    tipo: "video",
                    url:
                      contenido.url,
                  });

                  await dormir(250);
                  continue;
                }

                if (
                  contenido.tipo ===
                    "boton" ||
                  contenido.tipo ===
                    "respuesta_rapida"
                ) {
                  agregarMensaje({
                    id: idTemporal(),
                    lado: "bot",
                    tipo: "boton",
                    texto:
                      contenido.texto ||
                      "Continuar",
                  });

                  await dormir(150);
                }
              }
            }

            actual =
              grafo.siguientePorId.get(
                nodo.nodo_uid
              ) || null;

            continue;
          }

          if (
            nodo.tipo ===
            "condicion"
          ) {
            const grupos =
              gruposCondicionPreview(
                nodo.config || {}
              );

            const ahora =
              new Date();

            const contexto: Record<
              string,
              unknown
            > = {
              ultimo_mensaje:
                ultimoTextoClienteRef.current,
              tipo_ultimo_mensaje:
                "text",
              canal: "webchat",
              flujo_id:
                grafo.flujoId,
              flujo_estado:
                "preview",
              hora_actual:
                ahora.toLocaleTimeString(
                  "es-PE",
                  {
                    hour: "2-digit",
                    minute:
                      "2-digit",
                    hour12: false,
                  }
                ),
              dia_semana:
                ahora.toLocaleDateString(
                  "es-PE",
                  {
                    weekday: "long",
                  }
                ),
            };

            let indiceCoincidente =
              -1;

            for (
              let i = 0;
              i < grupos.length;
              i += 1
            ) {
              if (
                evaluarGrupoCondicionPreview(
                  grupos[i],
                  contexto
                )
              ) {
                indiceCoincidente =
                  i;
                break;
              }
            }

            const salida =
              indiceCoincidente === 0
                ? "si"
                : indiceCoincidente >
                  0
                ? `grupo:${
                    grupos[
                      indiceCoincidente
                    ].id
                  }`
                : "no";

            agregarMensaje({
              id: idTemporal(),
              lado: "sistema",
              tipo: "sistema",
              texto:
                indiceCoincidente >= 0
                  ? `◇ Condición → Condición ${
                      indiceCoincidente +
                      1
                    }`
                  : "◇ Condición → NINGUNA",
            });

            actual =
              grafo.siguientePorHandle.get(
                `${nodo.nodo_uid}::${salida}`
              ) || null;

            continue;
          }

          if (
            nodo.tipo ===
            "accion"
          ) {
            const accion =
              nodo.config
                ?.accionFlujo ||
              "activar_bot";

            if (
              accion ===
              "finalizar_flujo"
            ) {
              agregarMensaje({
                id: idTemporal(),
                lado: "sistema",
                tipo: "sistema",
                texto:
                  "✅ Aquí finalizaría el flujo. El mensaje actual no se enviaría a OpenAI.",
              });

              return;
            }

            setBotPreviewActivo(true);

agregarMensaje({
  id: idTemporal(),
  lado: "sistema",
  tipo: "sistema",
  texto:
    "🤖 Bot con OpenAI activado.",
});

if (
  ultimoTextoClienteRef.current
    .trim()
) {
  await consultarBotPreview(
    ultimoTextoClienteRef.current
  );
} else {
  setEsperando(true);
}

return;
          }

          if (
            nodo.tipo ===
            "esperar_tiempo"
          ) {
            const segundos =
              Math.min(
                60,
                Math.max(
                  1,
                  Number(
                    nodo.config
                      ?.esperaSegundos ||
                      3
                  )
                )
              );

            agregarMensaje({
              id: idTemporal(),
              lado: "sistema",
              tipo: "sistema",
              texto:
                `⏱ Esperando ${segundos} segundo${segundos === 1 ? "" : "s"}...`,
            });

            setEscribiendo(true);

            await dormir(
              segundos * 1000
            );

            setEscribiendo(false);

            actual =
              grafo.siguientePorId.get(
                nodo.nodo_uid
              ) || null;

            continue;
          }

          if (
            nodo.tipo ===
            "esperar_respuesta"
          ) {
            nodoEsperandoRef.current =
              nodo.nodo_uid;

            grafoEsperandoRef.current =
              grafo;

            grafoActualRef.current =
              grafo;

            setEsperando(true);

            return;
          }

          if (
  nodo.tipo ===
  "activar_bot"
) {
  setBotPreviewActivo(true);

  agregarMensaje({
    id: idTemporal(),
    lado: "sistema",
    tipo: "sistema",
    texto:
      "🤖 Bot con OpenAI activado.",
  });

  if (
    ultimoTextoClienteRef.current
      .trim()
  ) {
    await consultarBotPreview(
      ultimoTextoClienteRef.current
    );
  } else {
    setEsperando(true);
  }

  return;
} 

          actual =
  grafo?.siguientePorId.get(
    nodo.nodo_uid
  ) || null;
        }

        agregarMensaje({
          id: idTemporal(),
          lado: "sistema",
          tipo: "sistema",
          texto:
            "La vista previa se detuvo por alcanzar el límite de pasos.",
        });
      } finally {
        setEjecutando(false);
      }
    },
    [
  agregarMensaje,
  consultarBotPreview,
  ejecutando,
  empresaId,
]
  );

  useEffect(() => {
    if (
      !empresaId ||
      !flujoId
    ) {
      if (
        empresaId !== null ||
        flujoId !== null
      ) {
        setError(
          "Faltan datos para cargar la vista previa."
        );
        setCargando(false);
      }

      return;
    }

    let cancelado = false;

    async function cargar() {
      try {
        setCargando(true);

        const response = await fetch(
          `/api/flujos?empresa_id=${empresaId}&id=${flujoId}`,
          {
            cache: "no-store",
          }
        );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "No se pudo cargar el flujo."
          );
        }

        if (cancelado) return;

        setFlujoNombre(
          data.flujo?.nombre ||
            "Vista previa"
        );

        setNodos(
          data.nodos || []
        );

        setConexiones(
          data.conexiones || []
        );

grafoActualRef.current =
  crearGrafoPreview({
    flujoId: Number(flujoId),
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
          null;
      } catch (err) {
        if (cancelado) return;

        setError(
          err instanceof Error
            ? err.message
            : "Error cargando el flujo."
        );
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    cargar();

    return () => {
      cancelado = true;
    };
  }, [empresaId, flujoId]);

  useEffect(() => {
    if (
      cargando ||
      error ||
      inicializadoRef.current ||
      nodos.length === 0
    ) {
      return;
    }

    inicializadoRef.current = true;

    const inicio =
      nodoInicialId ||
      nodos.find(
        (nodo) =>
          nodo.tipo === "inicio"
      )?.nodo_uid ||
      nodos[0]?.nodo_uid ||
      "";

    ejecutarDesde(
      inicio || null
    );
  }, [
    cargando,
    error,
    nodos,
    nodoInicialId,
    ejecutarDesde,
  ]);

  function enviarRespuesta() {
    const texto =
      input.trim();

    if (
      !texto ||
      !esperando
    ) {
      return;
    }

    agregarMensaje({
      id: idTemporal(),
      lado: "cliente",
      tipo: "texto",
      texto,
    });

    ultimoTextoClienteRef.current =
      texto;

    setInput("");
    setEsperando(false);

if (botPreviewActivo) {
  void consultarBotPreview(
    texto
  );

  return;
}

    const nodoEsperando =
      nodoEsperandoRef.current;

    const grafoEsperando =
      grafoEsperandoRef.current;

    nodoEsperandoRef.current =
      null;

    grafoEsperandoRef.current =
      null;

    const siguiente =
      nodoEsperando &&
      grafoEsperando
        ? grafoEsperando
            .siguientePorId.get(
              nodoEsperando
            ) || null
        : null;

    if (grafoEsperando) {
      grafoActualRef.current =
        grafoEsperando;
    }

    setTimeout(() => {
      ejecutarDesde(
        siguiente,
        grafoEsperando
      );
    }, 250);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black">
              Kafes CRM
            </p>

            <p className="text-xs text-slate-500">
              Vista previa · {flujoNombre}
            </p>
          </div>

          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
            Webchat
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">
        {cargando ? (
          <div className="flex flex-1 items-center justify-center text-slate-500">
            Cargando vista previa...
          </div>
        ) : error ? (
          <div className="mx-auto mt-10 max-w-xl rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
            {error}
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 pb-28">
              {mensajes.map(
                (mensaje) => {
                  if (
                    mensaje.lado ===
                    "sistema"
                  ) {
                    return (
                      <div
                        key={mensaje.id}
                        className="mx-auto max-w-xl rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-800"
                      >
                        {mensaje.texto}
                      </div>
                    );
                  }

                  const cliente =
                    mensaje.lado ===
                    "cliente";

                  return (
                    <div
                      key={mensaje.id}
                      className={`flex ${
                        cliente
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] ${
                          cliente
                            ? "rounded-2xl rounded-br-md bg-blue-600 px-4 py-2 text-white"
                            : "text-slate-900"
                        }`}
                      >
                        {mensaje.tipo ===
                        "texto" ? (
                          <p className="whitespace-pre-wrap text-sm">
                            {mensaje.texto}
                          </p>
                        ) : mensaje.tipo ===
                          "imagen" ? (
                          <img
                            src={
                              mensaje.url
                            }
                            alt=""
                            className="max-h-[480px] max-w-full rounded-xl object-contain shadow-sm"
                          />
                        ) : mensaje.tipo ===
                          "video" ? (
                          <video
                            src={
                              mensaje.url
                            }
                            controls
                            className="max-h-[480px] max-w-full rounded-xl bg-black shadow-sm"
                          />
                        ) : mensaje.tipo ===
                          "boton" ? (
                          <button
                            type="button"
                            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm"
                          >
                            {mensaje.texto}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                }
              )}

              {escribiendo && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
                    Escribiendo...
                  </div>
                </div>
              )}

              <div ref={finalRef} />
            </div>

            <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 py-4 backdrop-blur">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    value={input}
                    onChange={(e) =>
                      setInput(
                        e.target.value
                      )
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key ===
                          "Enter" &&
                        !e.shiftKey
                      ) {
                        e.preventDefault();
                        enviarRespuesta();
                      }
                    }}
                    disabled={!esperando}
                    placeholder={
                      esperando
                        ? "Escribe una respuesta de prueba..."
                        : ejecutando
                        ? "El flujo está ejecutándose..."
                        : "El flujo no está esperando una respuesta."
                    }
                    rows={1}
                    className="min-h-12 w-full resize-none rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <button
                  type="button"
                  onClick={
                    enviarRespuesta
                  }
                  disabled={
                    !esperando ||
                    !input.trim()
                  }
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-40"
                >
                  Enviar
                </button>
              </div>

              <p className="mt-2 text-center text-[11px] text-slate-400">
                Simulación local. No envía WhatsApp y no consume OpenAI.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
