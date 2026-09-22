const fs = require("fs");
const path = require("path");

const file = path.join(
  process.cwd(),
  "app",
  "flujos",
  "page.tsx"
);

if (!fs.existsSync(file)) {
  throw new Error(`No existe: ${file}`);
}

const backup =
  `${file}.backup-iniciar-flujo-editor`;

if (!fs.existsSync(backup)) {
  fs.copyFileSync(file, backup);
}

let text = fs.readFileSync(file, "utf8");

const NODE_COMPONENT = "function NodoIniciarFlujo({\n  id,\n  data,\n  selected,\n}: NodeProps) {\n  const d = data as DatosNodo;\n\n  return (\n    <div\n      className={`relative min-w-[250px] rounded-xl bg-white text-slate-900 shadow-lg ${\n        selected\n          ? \"border-2 border-orange-500\"\n          : \"border border-violet-300\"\n      }`}\n    >\n      <BarraAccionesNodo\n        nodeId={id}\n        selected={selected}\n      />\n\n      <Handle\n        type=\"target\"\n        position={Position.Left}\n        className=\"!h-3 !w-3 !bg-white\"\n      />\n\n      <div className=\"rounded-t-xl border-b border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black text-violet-800\">\n        ↗ {d.titulo || \"Iniciar Flujo\"}\n      </div>\n\n      <div className=\"px-4 py-4\">\n        <div className=\"rounded-xl border border-dashed border-violet-200 bg-violet-50/50 px-3 py-3 text-center\">\n          <p className=\"text-[10px] font-black uppercase text-slate-500\">\n            Enviar flujo\n          </p>\n\n          <p className=\"mt-1 max-w-[210px] truncate text-xs font-semibold text-slate-700\">\n            {d.flujoDestinoNombre ||\n              \"Click para escoger un flujo\"}\n          </p>\n        </div>\n      </div>\n\n      <div className=\"flex items-center justify-end border-t border-slate-200 px-3 py-2\">\n        <span className=\"mr-2 text-[10px] text-slate-500\">\n          Continuar\n        </span>\n\n        <Handle\n          type=\"source\"\n          position={Position.Right}\n          className=\"!relative !right-auto !top-auto !h-3 !w-3 !translate-x-0 !translate-y-0 !border !border-slate-400 !bg-white\"\n        />\n      </div>\n    </div>\n  );\n}";
const ADD_FUNC = "  const agregarPasoIniciarFlujo = () => {\n    if (!flujoActivo) return;\n\n    const id =\n      idNuevo(\"iniciar-flujo\");\n\n    const position =\n      obtenerPosicionNuevoPaso();\n\n    setNodes((actuales) => [\n      ...actuales,\n      {\n        id,\n        type: \"iniciar_flujo\",\n        position,\n        data: {\n          titulo: \"Iniciar Flujo\",\n          flujoDestinoId: null,\n          flujoDestinoNombre: \"\",\n        },\n      },\n    ]);\n\n    setNodoSeleccionadoId(id);\n  };";
const MENU_BUTTON = "                <button\n                  onClick={\n                    agregarPasoIniciarFlujo\n                  }\n                  className=\"mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm\"\n                >\n                  ↗ Iniciar Flujo\n                </button>\n\n";
const SIDEBAR = "          {nodoSeleccionado?.type ===\n            \"iniciar_flujo\" && (\n            <div className=\"p-4\">\n              <button\n                onClick={() =>\n                  setNodoSeleccionadoId(\n                    null\n                  )\n                }\n                className=\"mb-4 text-xs text-orange-500\"\n              >\n                ← Volver\n              </button>\n\n              <p className=\"text-xs font-black\">\n                INICIAR OTRO FLUJO\n              </p>\n\n              <p className=\"mt-1 text-xs text-slate-500\">\n                Ejecuta otro flujo y, cuando\n                ese flujo termine de forma\n                natural, vuelve a este punto\n                para continuar.\n              </p>\n\n              <label className=\"mt-5 block text-xs font-bold text-slate-500\">\n                Flujo\n              </label>\n\n              <select\n                value={\n                  (\n                    nodoSeleccionado.data as DatosNodo\n                  ).flujoDestinoId || \"\"\n                }\n                onChange={(e) => {\n                  const idDestino =\n                    Number(\n                      e.target.value\n                    ) || null;\n\n                  const destino =\n                    flujos.find(\n                      (flujo) =>\n                        flujo.id ===\n                        idDestino\n                    );\n\n                  actualizarDataNodo({\n                    flujoDestinoId:\n                      idDestino,\n                    flujoDestinoNombre:\n                      destino?.nombre ||\n                      \"\",\n                  });\n                }}\n                className=\"mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none\"\n              >\n                <option value=\"\">\n                  No hay selección\n                </option>\n\n                {flujos\n                  .filter(\n                    (flujo) =>\n                      flujo.id !==\n                      flujoActivo?.id\n                  )\n                  .map((flujo) => (\n                    <option\n                      key={flujo.id}\n                      value={flujo.id}\n                    >\n                      {flujo.nombre}\n                    </option>\n                  ))}\n              </select>\n\n              {(\n                nodoSeleccionado.data as DatosNodo\n              ).flujoDestinoId ? (\n                <div className=\"mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3\">\n                  <p className=\"text-[10px] font-black uppercase text-violet-500\">\n                    Flujo seleccionado\n                  </p>\n\n                  <p className=\"mt-1 text-sm font-semibold text-slate-800\">\n                    {(\n                      nodoSeleccionado.data as DatosNodo\n                    ).flujoDestinoNombre ||\n                      `ID ${\n                        (\n                          nodoSeleccionado.data as DatosNodo\n                        ).flujoDestinoId\n                      }`}\n                  </p>\n                </div>\n              ) : (\n                <div className=\"mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-700\">\n                  Selecciona un flujo antes de\n                  guardar. El flujo actual no\n                  aparece en la lista para\n                  evitar que se llame a sí\n                  mismo directamente.\n                </div>\n              )}\n\n              <div className=\"mt-4 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-600\">\n                La salida Continuar se usará\n                cuando el subflujo termine.\n                En el siguiente paso\n                conectaremos la ejecución\n                persistente en WhatsApp QR y\n                la Vista previa.\n              </div>\n            </div>\n          )}\n\n";


