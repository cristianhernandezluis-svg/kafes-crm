const fs = require("fs");
const path = require("path");

const root = process.cwd();

const editorFile = path.join(
  root,
  "app",
  "flujos",
  "page.tsx"
);

const previewFile = path.join(
  root,
  "app",
  "flujos",
  "preview",
  "page.tsx"
);

const motorFile = path.join(
  root,
  "app",
  "whatsapp-qr-server",
  "bot",
  "flujos.mjs"
);

const files = [
  editorFile,
  previewFile,
  motorFile,
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error("No existe:", file);
    process.exit(1);
  }
}

for (const file of files) {
  fs.copyFileSync(
    file,
    file + ".backup-nodo-acciones"
  );
}

let editor = fs
  .readFileSync(editorFile, "utf8")
  .replace(/\r\n/g, "\n");

let preview = fs
  .readFileSync(previewFile, "utf8")
  .replace(/\r\n/g, "\n");

let motor = fs
  .readFileSync(motorFile, "utf8")
  .replace(/\r\n/g, "\n");

function fail(msg) {
  console.error(msg);
  console.error(
    "No se completó el parche."
  );
  process.exit(1);
}

function replaceOnce(
  source,
  oldText,
  newText,
  label
) {
  if (!source.includes(oldText)) {
    fail(
      "No encontré el bloque: " +
        label
    );
  }

  return source.replace(
    oldText,
    newText
  );
}

// =====================================================
// 1. EDITOR /flujos
// =====================================================

if (
  !editor.includes(
    'accionFlujo?: "activar_bot" | "finalizar_flujo";'
  )
) {
  editor = replaceOnce(
    editor,
`  esperaSegundos?: number;
};`,
`  esperaSegundos?: number;
  accionFlujo?:
    | "activar_bot"
    | "finalizar_flujo";
};`,
    "DatosNodo accionFlujo"
  );
}

if (
  !editor.includes(
    "function NodoAccion("
  )
) {
  const anchor =
    "function NodoEsperarTiempo({";

  if (!editor.includes(anchor)) {
    fail(
      "No encontré NodoEsperarTiempo."
    );
  }

  const componente = `function NodoAccion({
  id,
  data,
  selected,
}: NodeProps) {
  const d = data as DatosNodo;

  const accion =
    d.accionFlujo ||
    "activar_bot";

  const descripcion =
    accion === "finalizar_flujo"
      ? "Finalizar flujo"
      : "Activar bot";

  return (
    <div
      className={\`min-w-[220px] rounded-xl bg-white text-slate-900 shadow-lg \${
        selected
          ? "border-2 border-orange-500"
          : "border border-violet-300"
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

      <div className="rounded-t-xl bg-violet-100 px-4 py-2 text-xs font-black text-violet-800">
        ⚙ {d.titulo || "Acciones"}
      </div>

      <div className="px-4 py-3">
        <p className="text-[11px] text-slate-500">
          {descripcion}
        </p>
      </div>

      {accion !== "finalizar_flujo" && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !bg-white"
        />
      )}
    </div>
  );
}

`;

  editor = editor.replace(
    anchor,
    componente + anchor
  );
}

if (
  !editor.includes(
    "accion: NodoAccion"
  )
) {
  editor = replaceOnce(
    editor,
`  mensaje: NodoMensaje,
  esperar_tiempo: NodoEsperarTiempo,`,
`  mensaje: NodoMensaje,
  accion: NodoAccion,
  esperar_tiempo: NodoEsperarTiempo,`,
    "nodeTypes accion"
  );
}

if (
  !editor.includes(
    "const agregarPasoAccion = () =>"
  )
) {
  const anchor =
    "  const agregarPasoEsperaTiempo = () => {";

  if (!editor.includes(anchor)) {
    fail(
      "No encontré agregarPasoEsperaTiempo."
    );
  }

  const funcion = `  const agregarPasoAccion = () => {
    if (!flujoActivo) return;

    const id = idNuevo("accion");
    const position =
      obtenerPosicionNuevoPaso();

    setNodes((actuales) => [
      ...actuales,
      {
        id,
        type: "accion",
        position,
        data: {
          titulo: "Acciones",
          accionFlujo:
            "activar_bot",
        },
      },
    ]);

    setNodoSeleccionadoId(id);
  };

`;

  editor = editor.replace(
    anchor,
    funcion + anchor
  );
}

// Botón del menú, exactamente antes de "Esperar".
if (
  !editor.includes(
    "agregarPasoAccion\n"
  ) &&
  !editor.includes(
    "agregarPasoAccion\r\n"
  )
) {
  // Esto solo sirve como salvaguarda; la función ya existe.
}

const menuAnchor = `                <button
                  onClick={
                    agregarPasoEsperaTiempo
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm"
                >
                  ⏱ Esperar
                </button>`;

if (
  !editor.includes(
    "⚙ Acciones"
  )
) {
  if (!editor.includes(menuAnchor)) {
    fail(
      "No encontré el botón ⏱ Esperar del menú."
    );
  }

  const boton = `                <button
                  onClick={
                    agregarPasoAccion
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm"
                >
                  ⚙ Acciones
                </button>

`;

  editor = editor.replace(
    menuAnchor,
    boton + menuAnchor
  );
}

