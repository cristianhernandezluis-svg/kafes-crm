const fs = require("fs");
const path = require("path");

const file = path.join(
  process.cwd(),
  "app",
  "flujos",
  "page.tsx"
);

const backup =
  file + ".backup-menu-esperar";

if (!fs.existsSync(file)) {
  console.error("No existe:", file);
  process.exit(1);
}

let s = fs
  .readFileSync(file, "utf8")
  .replace(/\r\n/g, "\n");

if (
  s.includes("agregarPasoEsperaTiempo") &&
  s.includes("⏱ Esperar") &&
  s.indexOf("⏱ Esperar") > 1500
) {
  console.log(
    "El boton ⏱ Esperar ya parece estar en el menu."
  );
  process.exit(0);
}

fs.copyFileSync(file, backup);

const anchor = `                <button
                  onClick={
                    agregarPasoEsperar
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm"
                >
                  ⏸ Esperar respuesta
                </button>`;

if (!s.includes(anchor)) {
  console.error(
    "No encontre el boton Esperar respuesta en el menu."
  );
  console.error(
    "No se hizo ningun cambio."
  );
  process.exit(1);
}

const nuevo = `                <button
                  onClick={
                    agregarPasoEsperaTiempo
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm"
                >
                  ⏱ Esperar
                </button>

${anchor}`;

s = s.replace(anchor, nuevo);

fs.writeFileSync(
  file,
  s,
  "utf8"
);

console.log(
  "OK - boton ⏱ Esperar agregado al menu AÑADIR PASO."
);
console.log(
  "Quedo antes de ⏸ Esperar respuesta."
);
console.log(
  "Backup:",
  backup
);
console.log(
  "Ahora ejecuta: npm run build"
);
