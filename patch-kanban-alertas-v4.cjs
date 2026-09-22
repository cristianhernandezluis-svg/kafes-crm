const fs = require("fs");

const path = "app/kanban/page.tsx";
let s = fs.readFileSync(path, "utf8");

function reemplazarRegex(regex, reemplazo, nombre) {
  if (!regex.test(s)) {
    throw new Error("KANBAN: no encontre " + nombre);
  }
  s = s.replace(regex, reemplazo);
  console.log("KANBAN:", nombre, "OK");
}

if (!s.includes("requiere_closer?: boolean;")) {
  reemplazarRegex(
    /(\s*canal\?: string \| null;\r?\n)/,
    `$1  requiere_closer?: boolean;\n  handoff_motivo?: string | null;\n`,
    "campos de alerta"
  );
} else {
  console.log("KANBAN: campos de alerta ya estaban");
}

if (!s.includes('"Pago por validar",')) {
  reemplazarRegex(
    /(\s*"Seguimiento",\r?\n)(\s*"Pag\u00f3 Adelanto",)/,
    `$1  "Pago por validar",\n$2`,
    "etapa Pago por validar"
  );
} else {
  console.log("KANBAN: Pago por validar ya estaba");
}

if (!s.includes('"Descartado",')) {
  reemplazarRegex(
    /(\s*"No Responde",\r?\n)(\s*\];)/,
    `$1  "Descartado",\n$2`,
    "etapa Descartado"
  );
} else {
  console.log("KANBAN: Descartado ya estaba");
}

if (!s.includes("function etiquetaMotivoCloser(")) {
  const helper = `
function etiquetaMotivoCloser(motivo?: string | null) {
  const etiquetas: Record<string, string> = {
    validar_pago: "Validar comprobante de pago",
    pide_humano: "Cliente pidio hablar con una persona",
    bot_no_puede: "El bot necesita apoyo humano",
    reclamo_postventa: "Reclamo o incidencia postventa",
    intervencion_manual: "Conversacion tomada por un asesor",
    otro: "Requiere revision humana",
  };

  return etiquetas[String(motivo || "")] || "Requiere revision humana";
}

`;

  if (!s.includes("export default function KanbanPage()")) {
    throw new Error("KANBAN: no encontre componente principal");
  }
  s = s.replace("export default function KanbanPage()", helper + "export default function KanbanPage()");
  console.log("KANBAN: helper de motivos OK");
}

const effectRegex = /  useEffect\(\(\) => \{\r?\n\s*cargarClientes\(\);\r?\n\s*\}, \[\]\);/;
if (!s.includes("const intervalo = setInterval(() => {")) {
  reemplazarRegex(
    effectRegex,
`  useEffect(() => {
    cargarClientes();

    const intervalo = setInterval(() => {
      cargarClientes();
    }, 5000);

    return () => clearInterval(intervalo);
  }, []);`,
    "refresco cada 5 segundos"
  );
} else {
  console.log("KANBAN: refresco automatico ya estaba");
}

if (!s.includes("Atencion humana pendiente")) {
  const marca = '<div className="p-6 overflow-x-auto">';
  const idx = s.indexOf(marca);
  if (idx < 0) throw new Error("KANBAN: no encontre area de columnas");

  const inicioLinea = s.lastIndexOf("\n", idx) + 1;
  const indent = s.slice(inicioLinea, idx);

  const banner = `${indent}{clientes.some((c) => c.requiere_closer) && (
${indent}  <div className="mx-6 mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 flex items-center justify-between gap-4">
${indent}    <div>
${indent}      <p className="text-sm font-black text-red-400">
${indent}        Atencion humana pendiente
${indent}      </p>
${indent}      <p className={\`text-xs mt-1 \${temaClaro ? "text-slate-600" : "text-slate-300"}\`}>
${indent}        {clientes.filter((c) => c.requiere_closer).length} conversacion(es) requieren un asesor.
${indent}      </p>
${indent}    </div>

${indent}    <Link
${indent}      href="/chat"
${indent}      className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
${indent}    >
${indent}      Ir a conversaciones
${indent}    </Link>
${indent}  </div>
${indent})}

`;

  s = s.slice(0, inicioLinea) + banner + s.slice(inicioLinea);
  console.log("KANBAN: banner rojo OK");
} else {
  console.log("KANBAN: banner rojo ya estaba");
}

if (!s.includes("REQUIERE ASESOR")) {
  const asesorMarca = /(\s*<div\r?\n\s*className=\{`mt-3 text-xs \$\{\r?\n\s*temaClaro \? "text-slate-500" : "text-slate-400"\r?\n\s*\}`\}\r?\n\s*>\r?\n\s*Asesor: \{cliente\.asesor \|\| "Sin asesor"\}\r?\n\s*<\/div>)/;

  const match = s.match(asesorMarca);
  if (!match) throw new Error("KANBAN: no encontre bloque visual Asesor");

  const alerta = `
                          {cliente.requiere_closer && (
                            <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2">
                              <p className="text-[11px] font-black text-red-400">
                                REQUIERE ASESOR
                              </p>
                              <p className={\`text-[11px] mt-1 \${temaClaro ? "text-slate-600" : "text-slate-300"}\`}>
                                {etiquetaMotivoCloser(cliente.handoff_motivo)}
                              </p>
                            </div>
                          )}
`;

  s = s.replace(asesorMarca, alerta + "$1");
  console.log("KANBAN: alerta por tarjeta OK");
} else {
  console.log("KANBAN: alerta por tarjeta ya estaba");
}

fs.writeFileSync(path, s, "utf8");
console.log("PATCH KANBAN ALERTAS V4 OK");
