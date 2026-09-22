const fs = require("fs");
const path = require("path");

const file = path.join(
  process.cwd(),
  "app",
  "flujos",
  "preview",
  "page.tsx"
);

if (!fs.existsSync(file)) {
  console.error("No existe:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

if (s.includes("esperaSegundos?: number;")) {
  console.log("esperaSegundos ya existe en DatosNodo.");
  process.exit(0);
}

const oldText = `  tipoMensaje?: "omnichannel" | "webchat";
};`;

const newText = `  tipoMensaje?: "omnichannel" | "webchat";
  esperaSegundos?: number;
};`;

if (!s.includes(oldText)) {
  console.error("No encontre el bloque DatosNodo esperado.");
  process.exit(1);
}

s = s.replace(oldText, newText);

fs.writeFileSync(file, s, "utf8");

console.log("OK - esperaSegundos agregado a DatosNodo en preview.");
console.log("Ahora ejecuta: npm run build");
