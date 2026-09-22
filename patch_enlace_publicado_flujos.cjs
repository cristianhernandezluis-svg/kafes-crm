const fs = require("fs");
const path = require("path");

const file = path.join(
  process.cwd(),
  "app",
  "flujos",
  "page.tsx"
);

const backup =
  file + ".backup-enlace-publicado";

if (!fs.existsSync(file)) {
  console.error("No existe:", file);
  process.exit(1);
}

let s = fs
  .readFileSync(file, "utf8")
  .replace(/\r\n/g, "\n");

if (
  s.includes('accion: "enlace"') &&
  s.includes("Obtener enlace publicado")
) {
  console.log(
    "La accion Obtener enlace publicado ya parece estar aplicada."
  );
  process.exit(0);
}

fs.copyFileSync(file, backup);

function replaceOnce(
  oldText,
  newText,
  label
) {
  if (!s.includes(oldText)) {
    console.error(
      "No encontre el bloque:",
      label
    );
    console.error(
      "Backup:",
      backup
    );
    process.exit(1);
  }

  s = s.replace(
    oldText,
    newText
  );
}

// 1) Agregar "enlace" al tipo de acciones.
replaceOnce(
`type AccionNodo =
  | "preview"
  | "inicial"
  | "id"
  | "renombrar"
  | "duplicar"
  | "eliminar";`,
`type AccionNodo =
  | "preview"
  | "inicial"
  | "enlace"
  | "id"
  | "renombrar"
  | "duplicar"
  | "eliminar";`,
"tipo AccionNodo"
);

// 2) Agregar boton Enlace a la barra.
replaceOnce(
`    {
      accion: "inicial",
      icono: "▶",
      titulo: "Asignar como paso inicial",
    },
    {
      accion: "id",`,
`    {
      accion: "inicial",
      icono: "▶",
      titulo: "Asignar como paso inicial",
    },
    {
      accion: "enlace",
      icono: "🔗",
      titulo: "Obtener enlace publicado",
    },
    {
      accion: "id",`,
"boton enlace"
);

// 3) Implementar la accion.
replaceOnce(
`      if (accion === "id") {
        navigator.clipboard`,
`      if (accion === "enlace") {
        if (
          !empresaId ||
          !flujoActivo
        ) {
          alert(
            "Primero abre un flujo."
          );
          return;
        }

        const params =
          new URLSearchParams({
            empresa_id:
              String(empresaId),
            flujo_id:
              String(
                flujoActivo.id
              ),
            nodo_uid:
              nodeId,
          });

        const enlace =
          \`\${window.location.origin}/flujos/preview?\${params.toString()}\`;

        navigator.clipboard
          .writeText(enlace)
          .then(() =>
            alert(
              \`Enlace publicado copiado:\\n\\n\${enlace}\`
            )
          )
          .catch(() =>
            window.prompt(
              "Copia este enlace:",
              enlace
            )
          );

        return;
      }

      if (accion === "id") {
        navigator.clipboard`,
"accion enlace"
);

// 4) Verificaciones.
const required = [
  '| "enlace"',
  'accion: "enlace"',
  'titulo: "Obtener enlace publicado"',
  "window.location.origin",
  "/flujos/preview?",
  "Enlace publicado copiado",
];

for (const item of required) {
  if (!s.includes(item)) {
    console.error(
      "Fallo verificacion:",
      item
    );
    console.error(
      "Backup:",
      backup
    );
    process.exit(1);
  }
}

fs.writeFileSync(
  file,
  s,
  "utf8"
);

console.log(
  "OK - Obtener enlace publicado agregado."
);
console.log(
  "El enlace usa el dominio actual y abre la vista previa desde el nodo seleccionado."
);
console.log(
  "Backup:",
  backup
);
console.log(
  "Siguiente paso: npm run build"
);
