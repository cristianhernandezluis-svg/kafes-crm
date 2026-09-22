const fs = require("fs");

function patchEsquema() {
  const path = "app/whatsapp-qr-server/bot/esquema.mjs";
  let s = fs.readFileSync(path, "utf8");

  if (!s.includes("precio_acordado:")) {
    const re = /(\s*seguimiento_para:\s*z\.string\(\)\.nullable\(\),\r?\n)/;
    if (!re.test(s)) {
      throw new Error("ESQUEMA: no encontre seguimiento_para");
    }

    s = s.replace(
      re,
      `$1  precio_acordado: z.number().nullable(),\n`
    );

    console.log("ESQUEMA: precio_acordado agregado");
  } else {
    console.log("ESQUEMA: precio_acordado ya estaba");
  }

  fs.writeFileSync(path, s, "utf8");
}

function patchPrompt() {
  const path = "app/whatsapp-qr-server/bot/prompt.mjs";
  let s = fs.readFileSync(path, "utf8");

  if (!s.includes("PRECIO ACORDADO PARA EL CRM:")) {
    const idx = s.indexOf("HANDOFF DURO:");
    if (idx < 0) {
      throw new Error("PROMPT: no encontre HANDOFF DURO");
    }

    const bloque = `PRECIO ACORDADO PARA EL CRM:
- "precio_acordado" representa el TOTAL ACTUAL de venta realmente comunicado o confirmado por el vendedor/bot para el producto, oferta o combo identificado.
- Si tu propia "respuesta" comunica un precio de venta concreto al cliente, devuelve ese mismo numero en precio_acordado.
- Si el historial muestra que el vendedor/bot ofrecio despues un precio diferente y vigente, usa el ULTIMO precio comercial confirmado.
- Ejemplo: si se ofrece "S/235", devuelve precio_acordado=235.
- Si el cliente solamente propone, pregunta o intenta negociar un precio y el vendedor/bot NO lo confirma, devuelve precio_acordado=null.
- NO uses como precio_acordado el monto de un voucher, adelanto, saldo, envio, precio anterior tachado, cuota o cualquier otro numero que no sea el total de venta vigente.
- Si no puedes saber el total de venta con seguridad, devuelve precio_acordado=null.
- Si cambia el producto u oferta, no arrastres el precio de la oferta anterior.

`;

    s = s.slice(0, idx) + bloque + s.slice(idx);
    console.log("PROMPT: reglas de precio acordado agregadas");
  } else {
    console.log("PROMPT: reglas de precio ya estaban");
  }

  if (
    s.includes("CLASIFICACION CRM EN POSTVENTA") &&
    !s.includes("En postventa, precio_acordado=null")
  ) {
    const idx = s.indexOf("CLASIFICACION CRM EN POSTVENTA:");
    const finLinea = s.indexOf("\n", idx);

    if (idx >= 0 && finLinea >= 0) {
      s =
        s.slice(0, finLinea + 1) +
        `- En postventa, precio_acordado=null. El monto real de una venta ya registrada sale de los datos reales de VENTA y no debe sobrescribirse desde la conversacion.\n` +
        s.slice(finLinea + 1);

      console.log("PROMPT: proteccion de precio en postventa agregada");
    }
  }

  fs.writeFileSync(path, s, "utf8");
}

function patchCerebro() {
  const path = "app/whatsapp-qr-server/bot/cerebro.mjs";
  let s = fs.readFileSync(path, "utf8");

  if (!s.includes("contexto.precio_acordado = precioAcordado")) {
    const re = /(\s*const producto\s*=\s*\r?\n\s*analisis\.producto\s*\|\|\s*\r?\n\s*memoria\.producto\s*\|\|\s*\r?\n\s*null;)/;
    const m = s.match(re);

    if (!m) {
      throw new Error("CEREBRO: no encontre calculo de producto");
    }

    const bloque = `${m[1]}

    const productoAnterior = memoria.producto || null;

    if (
      producto &&
      productoAnterior &&
      producto !== productoAnterior
    ) {
      delete contexto.precio_acordado;
    }

    const precioAcordado = Number(analisis.precio_acordado);

    if (
      analisis.precio_acordado !== null &&
      Number.isFinite(precioAcordado) &&
      precioAcordado > 0
    ) {
      contexto.precio_acordado = precioAcordado;
    }`;

    s = s.replace(re, bloque);
    console.log("CEREBRO: precio acordado se guarda en contexto");
  } else {
    console.log("CEREBRO: guardado de precio ya estaba");
  }

  fs.writeFileSync(path, s, "utf8");
}

function patchChat() {
  const path = "app/chat/page.tsx";
  let s = fs.readFileSync(path, "utf8");

  if (!s.includes("precio_acordado?: number;")) {
    const re = /(\s*adelanto_detectado\?:\s*number;\r?\n)/;

    if (!re.test(s)) {
      throw new Error("CHAT: no encontre adelanto_detectado");
    }

    s = s.replace(
      re,
      `$1    precio_acordado?: number;\n`
    );

    console.log("CHAT: tipo precio_acordado agregado");
  } else {
    console.log("CHAT: tipo precio_acordado ya estaba");
  }

  if (!s.includes("const precioAcordado =")) {
    const re = /(\s*setVentaProducto\(clienteActivo\?\.bot_producto \|\| ""\);\r?\n)\s*setVentaMonto\(""\);\r?\n\r?\n(\s*const adelantoDetectado\s*=)/;
    const m = s.match(re);

    if (!m) {
      throw new Error("CHAT: no encontre bloque de precarga de venta");
    }

    const nuevo = `${m[1]}
        const precioAcordado =
          clienteActivo?.bot_contexto?.precio_acordado;

        setVentaMonto(
          Number.isFinite(Number(precioAcordado)) &&
            Number(precioAcordado) > 0
            ? String(precioAcordado)
            : ""
        );

${m[2]}`;

    s = s.replace(re, nuevo);
    console.log("CHAT: total se precarga desde precio acordado");
  } else {
    console.log("CHAT: precarga de total ya estaba");
  }

  const inicio = s.indexOf("const cargarVenta = async () =>");
  if (inicio < 0) {
    throw new Error("CHAT: no encontre cargarVenta");
  }

  const depRe = /\},\s*\[clienteActivo\?\.id\]\);/g;
  depRe.lastIndex = inicio;
  const depMatch = depRe.exec(s);

  if (depMatch) {
    const depNueva = `}, [
  clienteActivo?.id,
  clienteActivo?.bot_producto,
  clienteActivo?.bot_contexto?.precio_acordado,
  clienteActivo?.bot_contexto?.adelanto_detectado,
]);`;

    s =
      s.slice(0, depMatch.index) +
      depNueva +
      s.slice(depMatch.index + depMatch[0].length);

    console.log("CHAT: precarga reacciona a precio/adelanto nuevos");
  } else if (!s.includes("clienteActivo?.bot_contexto?.precio_acordado,")) {
    console.log("CHAT: dependencia no cambiada; no bloquea la precarga al abrir cliente");
  }

  fs.writeFileSync(path, s, "utf8");
}

patchEsquema();
patchPrompt();
patchCerebro();
patchChat();

console.log("PATCH PRECIO ACORDADO AUTO V2 OK");
