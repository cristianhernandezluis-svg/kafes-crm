const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "app", "flujos", "page.tsx");
const backup = path.join(process.cwd(), "app", "flujos", "page.tsx.backup-posicion-pasos");

if (!fs.existsSync(file)) {
  console.error("No existe:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

if (s.includes("const obtenerPosicionNuevoPaso = () =>")) {
  console.log("La mejora de posicion ya parece estar aplicada.");
  process.exit(0);
}

fs.copyFileSync(file, backup);

const inicio = s.indexOf("  const agregarPasoMensaje = () => {");
const fin = s.indexOf("  const agregarContenido = (", inicio);

if (inicio < 0 || fin < 0) {
  console.error("No pude localizar las funciones de pasos.");
  console.error("Backup:", backup);
  process.exit(1);
}

const nuevoBloque = `  const obtenerPosicionNuevoPaso = () => {
    if (nodes.length === 0) {
      return {
        x: 450,
        y: 260,
      };
    }

    const ultimoNodo = [...nodes].sort(
      (a, b) =>
        Number(b.position.x || 0) -
        Number(a.position.x || 0)
    )[0];

    return {
      x:
        Number(
          ultimoNodo?.position.x || 0
        ) + 300,
      y:
        Number(
          ultimoNodo?.position.y || 0
        ),
    };
  };

  const agregarPasoMensaje = () => {
    if (!flujoActivo) return;

    const mensajesExistentes =
      nodes.filter(
        (nodo) =>
          nodo.type === "mensaje"
      ).length;

    const titulo =
      mensajesExistentes === 0
        ? "Enviar mensaje"
        : \`Enviar mensaje #\${mensajesExistentes}\`;

    const id = idNuevo("mensaje");
    const position =
      obtenerPosicionNuevoPaso();

    setNodes((actuales) => [
      ...actuales,
      {
        id,
        type: "mensaje",
        position,
        data: {
          titulo,
          tipoMensaje: "omnichannel",
          contenidos: [],
        },
      },
    ]);

    setNodoSeleccionadoId(id);
  };

  const agregarPasoEsperar = () => {
    if (!flujoActivo) return;

    const id = idNuevo("esperar");
    const position =
      obtenerPosicionNuevoPaso();

    setNodes((actuales) => [
      ...actuales,
      {
        id,
        type: "esperar_respuesta",
        position,
        data: {
          subtitulo:
            "Esperar mensaje del cliente",
        },
      },
    ]);

    setNodoSeleccionadoId(id);
  };

  const agregarPasoBot = () => {
    if (!flujoActivo) return;

    const id = idNuevo("bot");
    const position =
      obtenerPosicionNuevoPaso();

    setNodes((actuales) => [
      ...actuales,
      {
        id,
        type: "activar_bot",
        position,
        data: {
          subtitulo:
            "Continuar con OpenAI",
        },
      },
    ]);

    setNodoSeleccionadoId(id);
  };

`;

s = s.slice(0, inicio) + nuevoBloque + s.slice(fin);

fs.writeFileSync(file, s, "utf8");

console.log("OK - los pasos nuevos apareceran a la derecha del ultimo nodo.");
console.log("Backup:", backup);
console.log("Siguiente paso: npm run build");
