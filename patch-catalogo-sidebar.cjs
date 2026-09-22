const fs = require("fs");

const f = "app/catalogo/page.tsx";
let s = fs.readFileSync(f, "utf8");

const inicio = '      <main className="min-h-screen bg-gray-100 p-4 md:p-8 text-slate-900">';

if (!s.includes(inicio)) {
  throw new Error("No encontre el main actual");
}

const sidebar = `      <div className={\`min-h-screen flex transition-colors duration-300 \${temaClaro ? "bg-slate-100 text-slate-900" : "bg-[#0b1220] text-white"}\`}>
        <aside className={\`hidden lg:flex w-60 flex-col h-screen sticky top-0 border-r transition-colors duration-300 \${temaClaro ? "bg-white text-slate-800 border-slate-200" : "bg-[#101820] text-white border-[#1f2a33]"}\`}>
          <div className={\`flex items-center gap-3 px-4 py-4 border-b \${temaClaro ? "border-slate-200" : "border-[#1f2a33]"}\`}>
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-black">
              K
            </div>
            <h1 className="text-xl font-black">
              Kafes <span className="text-green-400">CRM</span>
            </h1>
          </div>

          <div className="px-4 pt-5 pb-2">
            <p className={\`text-[11px] uppercase font-bold \${temaClaro ? "text-slate-500" : "text-slate-400"}\`}>
              Principal
            </p>
          </div>

          <nav className="flex-1 px-2 space-y-1">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
              Dashboard
            </Link>

            <Link href="/chat" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
              Conversaciones
            </Link>

            <Link href="/contactos" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
              Contactos
            </Link>

            <Link href="/kanban" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
              Kanban
            </Link>

            <Link href="/catalogo" className="flex items-center gap-3 bg-green-700/70 text-white px-3 py-3 rounded-lg font-bold text-sm">
              Catalogo IA
            </Link>

            <Link href="/plantillas" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
              Plantillas
            </Link>

            <Link href="/automatizaciones" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
              Automatizaciones
            </Link>

            <Link href="/reportes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
              Reportes
            </Link>

            <Link href="/ajustes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
              Ajustes
            </Link>
          </nav>

          <div className="p-3">
            <div className={\`border rounded-xl p-4 transition-colors duration-300 \${temaClaro ? "border-slate-200 bg-slate-50" : "border-[#26323d] bg-[#111c24]"}\`}>
              <p className={\`text-sm font-bold mb-3 \${temaClaro ? "text-slate-700" : "text-slate-300"}\`}>
                Conexion WhatsApp
              </p>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-xl">
                  ●
                </div>

                <div>
                  <p className="text-green-400 font-bold text-sm">Conectado</p>
                  <p className="text-xs text-slate-400">Cloud API activa</p>
                </div>
              </div>

              <Link
                href="/configuracion/whatsapp"
                className="block w-full text-center border border-slate-700 rounded-lg py-2 text-xs font-bold hover:bg-slate-800"
              >
                VER QR
              </Link>

              <div className={\`mt-3 pt-3 border-t \${temaClaro ? "border-slate-200" : "border-[#26323d]"}\`}>
                <button
                  type="button"
                  onClick={cambiarTema}
                  className="w-full flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">
                      {temaClaro ? "Modo claro" : "Modo oscuro"}
                    </span>
                  </div>

                  <div className={\`relative w-10 h-5 rounded-full transition-all duration-300 \${temaClaro ? "bg-green-500" : "bg-slate-600"}\`}>
                    <div className={\`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 \${temaClaro ? "left-[22px]" : "left-0.5"}\`} />
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
            Cerrar sesion
          </button>
        </aside>

        <main className="flex-1 min-w-0 min-h-screen bg-gray-100 p-4 md:p-8 text-slate-900">`;

s = s.replace(inicio, sidebar);

const fin = `      </main>
    </>`;

if (!s.includes(fin)) {
  throw new Error("No encontre el cierre del main");
}

s = s.replace(
  fin,
  `        </main>
      </div>
    </>`
);

fs.writeFileSync(f, s, "utf8");

console.log("Sidebar agregado a Catalogo IA");