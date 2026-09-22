const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "app", "flujos", "page.tsx");
const backup = file + ".backup-fix-toolbar-esperar";

if (!fs.existsSync(file)) {
  console.error("No existe:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
fs.copyFileSync(file, backup);

const roto = `        {acciones.map((item) => (
                          <button
                  onClick={
                    agregarPasoEsperaTiempo
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm"
                >
                  ⏱ Esperar
                </button>

<button
            key={item.accion}`;

const rotoMojibake = `        {acciones.map((item) => (
                          <button
                  onClick={
                    agregarPasoEsperaTiempo
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm"
                >
                  â± Esperar
                </button>

<button
            key={item.accion}`;

const correcto = `        {acciones.map((item) => (
          <button
            key={item.accion}`;

if (s.includes(roto)) {
  s = s.replace(roto, correcto);
} else if (s.includes(rotoMojibake)) {
  s = s.replace(rotoMojibake, correcto);
} else {
  console.error("No encontre exactamente el bloque roto de la barra.");
  console.error("No se hizo ningun cambio.");
  process.exit(1);
}

fs.writeFileSync(file, s, "utf8");

console.log("OK - barra de acciones reparada.");
console.log("Se retiro solamente el boton Esperar que se habia insertado dentro de acciones.map.");
console.log("La funcion/nodo Esperar no fue eliminada.");
console.log("Backup:", backup);
console.log("Ahora ejecuta: npm run build");
