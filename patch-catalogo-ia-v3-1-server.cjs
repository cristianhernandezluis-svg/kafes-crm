const fs = require("fs");

const file = "app/whatsapp-qr-server/server.mjs";
let s = fs.readFileSync(file, "utf8");

function reemplazarUnaVezRegex(regex, replacement, label) {
  if (!regex.test(s)) {
    throw new Error("No encontre: " + label);
  }
  regex.lastIndex = 0;
  s = s.replace(regex, replacement);
  console.log("OK:", label);
}

// 1) Pasar empresa_id al Vendedor Maestro.
if (!/empresaId:\s*empresaQrId/.test(s)) {
  reemplazarUnaVezRegex(
    /(const respuestaBot = await decidirRespuestaBot\(\{\s*[\s\S]*?\bhistorial,\s*)(\}\);)/,
    `$1    empresaId: empresaQrId,\n  $2`,
    "empresaQrId -> decidirRespuestaBot"
  );
} else {
  console.log("YA EXISTE: empresaQrId -> decidirRespuestaBot");
}

// 2) Presentacion comercial: foto y video ahora son async y por empresa.
if (!/const fotos = await obtenerMultimediaProducto\([\s\S]*?empresaQrId[\s\S]*?const videos = await obtenerMultimediaProducto/.test(s)) {
  reemplazarUnaVezRegex(
    /const fotos = obtenerMultimediaProducto\(respuestaBot\.producto,\s*"foto"\);\s*const videos = obtenerMultimediaProducto\(respuestaBot\.producto,\s*"video"\);/,
    `const fotos = await obtenerMultimediaProducto(
      respuestaBot.producto,
      "foto",
      empresaQrId
    );
    const videos = await obtenerMultimediaProducto(
      respuestaBot.producto,
      "video",
      empresaQrId
    );`,
    "multimedia presentacion async por empresa"
  );
} else {
  console.log("YA EXISTE: multimedia presentacion async por empresa");
}

// 3) Multimedia solicitada normal: await + empresa_id.
if (!/\? await obtenerMultimediaProducto\([\s\S]*?multimediaSolicitada,[\s\S]*?empresaQrId[\s\S]*?\)\s*:\s*\[\]/.test(s)) {
  reemplazarUnaVezRegex(
    /\?\s*obtenerMultimediaProducto\(\s*respuestaBot\.producto,\s*multimediaSolicitada\s*\)\s*:\s*\[\]/,
    `? await obtenerMultimediaProducto(
            respuestaBot.producto,
            multimediaSolicitada,
            empresaQrId
          )
        : []`,
    "multimedia normal async por empresa"
  );
} else {
  console.log("YA EXISTE: multimedia normal async por empresa");
}

fs.writeFileSync(file, s, "utf8");

console.log("ACTUALIZADO:", file);
console.log("CATALOGO IA V3.1 SERVER COMPLETADO");