// Editor lateral del nodo Acción.
if (
  !editor.includes(
    "ACCIÓN DEL FLUJO"
  )
) {
  const editorAnchor = `          {nodoSeleccionado?.type ===
            "esperar_tiempo" && (`;

  if (!editor.includes(editorAnchor)) {
    fail(
      "No encontré el editor del nodo Esperar."
    );
  }

  const bloque = `          {nodoSeleccionado?.type ===
            "accion" && (
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
                ACCIÓN DEL FLUJO
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Ejecuta una acción sin enviar un mensaje al cliente.
              </p>

              <label className="mt-5 block text-xs font-bold text-slate-500">
                Acción
              </label>

              <select
                value={
                  (
                    nodoSeleccionado.data as DatosNodo
                  ).accionFlujo ||
                  "activar_bot"
                }
                onChange={(e) =>
                  actualizarDataNodo({
                    accionFlujo:
                      e.target.value as
                        | "activar_bot"
                        | "finalizar_flujo",
                  })
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              >
                <option value="activar_bot">
                  Activar bot
                </option>

                <option value="finalizar_flujo">
                  Finalizar flujo
                </option>
              </select>

              <div className="mt-4 rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
                {(
                  nodoSeleccionado.data as DatosNodo
                ).accionFlujo ===
                "finalizar_flujo"
                  ? "Finaliza este flujo sin enviar el mensaje actual a OpenAI. El siguiente mensaje del cliente ya podrá continuar con el bot normal."
                  : "Finaliza el flujo y permite que el mensaje actual continúe hacia el bot con OpenAI."}
              </div>
            </div>
          )}

`;

  editor = editor.replace(
    editorAnchor,
    bloque + editorAnchor
  );
}

// Excluir Acción del editor genérico.
const genericOld = `{nodoSeleccionado &&
            nodoSeleccionado.type !==
              "mensaje" &&
            nodoSeleccionado.type !==
              "esperar_tiempo" && (`;

const genericNew = `{nodoSeleccionado &&
            nodoSeleccionado.type !==
              "mensaje" &&
            nodoSeleccionado.type !==
              "accion" &&
            nodoSeleccionado.type !==
              "esperar_tiempo" && (`;

if (
  editor.includes(genericOld)
) {
  editor = editor.replace(
    genericOld,
    genericNew
  );
}

// =====================================================
// 2. PREVIEW WEBCHAT
// =====================================================

if (
  !preview.includes(
    'accionFlujo?: "activar_bot" | "finalizar_flujo";'
  )
) {
  preview = replaceOnce(
    preview,
`  esperaSegundos?: number;
};`,
`  esperaSegundos?: number;
  accionFlujo?:
    | "activar_bot"
    | "finalizar_flujo";
};`,
    "DatosNodo preview accionFlujo"
  );
}

if (
  !preview.includes(
    'nodo.tipo ===\n            "accion"'
  )
) {
  const anchor = `          if (
            nodo.tipo ===
            "esperar_tiempo"
          ) {`;

  if (!preview.includes(anchor)) {
    fail(
      "No encontré esperar_tiempo en preview."
    );
  }

  const bloque = `          if (
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

            agregarMensaje({
              id: idTemporal(),
              lado: "sistema",
              tipo: "sistema",
              texto:
                "🤖 Aquí se activaría el bot con OpenAI. La vista previa no consume OpenAI.",
            });

            return;
          }

`;

  preview = preview.replace(
    anchor,
    bloque + anchor
  );
}

// =====================================================
// 3. MOTOR QR
// =====================================================

if (
  !motor.includes(
    'nodo.tipo ===\n      "accion"'
  )
) {
  const anchor = `    if (
      nodo.tipo ===
      "esperar_tiempo"
    ) {`;

  if (!motor.includes(anchor)) {
    fail(
      "No encontré esperar_tiempo en el motor QR."
    );
  }

  const bloque = `    if (
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
          consumido: true,
          botActivado: false,
          motivo:
            "finalizar_flujo",
          flujoId,
          flujoNombre:
            cargado.flujo.nombre,
        };
      }

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
        motivo:
          "accion_activar_bot",
        flujoId,
        flujoNombre:
          cargado.flujo.nombre,
      };
    }

`;

  motor = motor.replace(
    anchor,
    bloque + anchor
  );
}

// =====================================================
// 4. VALIDACIONES
// =====================================================

const checksEditor = [
  'accionFlujo?:',
  "function NodoAccion(",
  "accion: NodoAccion",
  "const agregarPasoAccion = () =>",
  "⚙ Acciones",
  "ACCIÓN DEL FLUJO",
  'value="activar_bot"',
  'value="finalizar_flujo"',
];

const checksPreview = [
  '"accion"',
  "Aquí finalizaría el flujo",
  "Aquí se activaría el bot con OpenAI",
];

const checksMotor = [
  '"finalizar_flujo"',
  '"accion_activar_bot"',
  "consumido: true",
  "botActivado: false",
];

for (const item of checksEditor) {
  if (!editor.includes(item)) {
    fail(
      "Fallo validación editor: " +
        item
    );
  }
}

for (const item of checksPreview) {
  if (!preview.includes(item)) {
    fail(
      "Fallo validación preview: " +
        item
    );
  }
}

for (const item of checksMotor) {
  if (!motor.includes(item)) {
    fail(
      "Fallo validación motor: " +
        item
    );
  }
}

fs.writeFileSync(
  editorFile,
  editor,
  "utf8"
);

fs.writeFileSync(
  previewFile,
  preview,
  "utf8"
);

fs.writeFileSync(
  motorFile,
  motor,
  "utf8"
);

console.log(
  "OK - nodo ⚙ Acciones implementado."
);
console.log(
  "Acciones disponibles:"
);
console.log(
  " - Activar bot: el mensaje actual continúa a OpenAI."
);
console.log(
  " - Finalizar flujo: termina el flujo sin mandar el mensaje actual a OpenAI."
);
console.log(
  "Backups creados con sufijo .backup-nodo-acciones"
);
console.log(
  "Valida con:"
);
console.log(
  "node --check app\\whatsapp-qr-server\\bot\\flujos.mjs"
);
console.log(
  "npm run build"
);
