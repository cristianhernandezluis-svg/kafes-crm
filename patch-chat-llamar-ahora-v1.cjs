const fs = require("fs");

const file = "app/chat/page.tsx";
let s = fs.readFileSync(file, "utf8");

function fail(msg) {
  throw new Error(msg);
}

function replaceOnce(text, oldText, newText, label) {
  const count = text.split(oldText).length - 1;
  if (count !== 1) {
    fail(`${label}: esperaba 1 coincidencia y encontre ${count}`);
  }
  return text.replace(oldText, newText);
}

if (!s.includes("llamar_ahora?: boolean;")) {
  s = replaceOnce(
    s,
`  bot_contexto?: {
    uso?: string;
    ciudad?: string;
    adelanto_detectado?: number;
    precio_acordado?: number;
  } | null;`,
`  bot_contexto?: {
    uso?: string;
    ciudad?: string;
    adelanto_detectado?: number;
    precio_acordado?: number;
    fase_venta?: string;
    presentacion_enviada?: boolean;
    llamar_ahora?: boolean;
    motivo_llamada?: string;
  } | null;`,
    "tipado bot_contexto"
  );
}

if (!s.includes("🔥 LLAMAR AHORA ·")) {
  s = replaceOnce(
    s,
`      {cliente.temperatura === "caliente" ? \`🔥 \${cliente.nombre || "Sin nombre"}\` : (cliente.nombre || "Sin nombre")}
    </p>

    {cliente.temperatura === "caliente" && <p className="text-xs font-bold text-orange-400 truncate">CALIENTE · {nombreProductoBot(cliente.bot_producto)} · {cliente.bot_contexto?.ciudad || cliente.ciudad || "Sin ciudad"}</p>}`,
`      {cliente.bot_contexto?.llamar_ahora === true
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
    ) : null}`,
    "alerta lista chats"
  );
}

if (!s.includes("Oportunidad comercial detectada por el bot.")) {
  const marker = `  <p
    className={temaClaro ? "text-xs font-bold text-slate-500" : "text-xs font-bold text-slate-400"}
  >
    Calificacion del bot
  </p>`;

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

  <p
    className={temaClaro ? "text-xs font-bold text-slate-500" : "text-xs font-bold text-slate-400"}
  >
    Calificacion del bot
  </p>`;

  if (!s.includes(marker)) {
    fail("No encontre encabezado Calificacion del bot");
  }

  s = s.replace(marker, card);
}

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
console.log("PATCH CHAT LLAMAR AHORA V1 APLICADO");
