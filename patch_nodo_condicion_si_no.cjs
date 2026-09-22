const fs = require("fs");
const path = require("path");

const root = process.cwd();

const editorFile = path.join(root, "app", "flujos", "page.tsx");
const previewFile = path.join(root, "app", "flujos", "preview", "page.tsx");
const motorFile = path.join(root, "app", "whatsapp-qr-server", "bot", "flujos.mjs");
const serverFile = path.join(root, "app", "whatsapp-qr-server", "server.mjs");

const files = [editorFile, previewFile, motorFile, serverFile];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error("No existe:", file);
    process.exit(1);
  }
}

for (const file of files) {
  fs.copyFileSync(file, file + ".backup-condicion-si-no");
}

let editor = fs.readFileSync(editorFile, "utf8").replace(/\r\n/g, "\n");
let preview = fs.readFileSync(previewFile, "utf8").replace(/\r\n/g, "\n");
let motor = fs.readFileSync(motorFile, "utf8").replace(/\r\n/g, "\n");
let server = fs.readFileSync(serverFile, "utf8").replace(/\r\n/g, "\n");

function fail(msg) {
  console.error("ERROR:", msg);
  console.error("No se completó el parche.");
  process.exit(1);
}

function replaceOnce(source, oldText, newText, label) {
  if (!source.includes(oldText)) {
    fail("No encontré el bloque: " + label);
  }
  return source.replace(oldText, newText);
}

// ============================================================
// 1) SERVER: pasar el texto actual del cliente al motor de flujo
// ============================================================

if (!server.includes("textoCliente: textoGuardado ||")) {
  server = replaceOnce(
    server,
`        clienteId,
        telefono,
        jidRespuesta: jidFlujo,`,
`        clienteId,
        telefono,
        textoCliente:
          textoGuardado || "",
        jidRespuesta: jidFlujo,`,
    "server -> procesarFlujoCliente textoCliente"
  );
}

// ============================================================
// 2) MOTOR QR: recibir texto + salidas por handle + condición
// ============================================================

if (!motor.includes("textoCliente = \"\"")) {
  motor = replaceOnce(
    motor,
`  clienteId,
  telefono,
  jidRespuesta,`,
`  clienteId,
  telefono,
  textoCliente = "",
  jidRespuesta,`,
    "firma procesarFlujoCliente"
  );
}

if (!motor.includes("function construirSiguientePorHandle(")) {
  const anchor = `async function cargarFlujo(`;

  if (!motor.includes(anchor)) {
    fail("No encontré cargarFlujo para insertar helpers de condición.");
  }

  const helpers = `function construirSiguientePorHandle(
  conexiones
) {
  const mapa = new Map();

  for (
    const conexion of conexiones
  ) {
    const handle =
      conexion.source_handle ||
      "";

    if (!handle) continue;

    mapa.set(
      \`\${conexion.source_uid}::\${handle}\`,
      conexion.target_uid
    );
  }

  return mapa;
}

function normalizarCondicion(
  valor = ""
) {
  return String(valor)
    .trim()
    .toLocaleLowerCase("es");
}

function evaluarCondicionTexto({
  texto,
  operador,
  valor,
}) {
  const actual =
    normalizarCondicion(texto);

  const esperado =
    normalizarCondicion(valor);

  if (!esperado) {
    return false;
  }

  if (operador === "igual") {
    return actual === esperado;
  }

  if (
    operador === "no_contiene"
  ) {
    return !actual.includes(
      esperado
    );
  }

  if (
    operador === "empieza_con"
  ) {
    return actual.startsWith(
      esperado
    );
  }

  if (
    operador === "termina_con"
  ) {
    return actual.endsWith(
      esperado
    );
  }

  return actual.includes(
    esperado
  );
}

`;

  motor = motor.replace(
    anchor,
    helpers + anchor
  );
}

if (!motor.includes("const siguientePorHandle =")) {
  const re = /const\s+siguiente\s*=\s*construirSiguiente\(\s*cargado\.conexiones\s*\);/m;
  const match = motor.match(re);

  if (!match) {
    fail("No encontré la creación del mapa siguiente en flujos.mjs.");
  }

  motor = motor.replace(
    re,
`${match[0]}

  const siguientePorHandle =
    construirSiguientePorHandle(
      cargado.conexiones
    );`
  );
}

