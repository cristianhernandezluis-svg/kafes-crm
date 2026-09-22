const fs = require("fs");

function patchMediaAI() {
  const path = "app/whatsapp-qr-server/bot/media-ai.mjs";
  let s = fs.readFileSync(path, "utf8");

  const oldText = `Describe brevemente esta imagen para dar contexto a un asesor de ventas por WhatsApp. Identifica productos, texto visible, comprobantes u objetos relevantes. No inventes marcas, modelos, pagos confirmados ni datos que no sean visibles. Si no estas seguro, indicalo.`;

  const newText = `Describe brevemente esta imagen para dar contexto a un asesor de ventas por WhatsApp. Identifica productos, texto visible, comprobantes u objetos relevantes. No inventes marcas, modelos, pagos confirmados ni datos que no sean visibles. Si no estas seguro, indicalo. Si la imagen es claramente un comprobante de pago y el monto pagado es legible, agrega al FINAL una linea exacta con el formato COMPROBANTE_MONTO: 30.00 usando solo numeros y punto decimal. Si no es un comprobante claro o el monto no es seguro, agrega COMPROBANTE_MONTO: null. No interpretes el monto como pago confirmado.`;

  if (!s.includes("COMPROBANTE_MONTO:")) {
    if (!s.includes(oldText)) {
      throw new Error("MEDIA-AI: no encontre el prompt de imagen esperado");
    }
    s = s.replace(oldText, newText);
    console.log("MEDIA-AI: monto estructurado de comprobante agregado");
  } else {
    console.log("MEDIA-AI: prompt de monto ya estaba");
  }

  fs.writeFileSync(path, s, "utf8");
}

function patchServer() {
  const path = "app/whatsapp-qr-server/server.mjs";
  let s = fs.readFileSync(path, "utf8");

  if (!s.includes("function extraerMontoComprobante(")) {
    const marca = "function detectarMotivoHandoff(";
    const idx = s.indexOf(marca);
    if (idx < 0) throw new Error("SERVER: no encontre detectarMotivoHandoff");

    const helper = `function extraerMontoComprobante(analisis) {
  const texto = String(analisis || "");
  const match = texto.match(/COMPROBANTE_MONTO:\\s*([0-9]+(?:\\.[0-9]{1,2})?|null)/i);

  if (!match || String(match[1]).toLowerCase() === "null") {
    return null;
  }

  const monto = Number(match[1]);

  if (!Number.isFinite(monto) || monto <= 0 || monto > 100000) {
    return null;
  }

  return monto;
}

`;
    s = s.slice(0, idx) + helper + s.slice(idx);
    console.log("SERVER: extractor de monto agregado");
  } else {
    console.log("SERVER: extractor ya estaba");
  }

  if (!s.includes("ADELANTO DETECTADO EN COMPROBANTE:")) {
    const marca = `  const clienteId = cliente.rows[0].id;`;
    const idx = s.indexOf(marca);
    if (idx < 0) throw new Error("SERVER: no encontre clienteId");

    const insert = `  const clienteId = cliente.rows[0].id;

  if (!esMio && tipoMensaje === "image" && mediaAnalisis) {
    const montoComprobante = extraerMontoComprobante(mediaAnalisis);

    if (montoComprobante !== null) {
      await pool.query(
        \`
        UPDATE clientes
        SET bot_contexto = jsonb_set(
          COALESCE(bot_contexto, '{}'::jsonb),
          '{adelanto_detectado}',
          to_jsonb($2::numeric),
          true
        )
        WHERE id = $1
        \`,
        [clienteId, montoComprobante]
      );

      console.log(
        "ADELANTO DETECTADO EN COMPROBANTE:",
        clienteId,
        montoComprobante
      );
    }
  }`;

    s = s.slice(0, idx) + insert + s.slice(idx + marca.length);
    console.log("SERVER: adelanto detectado se guarda en bot_contexto");
  } else {
    console.log("SERVER: guardado de adelanto ya estaba");
  }

  fs.writeFileSync(path, s, "utf8");
}

function patchChat() {
  const path = "app/chat/page.tsx";
  let s = fs.readFileSync(path, "utf8");

  if (!s.includes("adelanto_detectado?: number")) {
    const oldType = `  bot_contexto?: { uso?: string; ciudad?: string } | null;`;
    const newType = `  bot_contexto?: {
    uso?: string;
    ciudad?: string;
    adelanto_detectado?: number;
  } | null;`;

    if (!s.includes(oldType)) {
      throw new Error("CHAT: no encontre tipo bot_contexto");
    }

    s = s.replace(oldType, newType);
    console.log("CHAT: tipo adelanto_detectado agregado");
  } else {
    console.log("CHAT: tipo adelanto_detectado ya estaba");
  }

  const oldElse = `      } else {
        setVentaProducto(clienteActivo?.bot_producto || "");
        setVentaMonto("");
        setVentaAdelanto("");
      }`;

  const newElse = `      } else {
        setVentaProducto(clienteActivo?.bot_producto || "");
        setVentaMonto("");

        const adelantoDetectado =
          clienteActivo?.bot_contexto?.adelanto_detectado;

        setVentaAdelanto(
          Number.isFinite(Number(adelantoDetectado)) &&
            Number(adelantoDetectado) > 0
            ? String(adelantoDetectado)
            : ""
        );
      }`;

  if (!s.includes("const adelantoDetectado =")) {
    if (!s.includes(oldElse)) {
      throw new Error("CHAT: no encontre bloque cargarVenta sin venta");
    }

    s = s.replace(oldElse, newElse);
    console.log("CHAT: adelanto detectado se precarga en formulario");
  } else {
    console.log("CHAT: precarga ya estaba");
  }

  s = s.replace('placeholder="235"', 'placeholder="Monto total"');
  s = s.replace('placeholder="30"', 'placeholder="Monto detectado"');

  fs.writeFileSync(path, s, "utf8");
  console.log("CHAT: placeholders corregidos");
}

patchMediaAI();
patchServer();
patchChat();

console.log("PATCH VOUCHER ADELANTO AUTOMATICO OK");