function mustReplace(texto, regex, replacement, label) {
  if (!regex.test(texto)) {
    throw new Error(`No encontré: ${label}`);
  }
  return texto.replace(regex, replacement);
}

/* 1) Campos de configuración */
if (!text.includes("flujoDestinoId?:")) {
  text = mustReplace(
    text,
    /(accionFlujo\?:[\s\S]*?\|\s*"finalizar_flujo";)/,
    `$1
  flujoDestinoId?: number | null;
  flujoDestinoNombre?: string;`,
    "DatosNodo.accionFlujo"
  );
}

/* 2) Componente visual */
if (!text.includes("function NodoIniciarFlujo(")) {
  text = mustReplace(
    text,
    /(?=function NodoCondicion\()/,
    NODE_COMPONENT + "\n\n",
    "punto antes de NodoCondicion"
  );
}

/* 3) Registrar tipo de nodo */
if (!text.includes("iniciar_flujo: NodoIniciarFlujo")) {
  text = mustReplace(
    text,
    /(const nodeTypes = \{\s*inicio: NodoInicio,\s*mensaje: NodoMensaje,)/,
    `$1
  iniciar_flujo: NodoIniciarFlujo,`,
    "nodeTypes"
  );
}

/* 4) Función para añadir nodo */
if (!text.includes("const agregarPasoIniciarFlujo")) {
  text = mustReplace(
    text,
    /(?=  const agregarPasoCondicion = \(\) => \{)/,
    ADD_FUNC + "\n\n",
    "antes de agregarPasoCondicion"
  );
}

/* 5) Botón del menú */
if (!text.includes("function NodoIniciarFlujo(")) {
  throw new Error(
    "El componente NodoIniciarFlujo no se insertó correctamente."
  );
}

const menuAnchor =
  /(\s*<button\s*\n\s*onClick=\{\s*\n\s*agregarPasoCondicion[\s\S]*?◇ Condición\s*\n\s*<\/button>)/;

if (!text.includes("onClick={\n                    agregarPasoIniciarFlujo")) {
  text = mustReplace(
    text,
    menuAnchor,
    MENU_BUTTON + "$1",
    "botón Condición del menú"
  );
}

/* 6) Panel lateral */
if (!text.includes("INICIAR OTRO FLUJO")) {
  text = mustReplace(
    text,
    /(?=\s*\{nodoSeleccionado\?\.type ===\s*"condicion")/,
    SIDEBAR,
    "panel antes de Condición"
  );
}

fs.writeFileSync(file, text, "utf8");

console.log("");
console.log("✅ Nodo ↗ Iniciar Flujo agregado al editor.");
console.log("✅ Selector de flujos agregado.");
console.log("✅ Salida Continuar agregada.");
console.log("✅ El flujo actual queda excluido del selector.");
console.log("");
console.log("Ahora ejecuta:");
console.log("npm run build");
