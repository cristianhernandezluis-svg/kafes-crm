const fs = require("fs");

const file = "app/api/productos/media/[id]/route.ts";
let s = fs.readFileSync(file, "utf8");

// Ya no necesitamos node:path en este endpoint.
s = s.replace('import path from "node:path";\n', "");

// Normalizar STORAGE_DIR sin usar path.join/path.resolve.
const oldStorage = `const STORAGE_DIR =
  process.env.CATALOGO_STORAGE_DIR ||
  "storage/catalogo";`;

const newStorage = `const STORAGE_DIR = String(
  process.env.CATALOGO_STORAGE_DIR || "storage/catalogo"
)
  .replace(/\\\\/g, "/")
  .replace(/\\/+$/, "");`;

if (s.includes(oldStorage)) {
  s = s.replace(oldStorage, newStorage);
  console.log("OK: STORAGE_DIR sin path.join");
} else if (s.includes('process.env.CATALOGO_STORAGE_DIR || "storage/catalogo"') && s.includes('.replace(/\\\\/g, "/")')) {
  console.log("YA EXISTE: STORAGE_DIR sin path.join");
} else {
  throw new Error("No encontre bloque STORAGE_DIR esperado");
}

const oldBlock = `    const rutaRelativa = String(media.url || "").replace(/^[/\\\\]+/, "");
    const rutaNormalizada = path.normalize(rutaRelativa);

    if (
      path.isAbsolute(rutaNormalizada) ||
      rutaNormalizada === ".." ||
      rutaNormalizada.startsWith(\`..\${path.sep}\`)
    ) {
      return new Response("Ruta inválida", { status: 400 });
    }

    const rutaAbsoluta = path.join(STORAGE_DIR, rutaNormalizada);
    const buffer = await readFile(/* turbopackIgnore: true */ rutaAbsoluta);`;

const newBlock = `    const rutaRelativa = String(media.url || "")
      .replace(/\\\\/g, "/")
      .replace(/^\\/+/, "");

    const partesRuta = rutaRelativa
      .split("/")
      .filter((parte) => parte && parte !== ".");

    if (
      !rutaRelativa ||
      rutaRelativa.includes("\\\\0") ||
      partesRuta.some((parte) => parte === "..")
    ) {
      return new Response("Ruta inválida", { status: 400 });
    }

    const rutaSegura = partesRuta.join("/");
    const rutaAbsoluta = \`\${STORAGE_DIR}/\${rutaSegura}\`;
    const buffer = await readFile(/* turbopackIgnore: true */ rutaAbsoluta);`;

if (s.includes(oldBlock)) {
  s = s.replace(oldBlock, newBlock);
  console.log("OK: lectura sin path.join dinamico");
} else if (s.includes("const rutaSegura = partesRuta.join")) {
  console.log("YA EXISTE: lectura sin path.join dinamico");
} else {
  throw new Error("No encontre bloque de lectura esperado");
}

fs.writeFileSync(file, s, "utf8");

console.log("ACTUALIZADO:", file);
console.log("PATCH TURBOPACK V3.3: OK");
