const fs = require("fs");
const path = require("path");

const root = process.cwd();

const editorFile = path.join(root, "app", "flujos", "page.tsx");
const previewFile = path.join(root, "app", "flujos", "preview", "page.tsx");
const motorFile = path.join(root, "app", "whatsapp-qr-server", "bot", "flujos.mjs");

const backups = [
  [editorFile, editorFile + ".backup-esperar-tiempo"],
  [previewFile, previewFile + ".backup-esperar-tiempo"],
  [motorFile, motorFile + ".backup-esperar-tiempo"],
];

for (const [file] of backups) {
  if (!fs.existsSync(file)) {
    console.error("No existe:", file);
    process.exit(1);
  }
}

for (const [file, backup] of backups) {
  fs.copyFileSync(file, backup);
}

let editor = fs.readFileSync(editorFile, "utf8").replace(/\r\n/g, "\n");
let preview = fs.readFileSync(previewFile, "utf8").replace(/\r\n/g, "\n");
let motor = fs.readFileSync(motorFile, "utf8").replace(/\r\n/g, "\n");

if (
  editor.includes('esperar_tiempo: NodoEsperarTiempo') &&
  preview.includes('nodo.tipo ===\n            "esperar_tiempo"') &&
  motor.includes('nodo.tipo ===\n      "esperar_tiempo"')
) {
  console.log("El nodo Esperar ya parece estar implementado.");
  process.exit(0);
}

function replaceOnce(source, oldText, newText, label) {
  if (!source.includes(oldText)) {
    console.error("No encontre el bloque:", label);
    process.exit(1);
  }
  return source.replace(oldText, newText);
}

// EDITOR
editor = replaceOnce(
  editor,
`  tipoMensaje?: "omnichannel" | "webchat";
};`,
`  tipoMensaje?: "omnichannel" | "webchat";
  esperaSegundos?: number;
};`,
  "DatosNodo esperaSegundos"
);

const nodeTypesAnchor = `const nodeTypes = {`;
if (!editor.includes(nodeTypesAnchor)) {
  console.error("No encontre const nodeTypes.");
  process.exit(1);
}

const esperarComponent = `function NodoEsperarTiempo({
  id,
  data,
  selected,
}: NodeProps) {
  const d = data as DatosNodo;

  const segundos = Math.max(
    1,
    Number(d.esperaSegundos || 3)
  );

  return (
    <div
      className={\`min-w-[220px] rounded-xl bg-white text-slate-900 shadow-lg \${
        selected
          ? "border-2 border-orange-500"
          : "border border-amber-400"
      }\`}
    >
      <BarraAccionesNodo
        nodeId={id}
        selected={selected}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-white"
      />

      <div className="rounded-t-xl bg-amber-100 px-4 py-2 text-xs font-black text-amber-800">
        ⏱ {d.titulo || "Esperar"}
      </div>

      <div className="px-4 py-3">
        <p className="text-[11px] text-slate-500">
          Pausar {segundos} segundo
          {segundos === 1 ? "" : "s"}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-white"
      />
    </div>
  );
}

`;

editor = editor.replace(nodeTypesAnchor, esperarComponent + nodeTypesAnchor);

editor = replaceOnce(
  editor,
`  mensaje: NodoMensaje,
  esperar_respuesta: NodoEsperar,`,
`  mensaje: NodoMensaje,
  esperar_tiempo: NodoEsperarTiempo,
  esperar_respuesta: NodoEsperar,`,
  "nodeTypes esperar_tiempo"
);

const agregarEsperarAnchor = `  const agregarPasoEsperar = () => {`;
if (!editor.includes(agregarEsperarAnchor)) {
  console.error("No encontre agregarPasoEsperar.");
  process.exit(1);
}

const agregarEsperaTiempo = `  const agregarPasoEsperaTiempo = () => {
    if (!flujoActivo) return;

    const id = idNuevo("esperar-tiempo");
    const position =
      obtenerPosicionNuevoPaso();

    setNodes((actuales) => [
      ...actuales,
      {
        id,
        type: "esperar_tiempo",
        position,
        data: {
          titulo: "Esperar",
          esperaSegundos: 3,
        },
      },
    ]);

    setNodoSeleccionadoId(id);
  };

`;

editor = editor.replace(
  agregarEsperarAnchor,
  agregarEsperaTiempo + agregarEsperarAnchor
);

// Menu button before Esperar respuesta button.
const targetText = "Esperar respuesta";
const labelIndex = editor.indexOf(targetText);
if (labelIndex < 0) {
  console.error("No encontre Esperar respuesta.");
  process.exit(1);
}
const btnStart = editor.lastIndexOf("<button", labelIndex);
if (btnStart < 0) {
  console.error("No encontre boton Esperar respuesta.");
  process.exit(1);
}