if (!motor.includes('nodo.tipo ===\n      "condicion"')) {
  const anchor = `    if (
      nodo.tipo ===
      "accion"
    ) {`;

  if (!motor.includes(anchor)) {
    fail("No encontré el nodo accion en motor QR.");
  }

  const bloque = `    if (
      nodo.tipo ===
      "condicion"
    ) {
      const operador =
        nodo.config
          ?.condicionOperador ||
        "contiene";

      const valor =
        nodo.config
          ?.condicionValor ||
        "";

      const cumple =
        evaluarCondicionTexto({
          texto: textoCliente,
          operador,
          valor,
        });

      const salida =
        cumple ? "si" : "no";

      console.log(
        "FLUJO CONDICION:",
        {
          clienteId,
          flujoId,
          nodoUid:
            nodo.nodo_uid,
          operador,
          valor,
          salida,
        }
      );

      nodoActual =
        siguientePorHandle.get(
          \`\${nodo.nodo_uid}::\${salida}\`
        ) || null;

      continue;
    }

`;

  motor = motor.replace(
    anchor,
    bloque + anchor
  );
}

// ============================================================
// 3) EDITOR: tipos, nodo visual, menú y panel lateral
// ============================================================

if (!editor.includes("condicionOperador?:")) {
  const anchor = `  accionFlujo?:
    | "activar_bot"
    | "finalizar_flujo";`;

  if (!editor.includes(anchor)) {
    fail("No encontré accionFlujo en DatosNodo del editor.");
  }

  editor = editor.replace(
    anchor,
`${anchor}
  condicionOperador?:
    | "contiene"
    | "no_contiene"
    | "igual"
    | "empieza_con"
    | "termina_con";
  condicionValor?: string;`
  );
}

if (!editor.includes("function NodoCondicion(")) {
  const anchor = `function NodoAccion({`;

  if (!editor.includes(anchor)) {
    fail("No encontré NodoAccion para insertar NodoCondicion.");
  }

  const componente = `function NodoCondicion({
  id,
  data,
  selected,
}: NodeProps) {
  const d = data as DatosNodo;

  const operador =
    d.condicionOperador ||
    "contiene";

  const etiquetas: Record<
    string,
    string
  > = {
    contiene: "contiene",
    no_contiene: "no contiene",
    igual: "es igual a",
    empieza_con: "empieza con",
    termina_con: "termina con",
  };

  return (
    <div
      className={\`relative min-w-[250px] rounded-xl bg-white text-slate-900 shadow-lg \${
        selected
          ? "border-2 border-orange-500"
          : "border border-sky-300"
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

      <div className="rounded-t-xl bg-sky-100 px-4 py-2 text-xs font-black text-sky-800">
        ◇ {d.titulo || "Condición"}
      </div>

      <div className="px-4 py-3">
        <p className="text-[10px] font-bold uppercase text-slate-400">
          Respuesta del cliente
        </p>

        <p className="mt-1 max-w-[210px] truncate text-xs text-slate-700">
          {etiquetas[operador] ||
            "contiene"}{" "}
          “{d.condicionValor || "valor"}”
        </p>
      </div>

      <div className="relative border-t border-slate-200 px-4 py-3 text-[10px] font-black">
        <div className="flex items-center justify-end gap-2 text-emerald-600">
          <span>SÍ</span>

          <Handle
            id="si"
            type="source"
            position={Position.Right}
            className="!relative !right-auto !top-auto !h-3 !w-3 !translate-x-0 !translate-y-0 !border !border-emerald-500 !bg-white"
          />
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 text-rose-600">
          <span>NO</span>

          <Handle
            id="no"
            type="source"
            position={Position.Right}
            className="!relative !right-auto !top-auto !h-3 !w-3 !translate-x-0 !translate-y-0 !border !border-rose-500 !bg-white"
          />
        </div>
      </div>
    </div>
  );
}

`;

  editor = editor.replace(
    anchor,
    componente + anchor
  );
}

if (!editor.includes("condicion: NodoCondicion")) {
  editor = replaceOnce(
    editor,
`  mensaje: NodoMensaje,
  accion: NodoAccion,`,
`  mensaje: NodoMensaje,
  condicion: NodoCondicion,
  accion: NodoAccion,`,
    "nodeTypes condicion"
  );
}

