const fs = require("fs");

const file = "app/whatsapp-qr-server/server.mjs";
let s = fs.readFileSync(file, "utf8");

if (s.includes("await prepararColumnasBot();")) {
  console.log("prepararColumnasBot() ya esta agregado.");
  process.exit(0);
}

const listenIndex = s.lastIndexOf("app.listen(PORT");
if (listenIndex < 0) {
  throw new Error("No encontre app.listen(PORT");
}

const target = "await cargarIntegracionQr();";
const targetIndex = s.indexOf(target, listenIndex);

if (targetIndex < 0) {
  throw new Error("No encontre await cargarIntegracionQr() dentro del arranque.");
}

s =
  s.slice(0, targetIndex) +
  "await prepararColumnasBot();\n  " +
  s.slice(targetIndex);

fs.writeFileSync(file, s, "utf8");

console.log("ARRANQUE: prepararColumnasBot() agregado antes de cargarIntegracionQr()");
console.log("PATCH ARRANQUE COLUMNAS V2 OK");
