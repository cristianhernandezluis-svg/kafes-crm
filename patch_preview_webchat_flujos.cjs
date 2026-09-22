const fs = require("fs");
const path = require("path");

const root = process.cwd();

const editorFile = path.join(
  root,
  "app",
  "flujos",
  "page.tsx"
);

const previewDir = path.join(
  root,
  "app",
  "flujos",
  "preview"
);

const previewFile = path.join(
  previewDir,
  "page.tsx"
);

const backup =
  editorFile + ".backup-preview-webchat";

if (!fs.existsSync(editorFile)) {
  console.error("No existe:", editorFile);
  process.exit(1);
}

let s = fs
  .readFileSync(editorFile, "utf8")
  .replace(/\r\n/g, "\n");

fs.copyFileSync(editorFile, backup);

// Reemplazar el modal de vista previa interno por selector de canal.
const modalStart = s.indexOf(
  `      {nodoPreview && (`
);

const modalEndMarker = `      )}
    </div>
  );
}`;

const modalEnd = s.indexOf(
  modalEndMarker,
  modalStart
);

if (modalStart < 0 || modalEnd < 0) {
  console.error(
    "No pude localizar el modal actual de Vista previa."
  );
  console.error("Backup:", backup);
  process.exit(1);
}

const nuevoModal = `      {nodoPreview && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/45 p-4 pt-10">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Seleccionar Canal
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Vista previa desde este paso
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setNodoPreviewId(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="p-7">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-slate-900 text-2xl">
                    ▣
                  </div>

                  <div>
                    <p className="font-semibold">
                      Webchat
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Simula el flujo sin enviar mensajes reales.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      !empresaId ||
                      !flujoActivo ||
                      !nodoPreviewId
                    ) {
                      return;
                    }

                    const params =
                      new URLSearchParams({
                        empresa_id:
                          String(empresaId),
                        flujo_id:
                          String(
                            flujoActivo.id
                          ),
                        nodo_uid:
                          nodoPreviewId,
                      });

                    window.open(
                      \`/flujos/preview?\${params.toString()}\`,
                      "_blank",
                      "noopener,noreferrer"
                    );

                    setNodoPreviewId(null);
                  }}
                  className="rounded-lg bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

s =
  s.slice(0, modalStart) +
  nuevoModal +
  s.slice(
    modalEnd + modalEndMarker.length
  );

fs.writeFileSync(editorFile, s, "utf8");

fs.mkdirSync(previewDir, {
  recursive: true,
});

const previewSource = `"use client";

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

type DatosNodo = {
  titulo?: string;
  contenidos?: ContenidoNodo[];
  subtitulo?: string;
  tipoMensaje?: "omnichannel" | "webchat";
};

type NodoFlujo = {
  nodo_uid: string;
  tipo: string;
  config: DatosNodo;
};

type ConexionFlujo = {
  source_uid: string;
  target_uid: string;
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
  return \`\${Date.now()}-\${Math.random()
    .toString(36)
    .slice(2, 8)}\`;
}

function dormir(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
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

  const nodoEsperandoRef =
    useRef<string | null>(null);

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

  const agregarMensaje = useCallback(
    (mensaje: MensajePreview) => {
      setMensajes((actuales) => [
        ...actuales,
        mensaje,
      ]);
    },
    []
  );

  const ejecutarDesde = useCallback(
    async (
      nodoUid: string | null
    ) => {
      if (
        !nodoUid ||
        ejecutando
      ) {
        return;
      }

      setEjecutando(true);
      setEsperando(false);

      try {
        let actual:
          | string
          | null = nodoUid;

        for (
          let pasos = 0;
          pasos < 100 && actual;
          pasos += 1
        ) {
          const nodo =
            nodosPorId.get(actual);

          if (!nodo) {
            agregarMensaje({
              id: idTemporal(),
              lado: "sistema",
              tipo: "sistema",
              texto:
                "El siguiente paso no existe.",
            });

            break;
          }

          if (
            nodo.tipo === "inicio"
          ) {
            actual =
              siguientePorId.get(
                nodo.nodo_uid
              ) || null;

            continue;
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
              siguientePorId.get(
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

            setEsperando(true);

            return;
          }

          if (
            nodo.tipo ===
            "activar_bot"
          ) {
            agregarMensaje({
              id: idTemporal(),
              lado: "sistema",
              tipo: "sistema",
              texto:
                "🤖 Aquí se activaría el bot con OpenAI. La vista previa no consume OpenAI.",
            });

            return;
          }

          actual =
            siguientePorId.get(
              nodo.nodo_uid
            ) || null;
        }

        agregarMensaje({
          id: idTemporal(),
          lado: "sistema",
          tipo: "sistema",
          texto: "Fin del flujo.",
        });
      } finally {
        setEjecutando(false);
      }
    },
    [
      agregarMensaje,
      ejecutando,
      nodosPorId,
      siguientePorId,
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
          \`/api/flujos?empresa_id=\${empresaId}&id=\${flujoId}\`,
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

    setInput("");
    setEsperando(false);

    const nodoEsperando =
      nodoEsperandoRef.current;

    nodoEsperandoRef.current =
      null;

    const siguiente =
      nodoEsperando
        ? siguientePorId.get(
            nodoEsperando
          ) || null
        : null;

    setTimeout(() => {
      ejecutarDesde(siguiente);
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
                      className={\`flex \${
                        cliente
                          ? "justify-end"
                          : "justify-start"
                      }\`}
                    >
                      <div
                        className={\`max-w-[80%] \${
                          cliente
                            ? "rounded-2xl rounded-br-md bg-blue-600 px-4 py-2 text-white"
                            : "text-slate-900"
                        }\`}
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
`;

fs.writeFileSync(
  previewFile,
  previewSource,
  "utf8"
);

console.log(
  "OK - Vista previa Webchat agregada."
);
console.log(
  "Editor actualizado:",
  editorFile
);
console.log(
  "Nueva pagina:",
  previewFile
);
console.log(
  "Backup:",
  backup
);
console.log(
  "Siguiente paso: npm run build"
);
