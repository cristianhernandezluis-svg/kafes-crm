const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "app", "flujos", "page.tsx");
const backup = path.join(process.cwd(), "app", "flujos", "page.tsx.backup-barra-nodos");

if (!fs.existsSync(file)) {
  console.error("No existe:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

if (s.includes("function BarraAccionesNodo(")) {
  console.log("La barra de acciones ya parece estar aplicada.");
  process.exit(0);
}

fs.copyFileSync(file, backup);

function replaceOnce(oldText, newText, label) {
  if (!s.includes(oldText)) {
    console.error("No encontre el bloque:", label);
    console.error("Backup:", backup);
    process.exit(1);
  }
  s = s.replace(oldText, newText);
}

// 1) Importar NodeToolbar.
replaceOnce(
`  Handle,
  Position,`,
`  Handle,
  NodeToolbar,
  Position,`,
"import NodeToolbar"
);

// 2) Insertar barra contextual antes de NodoInicio.
replaceOnce(
`function NodoInicio({`,
`type AccionNodo =
  | "preview"
  | "inicial"
  | "id"
  | "renombrar"
  | "duplicar"
  | "eliminar";

function dispararAccionNodo(
  nodeId: string,
  accion: AccionNodo
) {
  window.dispatchEvent(
    new CustomEvent("flujo:accion-nodo", {
      detail: {
        nodeId,
        accion,
      },
    })
  );
}

function BarraAccionesNodo({
  nodeId,
  selected,
}: {
  nodeId: string;
  selected: boolean;
}) {
  if (!selected) return null;

  const acciones: Array<{
    accion: AccionNodo;
    icono: string;
    titulo: string;
  }> = [
    {
      accion: "preview",
      icono: "👁",
      titulo: "Vista previa",
    },
    {
      accion: "inicial",
      icono: "▶",
      titulo: "Asignar como paso inicial",
    },
    {
      accion: "id",
      icono: "ID",
      titulo: "Obtener ID de Paso",
    },
    {
      accion: "renombrar",
      icono: "T",
      titulo: "Renombrar",
    },
    {
      accion: "duplicar",
      icono: "⧉",
      titulo: "Duplicar",
    },
    {
      accion: "eliminar",
      icono: "🗑",
      titulo: "Eliminar",
    },
  ];

  return (
    <NodeToolbar
      isVisible={selected}
      position={Position.Top}
    >
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
        {acciones.map((item) => (
          <button
            key={item.accion}
            type="button"
            title={item.titulo}
            onClick={(e) => {
              e.stopPropagation();
              dispararAccionNodo(
                nodeId,
                item.accion
              );
            }}
            className="flex h-7 min-w-7 items-center justify-center rounded px-1 text-[10px] font-black text-slate-700 hover:bg-orange-50 hover:text-orange-600"
          >
            {item.icono}
          </button>
        ))}
      </div>
    </NodeToolbar>
  );
}

function NodoInicio({`,
"BarraAccionesNodo"
);

// 3) Agregar id a los cuatro componentes.
replaceOnce(
`function NodoInicio({
  data,
  selected,
}: NodeProps) {`,
`function NodoInicio({
  id,
  data,
  selected,
}: NodeProps) {`,
"NodoInicio id"
);

replaceOnce(
`function NodoMensaje({
  data,
  selected,
}: NodeProps) {`,
`function NodoMensaje({
  id,
  data,
  selected,
}: NodeProps) {`,
"NodoMensaje id"
);

replaceOnce(
`function NodoEsperar({
  data,
  selected,
}: NodeProps) {`,
`function NodoEsperar({
  id,
  data,
  selected,
}: NodeProps) {`,
"NodoEsperar id"
);

replaceOnce(
`function NodoBot({
  data,
  selected,
}: NodeProps) {`,
`function NodoBot({
  id,
  data,
  selected,
}: NodeProps) {`,
"NodoBot id"
);

// 4) Barra dentro de cada nodo.
replaceOnce(
`    >
      <div className="absolute -top-6 left-1 text-[10px] font-bold text-orange-500">`,
`    >
      <BarraAccionesNodo
        nodeId={id}
        selected={selected}
      />

      <div className="absolute -top-6 left-1 text-[10px] font-bold text-orange-500">`,
"NodoInicio toolbar"
);

replaceOnce(
`    >
      <Handle
        type="target"
        position={Position.Left}`,
`    >
      <BarraAccionesNodo
        nodeId={id}
        selected={selected}
      />

      <Handle
        type="target"
        position={Position.Left}`,
"NodoMensaje toolbar",
);

// El replace anterior entra en el primer nodo con Handle target tras NodoMensaje.
// Insertar las otras dos barras buscando desde las funciones.
function insertToolbarInFunction(functionName) {
  const start = s.indexOf(`function ${functionName}({`);
  if (start < 0) {
    console.error("No encontre funcion:", functionName);
    process.exit(1);
  }
  const divStart = s.indexOf("    <div\n", start);
  const openEnd = s.indexOf("    >\n", divStart);
  if (divStart < 0 || openEnd < 0) {
    console.error("No encontre div principal:", functionName);
    process.exit(1);
  }
  const pos = openEnd + "    >\n".length;
  const after = s.slice(pos, pos + 120);
  if (after.includes("<BarraAccionesNodo")) return;
  const toolbar = `      <BarraAccionesNodo
        nodeId={id}
        selected={selected}
      />

`;
  s = s.slice(0, pos) + toolbar + s.slice(pos);
}

insertToolbarInFunction("NodoEsperar");
insertToolbarInFunction("NodoBot");

// 5) Permitir renombrar esperar y bot.
replaceOnce(
`          ⏸ Esperar respuesta`,
`          ⏸ {d.titulo || "Esperar respuesta"}`,
"NodoEsperar titulo"
);

replaceOnce(
`        🤖 Activar bot`,
`        🤖 {d.titulo || "Activar bot"}`,
"NodoBot titulo"
);

// 6) Estado de vista previa.
replaceOnce(
`  const [guardando, setGuardando] =
    useState(false);`,
`  const [guardando, setGuardando] =
    useState(false);

  const [
    nodoPreviewId,
    setNodoPreviewId,
  ] = useState<string | null>(null);`,
"estado preview"
);

// 7) Acciones de nodos después del memo nodoSeleccionado.
const memoAnchor = `  const nodoSeleccionado = useMemo(
    () =>
      nodes.find(
        (nodo) =>
          nodo.id ===
          nodoSeleccionadoId
      ) || null,
    [nodes, nodoSeleccionadoId]
  );`;

if (!s.includes(memoAnchor)) {
  console.error("No encontre nodoSeleccionado memo.");
  console.error("Backup:", backup);
  process.exit(1);
}

const actionsBlock = memoAnchor + `

  const nodoPreview = useMemo(
    () =>
      nodes.find(
        (nodo) =>
          nodo.id === nodoPreviewId
      ) || null,
    [nodes, nodoPreviewId]
  );

  useEffect(() => {
    const manejarAccion = (
      event: Event
    ) => {
      const detalle = (
        event as CustomEvent<{
          nodeId?: string;
          accion?: AccionNodo;
        }>
      ).detail;

      const nodeId = String(
        detalle?.nodeId || ""
      );

      const accion =
        detalle?.accion;

      if (!nodeId || !accion) return;

      const nodo = nodes.find(
        (item) => item.id === nodeId
      );

      if (!nodo) return;

      if (accion === "preview") {
        setNodoPreviewId(nodeId);
        return;
      }

      if (accion === "inicial") {
        if (nodo.type === "inicio") {
          alert(
            "Este nodo ya es el paso inicial."
          );
          return;
        }

        const inicio = nodes.find(
          (item) =>
            item.type === "inicio"
        );

        if (!inicio) {
          alert(
            "No se encontro el nodo Paso inicial."
          );
          return;
        }

        setEdges((actuales) => [
          ...actuales.filter(
            (edge) =>
              edge.source !== inicio.id
          ),
          {
            id: idNuevo("conexion"),
            source: inicio.id,
            target: nodeId,
            type: "smoothstep",
          },
        ]);

        alert(
          "Paso inicial actualizado."
        );
        return;
      }

      if (accion === "id") {
        navigator.clipboard
          .writeText(nodeId)
          .then(() =>
            alert(
              \`ID copiado: \${nodeId}\`
            )
          )
          .catch(() =>
            alert(
              \`ID del paso: \${nodeId}\`
            )
          );

        return;
      }

      if (accion === "renombrar") {
        const data =
          nodo.data as DatosNodo;

        const nombreActual =
          data.titulo ||
          (nodo.type ===
          "esperar_respuesta"
            ? "Esperar respuesta"
            : nodo.type ===
              "activar_bot"
            ? "Activar bot"
            : nodo.type === "inicio"
            ? "Paso inicial"
            : "Enviar mensaje");

        const nuevoNombre =
          window.prompt(
            "Nuevo nombre del paso:",
            nombreActual
          );

        if (
          !nuevoNombre ||
          !nuevoNombre.trim()
        ) {
          return;
        }

        setNodes((actuales) =>
          actuales.map((item) =>
            item.id === nodeId
              ? {
                  ...item,
                  data: {
                    ...item.data,
                    titulo:
                      nuevoNombre.trim(),
                  },
                }
              : item
          )
        );

        return;
      }

      if (accion === "duplicar") {
        if (nodo.type === "inicio") {
          alert(
            "Paso inicial no se puede duplicar."
          );
          return;
        }

        const nuevoId = idNuevo(
          String(
            nodo.type || "nodo"
          )
        );

        const dataClonada =
          JSON.parse(
            JSON.stringify(
              nodo.data || {}
            )
          );

        if (
          dataClonada?.titulo
        ) {
          dataClonada.titulo =
            \`\${dataClonada.titulo} copia\`;
        }

        setNodes((actuales) => [
          ...actuales,
          {
            ...nodo,
            id: nuevoId,
            selected: false,
            position: {
              x:
                Number(
                  nodo.position.x || 0
                ) + 50,
              y:
                Number(
                  nodo.position.y || 0
                ) + 50,
            },
            data: dataClonada,
          },
        ]);

        setNodoSeleccionadoId(
          nuevoId
        );

        return;
      }

      if (accion === "eliminar") {
        if (nodo.type === "inicio") {
          alert(
            "Paso inicial no se puede eliminar."
          );
          return;
        }

        const confirmar =
          window.confirm(
            "¿Eliminar este paso y sus conexiones?"
          );

        if (!confirmar) return;

        setNodes((actuales) =>
          actuales.filter(
            (item) =>
              item.id !== nodeId
          )
        );

        setEdges((actuales) =>
          actuales.filter(
            (edge) =>
              edge.source !== nodeId &&
              edge.target !== nodeId
          )
        );

        if (
          nodoSeleccionadoId ===
          nodeId
        ) {
          setNodoSeleccionadoId(
            null
          );
        }

        if (
          nodoPreviewId === nodeId
        ) {
          setNodoPreviewId(null);
        }
      }
    };

    window.addEventListener(
      "flujo:accion-nodo",
      manejarAccion
    );

    return () => {
      window.removeEventListener(
        "flujo:accion-nodo",
        manejarAccion
      );
    };
  }, [
    nodes,
    nodoSeleccionadoId,
    nodoPreviewId,
  ]);`;

s = s.replace(memoAnchor, actionsBlock);

// 8) Modal de vista previa justo antes del cierre principal.
const returnEnd = `      </main>
    </div>
  );
}`;

if (!s.includes(returnEnd)) {
  console.error("No encontre cierre principal del componente.");
  console.error("Backup:", backup);
  process.exit(1);
}

const modalBlock = `      </main>

      {nodoPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-orange-500">
                  Vista previa
                </p>

                <h2 className="text-lg font-black">
                  {(
                    nodoPreview.data as DatosNodo
                  ).titulo ||
                    (nodoPreview.type ===
                    "esperar_respuesta"
                      ? "Esperar respuesta"
                      : nodoPreview.type ===
                        "activar_bot"
                      ? "Activar bot"
                      : nodoPreview.type ===
                        "inicio"
                      ? "Paso inicial"
                      : "Enviar mensaje")}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setNodoPreviewId(null)
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black"
              >
                Cerrar
              </button>
            </div>

            {nodoPreview.type ===
            "mensaje" ? (
              <div className="space-y-3">
                {(
                  (
                    nodoPreview.data as DatosNodo
                  ).contenidos || []
                ).length === 0 ? (
                  <div className="rounded-xl bg-slate-100 p-5 text-center text-sm text-slate-500">
                    Este paso no tiene contenido.
                  </div>
                ) : (
                  (
                    (
                      nodoPreview.data as DatosNodo
                    ).contenidos || []
                  ).map((contenido) => (
                    <PreviewContenido
                      key={contenido.id}
                      contenido={contenido}
                    />
                  ))
                )}
              </div>
            ) : nodoPreview.type ===
              "esperar_respuesta" ? (
              <div className="rounded-xl bg-slate-100 p-5 text-sm">
                El flujo se detiene aquí hasta que el cliente responda.
              </div>
            ) : nodoPreview.type ===
              "activar_bot" ? (
              <div className="rounded-xl bg-green-50 p-5 text-sm text-green-800">
                Desde este punto se activa el bot con OpenAI.
              </div>
            ) : (
              <div className="rounded-xl bg-slate-100 p-5 text-sm">
                Paso inicial del flujo.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}`;

s = s.replace(returnEnd, modalBlock);

// 9) Verificaciones.
const required = [
  "function BarraAccionesNodo(",
  'accion: "preview"',
  'accion: "inicial"',
  'accion: "id"',
  'accion: "renombrar"',
  'accion: "duplicar"',
  'accion: "eliminar"',
  "Vista previa",
  "Paso inicial actualizado.",
];

for (const item of required) {
  if (!s.includes(item)) {
    console.error("Fallo verificacion:", item);
    console.error("Backup:", backup);
    process.exit(1);
  }
}

fs.writeFileSync(file, s, "utf8");

console.log("OK - barra contextual de nodos agregada.");
console.log("Incluye: Vista previa, Paso inicial, ID, Renombrar, Duplicar y Eliminar.");
console.log("Backup:", backup);
console.log("Siguiente paso: npm run build");
