const fs = require("fs");

const p = "app/reportes/page.tsx";
let c = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");

if (c.includes("SIDEBAR_REPORTES_V2")) {
  throw new Error("EL SIDEBAR V2 YA FUE APLICADO");
}

const puntoEstado = '  const [error, setError] = useState("");';

if (!c.includes(puntoEstado)) {
  throw new Error("NO SE ENCONTRO EL ESTADO error");
}

if (!c.includes("const cambiarTema")) {
  c = c.replace(
    puntoEstado,
    `${puntoEstado}

  const cambiarTema = () => {
    setTemaClaro((actual) => {
      const nuevoTema = !actual;
      localStorage.setItem(
        "tema-crm",
        nuevoTema ? "claro" : "oscuro"
      );
      return nuevoTema;
    });
  };`
  );
}

const root = '    <div className={`min-h-screen ${fondo}`}>';

if (!c.includes(root)) {
  throw new Error("NO SE ENCONTRO EL CONTENEDOR PRINCIPAL");
}

const sidebar = `
      {/* SIDEBAR_REPORTES_V2 */}
      <aside
        className={
          "hidden lg:flex w-60 flex-col h-screen sticky top-0 border-r transition-colors duration-300 " +
          (temaClaro
            ? "bg-white text-slate-800 border-slate-200"
            : "bg-[#101820] text-white border-[#1f2a33]")
        }
      >
        <div
          className={
            "flex items-center gap-3 px-4 py-4 border-b " +
            (temaClaro ? "border-slate-200" : "border-[#1f2a33]")
          }
        >
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-black">
            K
          </div>

          <h1 className="text-xl font-black">
            Kafes <span className="text-green-400">CRM</span>
          </h1>
        </div>

        <div className="px-4 pt-5 pb-2">
          <p
            className={
              "text-[11px] uppercase font-bold " +
              (temaClaro ? "text-slate-500" : "text-slate-400")
            }
          >
            Principal
          </p>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          <Link
            href="/dashboard"
            className={
              "flex items-center gap-3 px-3 py-3 rounded-lg text-sm " +
              (temaClaro
                ? "hover:bg-slate-100 text-slate-700"
                : "hover:bg-slate-800 text-white")
            }
          >
            {"\\uD83D\\uDCCA Dashboard"}
          </Link>

          <Link
            href="/chat"
            className={
              "flex items-center gap-3 px-3 py-3 rounded-lg text-sm " +
              (temaClaro
                ? "hover:bg-slate-100 text-slate-700"
                : "hover:bg-slate-800 text-white")
            }
          >
            {"\\uD83D\\uDCAC Conversaciones"}
          </Link>

          <Link
            href="/contactos"
            className={
              "flex items-center gap-3 px-3 py-3 rounded-lg text-sm " +
              (temaClaro
                ? "hover:bg-slate-100 text-slate-700"
                : "hover:bg-slate-800 text-white")
            }
          >
            {"\\uD83D\\uDC64 Contactos"}
          </Link>

          <Link
            href="/kanban"
            className={
              "flex items-center gap-3 px-3 py-3 rounded-lg text-sm " +
              (temaClaro
                ? "hover:bg-slate-100 text-slate-700"
                : "hover:bg-slate-800 text-white")
            }
          >
            {"\\uD83E\\uDDE9 Kanban"}
          </Link>

          <Link
            href="/catalogo"
            className={
              "flex items-center gap-3 px-3 py-3 rounded-lg text-sm " +
              (temaClaro
                ? "hover:bg-slate-100 text-slate-700"
                : "hover:bg-slate-800 text-white")
            }
          >
            {"\\uD83D\\uDCE6 Cat\\u00e1logo IA"}
          </Link>

          <Link
            href="/plantillas"
            className={
              "flex items-center gap-3 px-3 py-3 rounded-lg text-sm " +
              (temaClaro
                ? "hover:bg-slate-100 text-slate-700"
                : "hover:bg-slate-800 text-white")
            }
          >
            {"\\uD83D\\uDCC4 Plantillas"}
          </Link>

          <Link
            href="/automatizaciones"
            className={
              "flex items-center gap-3 px-3 py-3 rounded-lg text-sm " +
              (temaClaro
                ? "hover:bg-slate-100 text-slate-700"
                : "hover:bg-slate-800 text-white")
            }
          >
            {"\\u2699\\uFE0F Automatizaciones"}
          </Link>

          <Link
            href="/reportes"
            className="flex items-center gap-3 bg-green-700/70 text-white px-3 py-3 rounded-lg font-bold text-sm"
          >
            {"\\uD83D\\uDCCA Reportes"}
          </Link>

          <Link
            href="/ajustes"
            className={
              "flex items-center gap-3 px-3 py-3 rounded-lg text-sm " +
              (temaClaro
                ? "hover:bg-slate-100 text-slate-700"
                : "hover:bg-slate-800 text-white")
            }
          >
            {"\\u2699\\uFE0F Ajustes"}
          </Link>
        </nav>

        <div className="p-3">
          <div
            className={
              "border rounded-xl p-4 transition-colors duration-300 " +
              (temaClaro
                ? "border-slate-200 bg-slate-50"
                : "border-[#26323d] bg-[#111c24]")
            }
          >
            <p
              className={
                "text-sm font-bold mb-3 " +
                (temaClaro ? "text-slate-700" : "text-slate-300")
              }
            >
              Conexión WhatsApp
            </p>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-xl">
                {"\\uD83D\\uDFE2"}
              </div>

              <div>
                <p className="text-green-400 font-bold text-sm">
                  Conectado
                </p>
                <p className="text-xs text-slate-400">
                  Canal activo
                </p>
              </div>
            </div>

            <Link
              href="/configuracion/whatsapp"
              className="block w-full text-center border border-slate-700 rounded-lg py-2 text-xs font-bold hover:bg-slate-800"
            >
              VER QR
            </Link>

            <div
              className={
                "mt-3 pt-3 border-t " +
                (temaClaro ? "border-slate-200" : "border-[#26323d]")
              }
            >
              <button
                type="button"
                onClick={cambiarTema}
                className="w-full flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">
                    {temaClaro ? "\\u2600\\uFE0F" : "\\uD83C\\uDF19"}
                  </span>

                  <span
                    className={
                      "text-xs font-semibold " +
                      (temaClaro ? "text-slate-700" : "text-slate-300")
                    }
                  >
                    {temaClaro ? "Modo claro" : "Modo oscuro"}
                  </span>
                </div>

                <div
                  className={
                    "relative w-10 h-5 rounded-full transition-all duration-300 " +
                    (temaClaro ? "bg-green-500" : "bg-slate-600")
                  }
                >
                  <div
                    className={
                      "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 " +
                      (temaClaro ? "left-[22px]" : "left-0.5")
                    }
                  />
                </div>
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem("usuario");
            window.location.href = "/login";
          }}
          className="px-4 pb-4 text-left text-slate-400 hover:text-red-400 text-sm"
        >
          {"\\u21A9 Cerrar sesi\\u00f3n"}
        </button>
      </aside>`;

