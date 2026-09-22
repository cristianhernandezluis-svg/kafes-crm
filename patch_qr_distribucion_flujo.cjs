const fs = require("fs");
const path = require("path");

const file = path.join(
  process.cwd(),
  "app",
  "whatsapp-qr-server",
  "bot",
  "distribucion.mjs"
);

const backup = file + ".backup-flujo";

if (!fs.existsSync(file)) {
  console.error("No existe:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

if (
  s.includes("f.id AS flujo_id") &&
  s.includes("flujoId: fila.flujo_id")
) {
  console.log("distribucion.mjs ya parece tener soporte de flujo.");
  process.exit(0);
}

fs.copyFileSync(file, backup);

function replaceOnce(oldText, newText, label) {
  if (!s.includes(oldText)) {
    console.error("No encontre el bloque:", label);
    console.error("Backup:", backup);
    process.exit(1);
  }

  s = s.replace(oldText, newText);
}

replaceOnce(
`      g.producto_slug,
      g.bot_slug,

      g.closer_principal_id,`,
`      g.producto_slug,
      g.bot_slug,

      f.id AS flujo_id,
      f.nombre AS flujo_nombre,
      f.slug AS flujo_slug,

      g.closer_principal_id,`,
"SELECT flujo"
);

replaceOnce(
`    LEFT JOIN usuarios principal
      ON principal.id = g.closer_principal_id`,
`    LEFT JOIN flujos_bot f
      ON f.id = g.flujo_id
     AND f.empresa_id = g.empresa_id
     AND f.activo = true

    LEFT JOIN usuarios principal
      ON principal.id = g.closer_principal_id`,
"JOIN flujos_bot"
);

replaceOnce(
`    productoSlug: fila.producto_slug,
    botSlug: fila.bot_slug,

    closerPrincipalId: fila.closer_principal_id,`,
`    productoSlug: fila.producto_slug,
    botSlug: fila.bot_slug,

    flujoId: fila.flujo_id || null,
    flujoNombre: fila.flujo_nombre || null,
    flujoSlug: fila.flujo_slug || null,

    closerPrincipalId: fila.closer_principal_id,`,
"RETURN flujo"
);

fs.writeFileSync(file, s, "utf8");

console.log("OK - distribucion.mjs ahora devuelve flujoId/flujoNombre/flujoSlug.");
console.log("Backup:", backup);
console.log("Siguiente:");
console.log("node --check app\\whatsapp-qr-server\\bot\\distribucion.mjs");
console.log("npm run build");
