const fs = require("fs");

const file = "app/api/productos/media/[id]/route.ts";
let s = fs.readFileSync(file, "utf8");

const oldLine = `  const ext = path.extname(ruta || "").toLowerCase();`;

const newLine = `  const rutaLimpia = String(ruta || "").toLowerCase().split("?")[0];
  const punto = rutaLimpia.lastIndexOf(".");
  const ext = punto >= 0 ? rutaLimpia.slice(punto) : "";`;

if (!s.includes(oldLine)) {
  if (s.includes("const rutaLimpia = String(ruta ||")) {
    console.log("YA EXISTE: mime sin path.extname");
  } else {
    throw new Error("No encontre path.extname en mimeDesdeRuta");
  }
} else {
  s = s.replace(oldLine, newLine);
  console.log("OK: eliminado path.extname");
}

fs.writeFileSync(file, s, "utf8");

console.log("ACTUALIZADO:", file);
console.log("PATCH V3.4 MIME SIN PATH: OK");
