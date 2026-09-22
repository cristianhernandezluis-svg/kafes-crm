const fs = require("fs");

const file = "app/chat/page.tsx";
let s = fs.readFileSync(file, "utf8");

function fail(msg) {
  throw new Error(msg);
}

/* 1) Tipado bot_contexto */
if (!s.includes("llamar_ahora?: boolean;")) {
  const oldType = `  bot_contexto?: {
    uso?: string;
    ciudad?: string;
    adelanto_detectado?: number;
    precio_acordado?: number;
  } | null;`;

  const newType = `  bot_contexto?: {
    uso?: string;
    ciudad?: string;
    adelanto_detectado?: number;
    precio_acordado?: number;
    fase_venta?: string;
    presentacion_enviada?: boolean;
    llamar_ahora?: boolean;
    motivo_llamada?: string;
  } | null;`;

  if (!s.includes(oldType)) fail("No encontre el tipado bot_contexto esperado");
  s = s.replace(oldType, newType);
}

/* 2) Lista de chats */
if (!s.includes("🔥 LLAMAR AHORA ·")) {
  const oldList = `      {cliente.temperatura === "caliente" ? \`🔥 \${cliente.nombre || "Sin nombre"}\` : (cliente.nombre || "Sin nombre")}
    </p>

    {cliente.temperatura === "caliente" && <p className="text-xs font-bold text-orange-400 truncate">CALIENTE · {nombreProductoBot(cliente.bot_producto)} · {cliente.bot_contexto?.ciudad || cliente.ciudad || "Sin ciudad"}</p>}`;

  const newList = `      {cliente.bot_contexto?.llamar_ahora === true
        ? \`📞 \${cliente.nombre || "Sin nombre"}\`
        : cliente.temperatura === "caliente"
          ? \`🔥 \${cliente.nombre || "Sin nombre"}\`
          : (cliente.nombre || "Sin nombre")}
    </p>

    {cliente.bot_contexto?.llamar_ahora === true ? (
      <p className="text-xs font-black text-orange-400 truncate">
        🔥 LLAMAR AHORA · {nombreProductoBot(cliente.bot_producto)} · {cliente.bot_contexto?.ciudad || cliente.ciudad || "Sin ciudad"}
      </p>
    ) : cliente.temperatura === "caliente" ? (
      <p className="text-xs font-bold text-orange-400 truncate">
        CALIENTE · {nombreProductoBot(cliente.bot_producto)} · {cliente.bot_contexto?.ciudad || cliente.ciudad || "Sin ciudad"}
      </p>
    ) : null}`;

  if (!s.includes(oldList)) fail("No encontre el bloque de temperatura en la lista");
  s = s.replace(oldList, newList);
}

/* 3) Tarjeta en panel derecho.
   Ubicamos el <p> que contiene "Calificacion del bot" sin depender
   del formato exacto de className/indentacion. */
if (!s.includes("Esta alerta no significa que requiera closer.")) {
  const textIndex = s.indexOf("Calificacion del bot");
  if (textIndex < 0) fail("No encontre el texto Calificacion del bot");

  const pStart = s.lastIndexOf("<p", textIndex);
  if (pStart < 0) fail("No encontre el <p> de Calificacion del bot");

  const card = `  {clienteActivo.bot_contexto?.llamar_ahora === true && (
    <div
      className={\`mb-3 rounded-xl border p-3 \${
        temaClaro
          ? "border-orange-300 bg-orange-50"
          : "border-orange-500/40 bg-orange-500/10"
      }\`}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none">📞</span>
        <div className="min-w-0">
          <p
            className={\`text-xs font-black \${
              temaClaro ? "text-orange-700" : "text-orange-300"
            }\`}
          >
            🔥 LLAMAR AHORA
          </p>
          <p
            className={\`mt-1 text-xs leading-relaxed \${
              temaClaro ? "text-orange-800" : "text-orange-100"
            }\`}
          >
            {clienteActivo.bot_contexto?.motivo_llamada ||
              "Oportunidad comercial detectada por el bot."}
          </p>
          <p
            className={\`mt-1 text-[11px] \${
              temaClaro ? "text-orange-600" : "text-orange-300/80"
            }\`}
          >
            El bot sigue atendiendo. Esta alerta no significa que requiera closer.
          </p>
        </div>
      </div>
    </div>
  )}

`;

  s = s.slice(0, pStart) + card + s.slice(pStart);
}

/* Validaciones */
for (const needle of [
  "llamar_ahora?: boolean;",
  "motivo_llamada?: string;",
  "🔥 LLAMAR AHORA ·",
  "Oportunidad comercial detectada por el bot.",
  "Esta alerta no significa que requiera closer.",
]) {
  if (!s.includes(needle)) {
    fail("Validacion fallo: " + needle);
  }
}

fs.writeFileSync(file, s, "utf8");

console.log("TIPADO LLAMAR AHORA: OK");
console.log("ALERTA EN LISTA DE CHATS: OK");
console.log("TARJETA LLAMAR AHORA EN PANEL: OK");
console.log("REQUIERE CLOSER QUEDA INDEPENDIENTE: OK");
console.log("PATCH CHAT LLAMAR AHORA V2 APLICADO");