if (!editor.includes("const agregarPasoCondicion = () =>")) {
  const anchor = `  const agregarPasoAccion = () => {`;

  if (!editor.includes(anchor)) {
    fail("No encontré agregarPasoAccion.");
  }

  const funcion = `  const agregarPasoCondicion = () => {
    if (!flujoActivo) return;

    const id = idNuevo("condicion");
    const position =
      obtenerPosicionNuevoPaso();

    setNodes((actuales) => [
      ...actuales,
      {
        id,
        type: "condicion",
        position,
        data: {
          titulo: "Condición",
          condicionOperador:
            "contiene",
          condicionValor: "",
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

if (!editor.includes("◇ Condición")) {
  const menuAnchor = `                <button
                  onClick={
                    agregarPasoAccion
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm"
                >
                  ⚙ Acciones
                </button>`;

  if (!editor.includes(menuAnchor)) {
    fail("No encontré el botón Acciones en AÑADIR PASO.");
  }

  const boton = `                <button
                  onClick={
                    agregarPasoCondicion
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm"
                >
                  ◇ Condición
                </button>

`;

  editor = editor.replace(
    menuAnchor,
    boton + menuAnchor
  );
}

if (!editor.includes("CONDICIÓN")) {
  const editorAnchor = `          {nodoSeleccionado?.type ===
            "accion" && (`;

  if (!editor.includes(editorAnchor)) {
    fail("No encontré editor lateral de Acción.");
  }

  const bloque = `          {nodoSeleccionado?.type ===
            "condicion" && (
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
                CONDICIÓN
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Evalúa el texto del último mensaje recibido del cliente.
              </p>

              <label className="mt-5 block text-xs font-bold text-slate-500">
                Operador
              </label>

              <select
                value={
                  (
                    nodoSeleccionado.data as DatosNodo
                  ).condicionOperador ||
                  "contiene"
                }
                onChange={(e) =>
                  actualizarDataNodo({
                    condicionOperador:
                      e.target.value as
                        | "contiene"
                        | "no_contiene"
                        | "igual"
                        | "empieza_con"
                        | "termina_con",
                  })
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              >
                <option value="contiene">
                  Contiene
                </option>
                <option value="no_contiene">
                  No contiene
                </option>
                <option value="igual">
                  Es igual a
                </option>
                <option value="empieza_con">
                  Empieza con
                </option>
                <option value="termina_con">
                  Termina con
                </option>
              </select>

              <label className="mt-4 block text-xs font-bold text-slate-500">
                Valor
              </label>

              <input
                value={
                  (
                    nodoSeleccionado.data as DatosNodo
                  ).condicionValor || ""
                }
                onChange={(e) =>
                  actualizarDataNodo({
                    condicionValor:
                      e.target.value,
                  })
                }
                placeholder="Ejemplo: precio"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              />

              <div className="mt-4 rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
                Conecta la salida SÍ al camino que debe seguir cuando la condición se cumpla y la salida NO al camino alternativo.
              </div>
            </div>
          )}

`;

  editor = editor.replace(
    editorAnchor,
    bloque + editorAnchor
  );
}

const genericOld = `{nodoSeleccionado &&
            nodoSeleccionado.type !==
              "mensaje" &&
            nodoSeleccionado.type !==
              "accion" &&
            nodoSeleccionado.type !==
              "esperar_tiempo" && (`;

const genericNew = `{nodoSeleccionado &&
            nodoSeleccionado.type !==
              "mensaje" &&
            nodoSeleccionado.type !==
              "condicion" &&
            nodoSeleccionado.type !==
              "accion" &&
            nodoSeleccionado.type !==
              "esperar_tiempo" && (`;

if (editor.includes(genericOld)) {
  editor = editor.replace(
    genericOld,
    genericNew
  );
}

// ============================================================
// 4) PREVIEW: handles SI/NO + último texto del cliente
// ============================================================

if (!preview.includes("condicionOperador?:")) {
  const anchor = `  accionFlujo?:
    | "activar_bot"
    | "finalizar_flujo";`;

  if (!preview.includes(anchor)) {
    fail("No encontré accionFlujo en DatosNodo del preview.");
  }

  preview = preview.replace(
    anchor,
`${anchor}
  condicionOperador?:
    | "contiene"
    | "no_contiene"
    | "igual"
    | "empieza_con"
    | "termina_con";
  condicionValor?: string;`
  );
}

if (!preview.includes("source_handle?:")) {
  preview = replaceOnce(
    preview,
`type ConexionFlujo = {
  source_uid: string;
  target_uid: string;
};`,
`type ConexionFlujo = {
  source_uid: string;
  target_uid: string;
  source_handle?: string | null;
  target_handle?: string | null;
};`,
    "tipo ConexionFlujo preview"
  );
}

if (!preview.includes("ultimoTextoClienteRef")) {
  const anchor = `  const nodoEsperandoRef =
    useRef<string | null>(null);`;

  if (!preview.includes(anchor)) {
    fail("No encontré nodoEsperandoRef en preview.");
  }

  preview = preview.replace(
    anchor,
`${anchor}

  const ultimoTextoClienteRef =
    useRef("");`
  );
}

if (!preview.includes("const siguientePorHandle = useMemo")) {
  const anchor = `  const agregarMensaje = useCallback(`;

  if (!preview.includes(anchor)) {
    fail("No encontré agregarMensaje en preview.");
  }

  const mapa = `  const siguientePorHandle = useMemo(
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
          \`\${conexion.source_uid}::\${conexion.source_handle}\`,
          conexion.target_uid
        );
      }

      return mapa;
    },
    [conexiones]
  );

`;

  preview = preview.replace(
    anchor,
    mapa + anchor
  );
}

if (!preview.includes("function evaluarCondicionPreview(")) {
  const anchor = `export default function FlujoPreviewPage() {`;

  if (!preview.includes(anchor)) {
    fail("No encontré componente principal del preview.");
  }

  const helper = `function evaluarCondicionPreview(
  texto: string,
  operador: string,
  valor: string
) {
  const actual =
    String(texto || "")
      .trim()
      .toLocaleLowerCase("es");

  const esperado =
    String(valor || "")
      .trim()
      .toLocaleLowerCase("es");

  if (!esperado) {
    return false;
  }

  if (operador === "igual") {
    return actual === esperado;
  }

  if (
    operador === "no_contiene"
  ) {
    return !actual.includes(
      esperado
    );
  }

  if (
    operador === "empieza_con"
  ) {
    return actual.startsWith(
      esperado
    );
  }

  if (
    operador === "termina_con"
  ) {
    return actual.endsWith(
      esperado
    );
  }

  return actual.includes(
    esperado
  );
}

`;

  preview = preview.replace(
    anchor,
    helper + anchor
  );
}

if (!preview.includes('nodo.tipo ===\n            "condicion"')) {
  const anchor = `          if (
            nodo.tipo ===
            "accion"
          ) {`;

  if (!preview.includes(anchor)) {
    fail("No encontré nodo acción en preview.");
  }

  const bloque = `          if (
            nodo.tipo ===
            "condicion"
          ) {
            const operador =
              nodo.config
                ?.condicionOperador ||
              "contiene";

            const valor =
              nodo.config
                ?.condicionValor ||
              "";

            const cumple =
              evaluarCondicionPreview(
                ultimoTextoClienteRef.current,
                operador,
                valor
              );

            const salida =
              cumple ? "si" : "no";

            agregarMensaje({
              id: idTemporal(),
              lado: "sistema",
              tipo: "sistema",
              texto:
                \`◇ Condición → \${cumple ? "SÍ" : "NO"}\`,
            });

            actual =
              siguientePorHandle.get(
                \`\${nodo.nodo_uid}::\${salida}\`
              ) || null;

            continue;
          }

`;

  preview = preview.replace(
    anchor,
    bloque + anchor
  );
}

if (!preview.includes("ultimoTextoClienteRef.current = texto;")) {
  const anchor = `    agregarMensaje({
      id: idTemporal(),
      lado: "cliente",
      tipo: "texto",
      texto,
    });`;

  if (!preview.includes(anchor)) {
    fail("No encontré agregar mensaje del cliente en preview.");
  }

  preview = preview.replace(
    anchor,
`${anchor}

    ultimoTextoClienteRef.current =
      texto;`
  );
}

// ============================================================
// 5) VALIDACIONES
// ============================================================

const checks = [
  [server, "textoCliente:", "server textoCliente"],
  [motor, "construirSiguientePorHandle", "motor mapa por handle"],
  [motor, "FLUJO CONDICION:", "motor condición"],
  [editor, "function NodoCondicion(", "editor NodoCondicion"],
  [editor, 'id="si"', "editor handle si"],
  [editor, 'id="no"', "editor handle no"],
  [editor, "◇ Condición", "editor menu condicion"],
  [preview, "ultimoTextoClienteRef", "preview ultimo texto"],
  [preview, "siguientePorHandle", "preview mapa handles"],
  [preview, "◇ Condición →", "preview condición"],
];

for (const [source, text, label] of checks) {
  if (!source.includes(text)) {
    fail("Fallo validación: " + label);
  }
}

fs.writeFileSync(editorFile, editor, "utf8");
fs.writeFileSync(previewFile, preview, "utf8");
fs.writeFileSync(motorFile, motor, "utf8");
fs.writeFileSync(serverFile, server, "utf8");

console.log("OK - nodo ◇ Condición implementado.");
console.log("Operadores: contiene, no contiene, igual, empieza con, termina con.");
console.log("Salidas reales: source_handle = si / no.");
console.log("Server pasa textoGuardado al motor como textoCliente.");
console.log("Preview Webchat evalúa la última respuesta escrita.");
console.log("Backups: *.backup-condicion-si-no");
console.log("");
console.log("Valida con:");
console.log("node --check app\\whatsapp-qr-server\\bot\\flujos.mjs");
console.log("node --check app\\whatsapp-qr-server\\server.mjs");
console.log("npm run build");
