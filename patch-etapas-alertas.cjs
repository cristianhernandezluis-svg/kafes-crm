const fs = require("fs");

function patchServer() {
  const path = "app/whatsapp-qr-server/server.mjs";
  let s = fs.readFileSync(path, "utf8");

  const helper = `
const ETAPAS_AUTOMATICAS = new Set([
  "mantener",
  "Nuevo",
  "Interesado",
  "Calificado",
  "Seguimiento",
  "Pago por validar",
  "Descartado",
]);

function resolverEtapaAutomatica(etapaActual, etapaSugerida) {
  const actual = String(etapaActual || "").trim();
  const sugerida = String(etapaSugerida || "").trim();

  if (!ETAPAS_AUTOMATICAS.has(sugerida) || sugerida === "mantener") {
    return null;
  }

  const etapasPostventa = new Set([
    "Pag\\u00f3 Adelanto",
    "Enviado",
    "Entregado",
  ]);

  if (etapasPostventa.has(actual)) {
    return null;
  }

  if (actual === "Pago por validar") {
    return null;
  }

  if (sugerida === "Nuevo") {
    return !actual || actual === "Nuevo" ? "Nuevo" : null;
  }

  if (
    sugerida === "Pago por validar" ||
    sugerida === "Seguimiento" ||
    sugerida === "Descartado"
  ) {
    return sugerida;
  }

  if (actual === "Descartado" || actual === "Seguimiento" || actual === "No Responde") {
    return sugerida === "Interesado" || sugerida === "Calificado"
      ? sugerida
      : null;
  }

  const rango = {
    Nuevo: 0,
    Interesado: 1,
    Calificado: 2,
  };

  const rangoActual = Object.prototype.hasOwnProperty.call(rango, actual)
    ? rango[actual]
    : -1;

  const rangoSugerido = Object.prototype.hasOwnProperty.call(rango, sugerida)
    ? rango[sugerida]
    : -1;

  if (rangoSugerido < 0) {
    return null;
  }

  return rangoSugerido >= rangoActual ? sugerida : null;
}
`;

  if (!s.includes("function resolverEtapaAutomatica(")) {
    const marca = "function calificarMensajeCliente(texto)";
    const idx = s.indexOf(marca);
    if (idx < 0) throw new Error("SERVER: no encontre calificarMensajeCliente");
    s = s.slice(0, idx) + helper.trim() + "\n\n" + s.slice(idx);
    console.log("SERVER: helper de etapas agregado");
  } else {
    console.log("SERVER: helper de etapas ya estaba");
  }

  const oldStart = `  if (respuestaBot?.handoff) {
    const handoffMotivo = detectarMotivoHandoff(textoAccion, textoBot);`;

  if (s.includes(oldStart)) {
    const newStart = `  const analisisCRM = respuestaBot?.analisis || null;
  const etapaAutomatica = resolverEtapaAutomatica(
    memoria?.etapa,
    analisisCRM?.etapa_sugerida
  );

  if (etapaAutomatica && etapaAutomatica !== memoria?.etapa) {
    await pool.query(
      \`UPDATE clientes SET etapa = $2 WHERE id = $1\`,
      [clienteId, etapaAutomatica]
    );

    memoria.etapa = etapaAutomatica;

    console.log(
      "ETAPA CRM BOT:",
      clienteId,
      "->",
      etapaAutomatica,
      "|",
      analisisCRM?.motivo_etapa || "sin motivo"
    );
  }

  const requiereCloserIA =
    respuestaBot?.handoff === true ||
    analisisCRM?.requiere_closer === true ||
    etapaAutomatica === "Pago por validar";

  if (requiereCloserIA) {
    const motivoIA = String(analisisCRM?.motivo_closer || "").trim();

    const handoffMotivo =
      etapaAutomatica === "Pago por validar"
        ? "validar_pago"
        : motivoIA && motivoIA !== "ninguno"
        ? motivoIA
        : detectarMotivoHandoff(textoAccion, textoBot);`;

    s = s.replace(oldStart, newStart);
    console.log("SERVER: inicio de clasificacion/handoff actualizado");
  } else if (!s.includes("const analisisCRM = respuestaBot?.analisis || null;")) {
    throw new Error("SERVER: no encontre inicio del handoff");
  }

  const oldQuery = `      UPDATE clientes
       SET score = CASE WHEN $4 THEN score ELSE 100 END,
           temperatura = CASE WHEN $4 THEN temperatura ELSE 'caliente' END,
           requiere_closer = true,
           etapa = CASE WHEN $4 THEN etapa ELSE 'Calificado' END,
           handoff_motivo = $3,
           asesor = COALESCE($2, asesor)
       WHERE id = $1
       \`,
       [clienteId, asesor, handoffMotivo, memoria?.paso === "postventa"]`;

  if (s.includes(oldQuery)) {
    const newQuery = `      UPDATE clientes
       SET requiere_closer = true,
           handoff_motivo = $3,
           asesor = COALESCE($2, asesor)
       WHERE id = $1
       \`,
       [clienteId, asesor, handoffMotivo]`;
    s = s.replace(oldQuery, newQuery);
    console.log("SERVER: handoff separado de etapa/score");
  } else if (s.includes("etapa = CASE WHEN $4 THEN etapa ELSE 'Calificado' END")) {
    throw new Error("SERVER: encontre logica vieja pero no pude reemplazar el bloque");
  } else {
    console.log("SERVER: bloque viejo de handoff ya no estaba");
  }

  fs.writeFileSync(path, s, "utf8");
}

