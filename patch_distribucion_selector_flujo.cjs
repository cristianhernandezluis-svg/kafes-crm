const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "app", "distribucion", "page.tsx");
const backup = path.join(process.cwd(), "app", "distribucion", "page.tsx.backup-flujo");

if (!fs.existsSync(file)) {
  console.error("No existe:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

if (
  s.includes("type FlujoDistribucion =") &&
  s.includes("formulario.flujo_id") &&
  s.includes("setFlujos(data.flujos || [])")
) {
  console.log("La pantalla ya parece tener selector de flujo. No se aplicaron cambios.");
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

// 1) Tipo Flujo y campos del grupo.
replaceOnce(
`type GrupoDistribucion = {
  id: number;
  nombre: string;
  producto_slug: string | null;
  bot_slug: string | null;`,
`type FlujoDistribucion = {
  id: number;
  nombre: string;
  slug: string | null;
  producto_slug: string | null;
  activo: boolean;
};

type GrupoDistribucion = {
  id: number;
  nombre: string;
  producto_slug: string | null;
  bot_slug: string | null;
  flujo_id: number | null;
  flujo_nombre: string | null;
  flujo_slug: string | null;`,
"tipos GrupoDistribucion"
);

// 2) Formulario: flujo_id.
replaceOnce(
`type FormularioGrupo = {
  id: number | null;
  nombre: string;
  producto_slug: string;
  closer_principal_id: string;`,
`type FormularioGrupo = {
  id: number | null;
  nombre: string;
  producto_slug: string;
  flujo_id: string;
  closer_principal_id: string;`,
"FormularioGrupo flujo_id"
);

replaceOnce(
`  nombre: "",
  producto_slug: "",
  closer_principal_id: "",`,
`  nombre: "",
  producto_slug: "",
  flujo_id: "",
  closer_principal_id: "",`,
"formularioVacio flujo_id"
);

// 3) Estado de flujos.
replaceOnce(
`  const [grupos, setGrupos] = useState<GrupoDistribucion[]>([]);
  const [closers, setClosers] = useState<Closer[]>([]);`,
`  const [grupos, setGrupos] = useState<GrupoDistribucion[]>([]);
  const [flujos, setFlujos] = useState<FlujoDistribucion[]>([]);
  const [closers, setClosers] = useState<Closer[]>([]);`,
"estado flujos"
);

// 4) Al abrir grupo, cargar flujo.
replaceOnce(
`      nombre: grupo.nombre || "",
      producto_slug: grupo.producto_slug || "",
      closer_principal_id: grupo.closer_principal_id`,
`      nombre: grupo.nombre || "",
      producto_slug: grupo.producto_slug || "",
      flujo_id: grupo.flujo_id
        ? String(grupo.flujo_id)
        : "",
      closer_principal_id: grupo.closer_principal_id`,
"ponerGrupoEnFormulario flujo"
);

// 5) Cargar lista de flujos desde API.
replaceOnce(
`      setGrupos(nuevosGrupos);
      setClosers(data.closers || []);`,
`      setGrupos(nuevosGrupos);
      setFlujos(data.flujos || []);
      setClosers(data.closers || []);`,
"setFlujos"
);

// 6) Guardar flujo_id.
replaceOnce(
`          bot_slug: formulario.producto_slug.trim(),

          closer_principal_id:`,
`          bot_slug: formulario.producto_slug.trim(),

          flujo_id:
            formulario.flujo_id || null,

          closer_principal_id:`,
"guardar flujo_id"
);

// 7) Mostrar flujo en tarjeta del grupo.
replaceOnce(
`                        <div className="flex justify-between mt-1 text-xs">
                          <span className="text-slate-500">
                            Closer
                          </span>

                          <span className="font-semibold">
                            {grupo.closer_principal_nombre ||
                              "Sin asignar"}
                          </span>
                        </div>`,
`                        <div className="flex justify-between mt-1 text-xs">
                          <span className="text-slate-500">
                            Flujo
                          </span>

                          <span className="font-semibold text-right">
                            {grupo.flujo_nombre ||
                              "Sin flujo"}
                          </span>
                        </div>

                        <div className="flex justify-between mt-1 text-xs">
                          <span className="text-slate-500">
                            Closer
                          </span>

                          <span className="font-semibold">
                            {grupo.closer_principal_nombre ||
                              "Sin asignar"}
                          </span>
                        </div>`,
"tarjeta flujo"
);

// 8) Insertar selector de flujo después de Producto y antes de Closer principal.
const closerBlock = `                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      Closer principal
                    </label>`;

const flujoSelector = `                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      Flujo de primer contacto
                    </label>

                    <select
                      value={formulario.flujo_id}
                      onChange={(e) =>
                        setFormulario((actual) => ({
                          ...actual,
                          flujo_id: e.target.value,
                        }))
                      }
                      className={\`w-full border rounded-xl px-4 py-3 mt-2 outline-none focus:border-green-500 \${input}\`}
                    >
                      <option value="">
                        Sin flujo
                      </option>

                      {flujos.map((flujo) => (
                        <option
                          key={flujo.id}
                          value={flujo.id}
                        >
                          {flujo.nombre}
                          {flujo.producto_slug
                            ? \` - \${flujo.producto_slug}\`
                            : ""}
                        </option>
                      ))}
                    </select>

                    <p className="text-[11px] text-slate-500 mt-2">
                      Este flujo se ejecutará antes de activar el bot con OpenAI.
                    </p>
                  </div>

`;

if (!s.includes(closerBlock)) {
  console.error("No encontre el bloque: selector Closer principal");
  console.error("Backup:", backup);
  process.exit(1);
}
s = s.replace(closerBlock, flujoSelector + closerBlock);

// 9) Verificaciones.
const required = [
  "type FlujoDistribucion =",
  "flujo_id: string;",
  "setFlujos(data.flujos || []);",
  "formulario.flujo_id || null",
  "Flujo de primer contacto",
  "grupo.flujo_nombre",
];

for (const item of required) {
  if (!s.includes(item)) {
    console.error("Fallo verificacion:", item);
    console.error("Backup:", backup);
    process.exit(1);
  }
}

fs.writeFileSync(file, s, "utf8");

console.log("OK - app/distribucion/page.tsx actualizado con selector de flujo.");
console.log("Backup:", backup);
console.log("Siguiente paso: npm run build");
