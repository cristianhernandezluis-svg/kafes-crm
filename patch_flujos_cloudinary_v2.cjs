const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "app", "flujos", "page.tsx");
const backup = path.join(process.cwd(), "app", "flujos", "page.tsx.backup-cloudinary");

if (!fs.existsSync(file)) {
  console.error("No existe:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");
s = s.replace(/\r\n/g, "\n");

if (s.includes("const subirArchivoContenido = async")) {
  console.log("El archivo ya parece tener la carga Cloudinary. No se aplicaron cambios.");
  process.exit(0);
}

fs.copyFileSync(file, backup);

function replaceOnce(oldText, newText, label) {
  if (!s.includes(oldText)) {
    console.error("No encontre el bloque:", label);
    console.error("Se dejo el backup en:", backup);
    process.exit(1);
  }
  s = s.replace(oldText, newText);
}

// 1) Datos del nodo + tipos Cloudinary.
replaceOnce(
`type DatosNodo = {
  titulo?: string;
  contenidos?: ContenidoNodo[];
  subtitulo?: string;
};`,
`type DatosNodo = {
  titulo?: string;
  contenidos?: ContenidoNodo[];
  subtitulo?: string;
  tipoMensaje?: "omnichannel" | "webchat";
};

type CloudinarySignatureResponse = {
  timestamp: number;
  signature: string;
  folder: string;
  apiKey: string;
  cloudName: string;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  error?: {
    message?: string;
  };
};`,
"DatosNodo"
);

// 2) Estado de subida.
replaceOnce(
`  const [creando, setCreando] =
    useState(false);`,
`  const [creando, setCreando] =
    useState(false);

  const [
    subiendoContenidoId,
    setSubiendoContenidoId,
  ] = useState<string | null>(null);`,
"estado creando"
);

// 3) Mensajes existentes: omnichannel por defecto.
replaceOnce(
`        return {
          id: nodo.nodo_uid,
          type: tipo,`,
`        if (
          tipo === "mensaje" &&
          !(config as DatosNodo).tipoMensaje
        ) {
          config = {
            ...config,
            tipoMensaje: "omnichannel",
          };
        }

        return {
          id: nodo.nodo_uid,
          type: tipo,`,
"carga de nodos"
);

// 4) Mensajes nuevos: omnichannel por defecto.
replaceOnce(
`        data: {
          titulo,
          contenidos: [],
        },`,
`        data: {
          titulo,
          tipoMensaje: "omnichannel",
          contenidos: [],
        },`,
"nuevo mensaje"
);

// 5) Funcion de subida firmada a Cloudinary.
const eliminarAnchor = `  const eliminarContenido = (
    contenidoId: string
  ) => {`;

const uploadHelper = `  const subirArchivoContenido = async (
    contenidoId: string,
    archivo: File,
    tipo: "imagen" | "video"
  ) => {
    if (!flujoActivo) {
      alert("Primero selecciona un flujo.");
      return;
    }

    if (
      tipo === "imagen" &&
      !archivo.type.startsWith("image/")
    ) {
      alert("Selecciona un archivo de imagen.");
      return;
    }

    if (
      tipo === "video" &&
      !archivo.type.startsWith("video/")
    ) {
      alert("Selecciona un archivo de video.");
      return;
    }

    try {
      setSubiendoContenidoId(contenidoId);

      const firmaResponse = await fetch(
        "/api/cloudinary/signature",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tipo: "flujo",
            flujoId: flujoActivo.id,
          }),
        }
      );

      const firma =
        (await firmaResponse.json()) as
          | CloudinarySignatureResponse
          | { error?: string };

      if (
        !firmaResponse.ok ||
        !("signature" in firma) ||
        !firma.signature ||
        !firma.cloudName ||
        !firma.apiKey
      ) {
        throw new Error(
          "error" in firma && firma.error
            ? firma.error
            : "No se pudo preparar la carga."
        );
      }

      const formData = new FormData();

      formData.append("file", archivo);
      formData.append("api_key", firma.apiKey);
      formData.append(
        "timestamp",
        String(firma.timestamp)
      );
      formData.append(
        "signature",
        firma.signature
      );
      formData.append("folder", firma.folder);

      const resourceType =
        tipo === "video" ? "video" : "image";

      const uploadResponse = await fetch(
        \`https://api.cloudinary.com/v1_1/\${firma.cloudName}/\${resourceType}/upload\`,
        {
          method: "POST",
          body: formData,
        }
      );

      const upload =
        (await uploadResponse.json()) as
          CloudinaryUploadResponse;

      if (
        !uploadResponse.ok ||
        !upload.secure_url
      ) {
        throw new Error(
          upload.error?.message ||
            "Cloudinary no pudo subir el archivo."
        );
      }

      actualizarContenido(contenidoId, {
        url: upload.secure_url,
      });
    } catch (error) {
      console.error(
        "Error subiendo archivo:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "No se pudo subir el archivo."
      );
    } finally {
      setSubiendoContenidoId(null);
    }
  };

`;

replaceOnce(
  eliminarAnchor,
  uploadHelper + eliminarAnchor,
  "eliminarContenido"
);

// 6) Selector Omnichannel / Webchat debajo del titulo del nodo.
replaceOnce(
`                className="w-full border-b border-slate-300 bg-transparent pb-2 text-sm font-bold outline-none"
              />

              <div className="mt-5 space-y-3">`,
`                className="w-full border-b border-slate-300 bg-transparent pb-2 text-sm font-bold outline-none"
              />

              <div className="mt-4">
                <label className="mb-1 block text-[11px] font-bold text-slate-500">
                  Tipo de mensaje
                </label>

                <select
                  value={
                    (
                      nodoSeleccionado.data as DatosNodo
                    ).tipoMensaje ||
                    "omnichannel"
                  }
                  onChange={(e) =>
                    actualizarDataNodo({
                      tipoMensaje:
                        e.target.value as
                          | "omnichannel"
                          | "webchat",
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="omnichannel">
                    Omnichannel
                  </option>
                  <option value="webchat">
                    Webchat
                  </option>
                </select>
              </div>

              <div className="mt-5 space-y-3">`,
"selector Tipo de mensaje"
);

// 7) Reemplazar editor de imagen.
const imageStart = `                      {contenido.tipo ===
                        "imagen" && (`;

const videoStart = `                      {contenido.tipo ===
                        "video" && (`;

let a = s.indexOf(imageStart);
let b = s.indexOf(videoStart, a);

if (a < 0 || b < 0) {
  console.error("No encontre los bloques imagen/video.");
  console.error("Se dejo el backup en:", backup);
  process.exit(1);
}

const imageBlock = `                      {contenido.tipo ===
                        "imagen" && (
                        <>
                          <label className="flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-5 text-center hover:border-orange-400">
                            {contenido.url ? (
                              <img
                                src={contenido.url}
                                alt=""
                                className="mb-3 max-h-[220px] w-full rounded-lg object-contain"
                              />
                            ) : (
                              <div className="mb-3 text-4xl">
                                IMAGEN
                              </div>
                            )}

                            <span className="text-sm font-bold text-orange-500">
                              {subiendoContenidoId ===
                              contenido.id
                                ? "Subiendo..."
                                : "Subir imagen"}
                            </span>

                            <span className="mt-1 text-[11px] text-slate-400">
                              desde tu computadora
                            </span>

                            <input
                              type="file"
                              accept="image/*"
                              disabled={
                                subiendoContenidoId ===
                                contenido.id
                              }
                              className="hidden"
                              onChange={async (e) => {
                                const archivo =
                                  e.target.files?.[0];

                                if (archivo) {
                                  await subirArchivoContenido(
                                    contenido.id,
                                    archivo,
                                    "imagen"
                                  );
                                }

                                e.currentTarget.value = "";
                              }}
                            />
                          </label>

                          <div className="my-3 flex items-center gap-2">
                            <div className="h-px flex-1 bg-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400">
                              O INSERTAR URL
                            </span>
                            <div className="h-px flex-1 bg-slate-300" />
                          </div>

                          <input
                            value={contenido.url || ""}
                            onChange={(e) =>
                              actualizarContenido(
                                contenido.id,
                                {
                                  url: e.target.value,
                                }
                              )
                            }
                            placeholder="https://..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                          />
                        </>
                      )}

`;

s = s.slice(0, a) + imageBlock + s.slice(b);

// 8) Reemplazar editor de video.
a = s.indexOf(videoStart);
const typingStart = `                      {contenido.tipo ===
                        "escribiendo" && (`;
b = s.indexOf(typingStart, a);

if (a < 0 || b < 0) {
  console.error("No encontre el bloque video/escribiendo.");
  console.error("Se dejo el backup en:", backup);
  process.exit(1);
}

const videoBlock = `                      {contenido.tipo ===
                        "video" && (
                        <>
                          <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-5 text-center hover:border-orange-400">
                            {contenido.url ? (
                              <video
                                src={contenido.url}
                                controls
                                className="mb-3 max-h-[220px] w-full rounded-lg bg-black"
                              />
                            ) : (
                              <div className="mb-3 text-4xl">
                                VIDEO
                              </div>
                            )}

                            <span className="text-sm font-bold text-orange-500">
                              {subiendoContenidoId ===
                              contenido.id
                                ? "Subiendo..."
                                : "Subir video"}
                            </span>

                            <span className="mt-1 text-[11px] text-slate-400">
                              desde tu computadora
                            </span>

                            <input
                              type="file"
                              accept="video/*"
                              disabled={
                                subiendoContenidoId ===
                                contenido.id
                              }
                              className="hidden"
                              onChange={async (e) => {
                                const archivo =
                                  e.target.files?.[0];

                                if (archivo) {
                                  await subirArchivoContenido(
                                    contenido.id,
                                    archivo,
                                    "video"
                                  );
                                }

                                e.currentTarget.value = "";
                              }}
                            />
                          </label>

                          <div className="my-3 flex items-center gap-2">
                            <div className="h-px flex-1 bg-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400">
                              O INSERTAR URL
                            </span>
                            <div className="h-px flex-1 bg-slate-300" />
                          </div>

                          <input
                            value={contenido.url || ""}
                            onChange={(e) =>
                              actualizarContenido(
                                contenido.id,
                                {
                                  url: e.target.value,
                                }
                              )
                            }
                            placeholder="https://..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                          />
                        </>
                      )}

`;

s = s.slice(0, a) + videoBlock + s.slice(b);

fs.writeFileSync(file, s, "utf8");

console.log("OK - app/flujos/page.tsx actualizado.");
console.log("Backup:", backup);
console.log("Siguiente paso: npm run build");