function patchKanban() {
  const path = "app/kanban/page.tsx";
  let s = fs.readFileSync(path, "utf8");

  if (!s.includes("requiere_closer?: boolean;")) {
    const marca = "  canal?: string | null;";
    if (!s.includes(marca)) throw new Error("KANBAN: no encontre tipo Cliente");
    s = s.replace(
      marca,
      marca + '\n  requiere_closer?: boolean;\n  handoff_motivo?: string | null;'
    );
    console.log("KANBAN: campos de alerta agregados al tipo Cliente");
  }

  if (!s.includes('"Pago por validar",')) {
    s = s.replace(
      '  "Seguimiento",\n  "Pagó Adelanto",',
      '  "Seguimiento",\n  "Pago por validar",\n  "Pagó Adelanto",'
    );
    console.log("KANBAN: Pago por validar agregado");
  }

  if (!s.includes('"Descartado",')) {
    s = s.replace(
      '  "No Responde",\n];',
      '  "No Responde",\n  "Descartado",\n];'
    );
    console.log("KANBAN: Descartado agregado");
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
    const marca = "export default function KanbanPage()";
    if (!s.includes(marca)) throw new Error("KANBAN: no encontre componente principal");
    s = s.replace(marca, helper + marca);
    console.log("KANBAN: helper de motivo agregado");
  }

  const oldEffect = `  useEffect(() => {
    cargarClientes();
  }, []);`;

  if (s.includes(oldEffect)) {
    const newEffect = `  useEffect(() => {
    cargarClientes();

    const intervalo = setInterval(() => {
      cargarClientes();
    }, 5000);

    return () => clearInterval(intervalo);
  }, []);`;
    s = s.replace(oldEffect, newEffect);
    console.log("KANBAN: refresco automatico cada 5 segundos agregado");
  }

  if (!s.includes("Atencion humana pendiente")) {
    const marca = '        <div className="p-6 overflow-x-auto">';
    if (!s.includes(marca)) throw new Error("KANBAN: no encontre inicio de columnas");

    const banner = `        {clientes.some((c) => c.requiere_closer) && (
          <div className="mx-6 mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-red-400">
                Atencion humana pendiente
              </p>
              <p className={\`text-xs mt-1 \${temaClaro ? "text-slate-600" : "text-slate-300"}\`}>
                {clientes.filter((c) => c.requiere_closer).length} conversacion(es) requieren un asesor.
              </p>
            </div>

            <Link
              href="/chat"
              className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              Ir a conversaciones
            </Link>
          </div>
        ))}

`;
    s = s.replace(marca, banner + marca);
    console.log("KANBAN: banner de atencion humana agregado");
  }

  if (!s.includes("REQUIERE ASESOR")) {
    const marca = `                          <div
  className={\`mt-3 text-xs \${`;
    const idx = s.indexOf(marca);
    if (idx < 0) throw new Error("KANBAN: no encontre bloque Asesor");

    const alerta = `                          {cliente.requiere_closer && (
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
    s = s.slice(0, idx) + alerta + s.slice(idx);
    console.log("KANBAN: alerta roja por tarjeta agregada");
  }

  fs.writeFileSync(path, s, "utf8");
}

patchServer();
patchKanban();
console.log("PATCH ETAPAS + ALERTAS OK");