c = c.replace(
  root,
  `    <div className={"min-h-screen flex " + fondo}>${sidebar}
      <div className="flex-1 min-w-0">`
);

const headerInicio = c.indexOf("      <header");
const headerFinTexto = "      </header>";
const headerFin = c.indexOf(headerFinTexto, headerInicio);

if (headerInicio < 0 || headerFin < 0) {
  throw new Error("NO SE ENCONTRO EL HEADER ANTIGUO");
}

const topbar = `      <div
        className={
          "h-12 border-b flex items-center justify-between px-5 shrink-0 transition-colors duration-300 " +
          (temaClaro
            ? "bg-white border-slate-200"
            : "bg-[#0b1218] border-[#1f2a33]")
        }
      >
        <h1
          className={
            "text-sm font-bold " +
            (temaClaro ? "text-slate-900" : "text-white")
          }
        >
          Reportes
        </h1>

        <Link
          href="/administracion"
          className="flex items-center gap-2 hover:bg-slate-800 px-2 py-1 rounded-lg"
        >
          <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-black">
            C
          </div>

          <div>
            <p
              className={
                "text-xs font-bold " +
                (temaClaro ? "text-slate-900" : "text-white")
              }
            >
              Administrador
            </p>
            <p className="text-[10px] text-green-400">
              En línea
            </p>
          </div>
        </Link>
      </div>`;

c =
  c.slice(0, headerInicio) +
  topbar +
  c.slice(headerFin + headerFinTexto.length);

const mainViejo =
  '      <main className="max-w-7xl mx-auto p-4 md:p-6">';

const mainNuevo =
  '      <main className="h-[calc(100vh-48px)] overflow-y-auto">\n' +
  '        <div className="max-w-7xl mx-auto p-4 md:p-6">';

if (!c.includes(mainViejo)) {
  throw new Error("NO SE ENCONTRO EL MAIN ORIGINAL");
}

c = c.replace(mainViejo, mainNuevo);

const cierreViejo =
  "      </main>\n    </div>\n  );";

const cierreNuevo =
  "        </div>\n" +
  "      </main>\n" +
  "      </div>\n" +
  "    </div>\n" +
  "  );";

if (!c.includes(cierreViejo)) {
  throw new Error("NO SE ENCONTRO EL CIERRE ORIGINAL");
}

c = c.replace(cierreViejo, cierreNuevo);

fs.writeFileSync(p, c, "utf8");

console.log("SIDEBAR REPORTES V2 APLICADO SIN ALTERAR UTF-8");