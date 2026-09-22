const fs = require("fs");

const path = "app/api/clientes/route.ts";
let s = fs.readFileSync(path, "utf8");

if (s.includes("requiere_closer") && s.includes("handoff_motivo")) {
  console.log("API CLIENTES: campos ya estaban");
  process.exit(0);
}

const regex = /(\s*asesor,\r?\n)(\s*observacion,)/;

if (!regex.test(s)) {
  throw new Error("API CLIENTES: no pude ubicar asesor/observacion en el SELECT");
}

s = s.replace(
  regex,
  `$1        requiere_closer,\n        handoff_motivo,\n$2`
);

fs.writeFileSync(path, s, "utf8");

console.log("API CLIENTES: requiere_closer y handoff_motivo agregados");