const waitButton = `                <button
                  onClick={
                    agregarPasoEsperaTiempo
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm"
                >
                  ⏱ Esperar
                </button>

`;

editor =
  editor.slice(0, btnStart) +
  waitButton +
  editor.slice(btnStart);

// Specific editor before generic non-message editor.
const genericRegex = /\{nodoSeleccionado\s*&&\s*nodoSeleccionado\.type\s*!==\s*"mensaje"\s*&&\s*\(/m;
const genericMatch = editor.match(genericRegex);
if (!genericMatch || genericMatch.index == null) {
  console.error("No encontre editor generico.");
  process.exit(1);
}

const specificEditor = `          {nodoSeleccionado?.type ===
            "esperar_tiempo" && (
            <div className="p-4">
              <button
                onClick={() =>
                  setNodoSeleccionadoId(
                    null
                  )
                }
                className="mb-4 text-xs text-orange-500"
              >
                ← Volver
              </button>

              <p className="text-xs font-black">
                ESPERAR
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Pausa el flujo antes de continuar al siguiente paso.
              </p>

              <label className="mt-5 block text-xs font-bold text-slate-500">
                Duración en segundos
              </label>

              <input
                type="number"
                min="1"
                max="60"
                step="1"
                value={
                  (
                    nodoSeleccionado.data as DatosNodo
                  ).esperaSegundos || 3
                }
                onChange={(e) =>
                  actualizarDataNodo({
                    esperaSegundos:
                      Math.min(
                        60,
                        Math.max(
                          1,
                          Number(
                            e.target.value ||
                              1
                          )
                        )
                      ),
                  })
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              />

              <p className="mt-2 text-[11px] text-slate-500">
                Por ahora admite de 1 a 60 segundos.
              </p>
            </div>
          )}

`;

editor =
  editor.slice(0, genericMatch.index) +
  specificEditor +
  editor.slice(genericMatch.index);

editor = editor.replace(
  genericRegex,
`{nodoSeleccionado &&
            nodoSeleccionado.type !==
              "mensaje" &&
            nodoSeleccionado.type !==
              "esperar_tiempo" && (`
);

// PREVIEW
const previewAnchor = `          if (
            nodo.tipo ===
            "esperar_respuesta"
          ) {`;

if (!preview.includes(previewAnchor)) {
  console.error("No encontre esperar_respuesta en preview.");
  process.exit(1);
}

const previewWait = `          if (
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
                \`⏱ Esperando \${segundos} segundo\${segundos === 1 ? "" : "s"}...\`,
            });

            setEscribiendo(true);

            await dormir(
              segundos * 1000
            );

            setEscribiendo(false);

            actual =
              siguientePorId.get(
                nodo.nodo_uid
              ) || null;

            continue;
          }

`;

preview = preview.replace(
  previewAnchor,
  previewWait + previewAnchor
);

// MOTOR QR
const motorAnchor = `    if (
      nodo.tipo ===
      "esperar_respuesta"
    ) {`;

if (!motor.includes(motorAnchor)) {
  console.error("No encontre esperar_respuesta en motor QR.");
  process.exit(1);
}

const motorWait = `    if (
      nodo.tipo ===
      "esperar_tiempo"
    ) {
      const segundos =
        Math.min(
          60,
          Math.max(
            1,
            numeroSeguro(
              nodo.config
                ?.esperaSegundos,
              3
            )
          )
        );

      console.log(
        "FLUJO ESPERANDO:",
        {
          clienteId,
          flujoId,
          nodoUid:
            nodo.nodo_uid,
          segundos,
        }
      );

      await dormir(
        segundos * 1000
      );

      nodoActual =
        siguiente.get(
          nodo.nodo_uid
        ) || null;

      continue;
    }

`;

motor = motor.replace(
  motorAnchor,
  motorWait + motorAnchor
);

// Save.
fs.writeFileSync(editorFile, editor, "utf8");
fs.writeFileSync(previewFile, preview, "utf8");
fs.writeFileSync(motorFile, motor, "utf8");

console.log("OK - nodo Esperar implementado.");
console.log("Editor: 1 a 60 segundos.");
console.log("Preview Webchat: respeta la pausa.");
console.log("Motor QR: respeta la pausa.");
console.log("Valida con:");
console.log("node --check app\\whatsapp-qr-server\\bot\\flujos.mjs");
console.log("npm run build");
