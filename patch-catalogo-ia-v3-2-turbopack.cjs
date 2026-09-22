const fs = require("fs");

const file = "app/api/productos/media/[id]/route.ts";
let s = fs.readFileSync(file, "utf8");

const oldStorage = `const STORAGE_DIR =
  process.env.CATALOGO_STORAGE_DIR ||
  path.join(process.cwd(), "storage", "catalogo");`;

const newStorage = `const STORAGE_DIR =
  process.env.CATALOGO_STORAGE_DIR ||
  "storage/catalogo";`;

if (s.includes(oldStorage)) {
  s = s.replace(oldStorage, newStorage);
  console.log("OK: storage acotado");
} else if (s.includes('"storage/catalogo"')) {
  console.log("YA EXISTE: storage acotado");
} else {
  throw new Error("No encontre definicion STORAGE_DIR");
}

const oldBlock = `    const rutaRelativa = String(media.url || "").replace(/^[/\\\\]+/, "");
    const rutaAbsoluta = path.resolve(STORAGE_DIR, rutaRelativa);
    const raizAbsoluta = path.resolve(STORAGE_DIR);

    if (
      rutaAbsoluta !== raizAbsoluta &&
      !rutaAbsoluta.startsWith(raizAbsoluta + path.sep)
    ) {
      return new Response("Ruta inválida", { status: 400 });
    }

    const buffer = await readFile(rutaAbsoluta);`;

const newBlock = `    const rutaRelativa = String(media.url || "").replace(/^[/\\\\]+/, "");
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

if (s.includes(oldBlock)) {
  s = s.replace(oldBlock, newBlock);
  console.log("OK: lectura multimedia segura y acotada");
} else if (s.includes("turbopackIgnore: true")) {
  console.log("YA EXISTE: lectura multimedia acotada");
} else {
  throw new Error("No encontre bloque de lectura multimedia");
}

fs.writeFileSync(file, s, "utf8");
console.log("ACTUALIZADO:", file);
console.log("PATCH TURBOPACK MULTIMEDIA: OK");
