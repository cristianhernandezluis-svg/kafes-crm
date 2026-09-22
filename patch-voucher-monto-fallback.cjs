const fs = require("fs");

const path = "app/whatsapp-qr-server/server.mjs";
let s = fs.readFileSync(path, "utf8");

const inicio = s.indexOf("function extraerMontoComprobante(");
if (inicio < 0) {
  throw new Error("SERVER: no encontre extraerMontoComprobante");
}

const fin = s.indexOf("\nfunction detectarMotivoHandoff(", inicio);
if (fin < 0) {
  throw new Error("SERVER: no encontre final de extraerMontoComprobante");
}

const nuevo = `function extraerMontoComprobante(analisis) {
  const textoOriginal = String(analisis || "");
  const texto = normalizarTexto(textoOriginal);

  const estructurado = textoOriginal.match(
    /COMPROBANTE_MONTO:\\s*([0-9]+(?:[.,][0-9]{1,2})?|null)/i
  );

  if (estructurado) {
    if (String(estructurado[1]).toLowerCase() === "null") {
      return null;
    }

    const monto = Number(String(estructurado[1]).replace(",", "."));

    if (Number.isFinite(monto) && monto > 0 && monto <= 100000) {
      return monto;
    }
  }

  const pareceComprobante =
    /\\b(comprobante|voucher|yapeaste|yape|plin|transferencia|deposito|pago realizado)\\b/.test(
      texto
    );

  if (!pareceComprobante) {
    return null;
  }

  const patrones = [
    /(?:s\\s*\\/\\s*|s\\s*\\/\\.\\s*)([0-9]+(?:[.,][0-9]{1,2})?)/i,
    /\\b(?:monto|importe|total pagado|pago de|pagado)\\s*[:=-]?\\s*(?:s\\s*\\/\\s*)?([0-9]+(?:[.,][0-9]{1,2})?)/i,
  ];

  for (const patron of patrones) {
    const match = textoOriginal.match(patron);
    if (!match) continue;

    const monto = Number(String(match[1]).replace(",", "."));

    if (Number.isFinite(monto) && monto > 0 && monto <= 100000) {
      return monto;
    }
  }

  return null;
}
`;

s = s.slice(0, inicio) + nuevo + s.slice(fin);
fs.writeFileSync(path, s, "utf8");

console.log("SERVER: extractor de monto reforzado con fallback S/");
