"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarProps = {
  temaClaro: boolean;
  onCambiarTema: () => void;
  conversacionesCount?: number;
  canalConectado?: boolean;
};

const opciones = [
  {
    href: "/dashboard",
    icono: "\uD83D\uDCCA",
    texto: "Dashboard",
  },
  {
    href: "/chat",
    icono: "\uD83D\uDCAC",
    texto: "Conversaciones",
  },
  {
    href: "/contactos",
    icono: "\uD83D\uDC64",
    texto: "Contactos",
  },
  {
    href: "/kanban",
    icono: "\uD83E\uDDE9",
    texto: "Kanban",
  },
  {
    href: "/catalogo",
    icono: "\uD83D\uDCE6",
    texto: "Catálogo IA",
  },
  {
    href: "/plantillas",
    icono: "\uD83D\uDCC4",
    texto: "Plantillas",
  },
  {
    href: "/automatizaciones",
    icono: "\u2699\uFE0F",
    texto: "Automatizaciones",
  },
  {
    href: "/reportes",
    icono: "\uD83D\uDCCA",
    texto: "Reportes",
  },
  {
    href: "/ajustes",
    icono: "\u2699\uFE0F",
    texto: "Ajustes",
  },
];

export default function Sidebar({
  temaClaro,
  onCambiarTema,
  conversacionesCount,
  canalConectado = true,
}: SidebarProps) {
  const pathname = usePathname();

  const esActivo = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const claseOpcion = (href: string) => {
    if (esActivo(href)) {
      return "flex items-center justify-between gap-3 bg-green-700/70 text-white px-3 py-3 rounded-lg font-bold text-sm";
    }

    return `flex items-center justify-between gap-3 px-3 py-3 rounded-lg text-sm ${
      temaClaro
        ? "hover:bg-slate-100 text-slate-700"
        : "hover:bg-slate-800 text-white"
    }`;
  };

  return (
    <aside
      className={`hidden lg:flex w-60 flex-col h-screen sticky top-0 border-r transition-colors duration-300 ${
        temaClaro
          ? "bg-white text-slate-800 border-slate-200"
          : "bg-[#101820] text-white border-[#1f2a33]"
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-4 border-b ${
          temaClaro ? "border-slate-200" : "border-[#1f2a33]"
        }`}
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
          className={`text-[11px] uppercase font-bold ${
            temaClaro ? "text-slate-500" : "text-slate-400"
          }`}
        >
          Principal
        </p>
      </div>

      <nav className="flex-1 px-2 space-y-1">
        {opciones.map((opcion) => (
          <Link
            key={opcion.href}
            href={opcion.href}
            className={claseOpcion(opcion.href)}
          >
            <span className="flex items-center gap-3">
              <span>{opcion.icono}</span>
              <span>{opcion.texto}</span>
            </span>

            {opcion.href === "/chat" &&
              typeof conversacionesCount === "number" && (
                <span className="bg-green-500 text-white text-[11px] px-2 py-0.5 rounded-full">
                  {conversacionesCount}
                </span>
              )}
          </Link>
        ))}
      </nav>

      <div className="p-3">
        <div
          className={`border rounded-xl p-4 transition-colors duration-300 ${
            temaClaro
              ? "border-slate-200 bg-slate-50"
              : "border-[#26323d] bg-[#111c24]"
          }`}
        >
          <p
            className={`text-sm font-bold mb-3 ${
              temaClaro ? "text-slate-700" : "text-slate-300"
            }`}
          >
            Conexión WhatsApp
          </p>

          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                canalConectado ? "bg-green-500" : "bg-slate-600"
              }`}
            >
              {canalConectado ? "\uD83D\uDFE2" : "\u26AA"}
            </div>

            <div>
              <p
                className={`font-bold text-sm ${
                  canalConectado ? "text-green-400" : "text-slate-400"
                }`}
              >
                {canalConectado ? "Conectado" : "Desconectado"}
              </p>

              <p className="text-xs text-slate-400">
                {canalConectado ? "Canal activo" : "Sin canal activo"}
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
            className={`mt-3 pt-3 border-t ${
              temaClaro ? "border-slate-200" : "border-[#26323d]"
            }`}
          >
            <button
              type="button"
              onClick={onCambiarTema}
              className="w-full flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">
                  {temaClaro ? "\u2600\uFE0F" : "\uD83C\uDF19"}
                </span>

                <span
                  className={`text-xs font-semibold ${
                    temaClaro ? "text-slate-700" : "text-slate-300"
                  }`}
                >
                  {temaClaro ? "Modo claro" : "Modo oscuro"}
                </span>
              </div>

              <div
                className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
                  temaClaro ? "bg-green-500" : "bg-slate-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${
                    temaClaro ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          localStorage.removeItem("usuario");
          window.location.href = "/login";
        }}
        className="px-4 pb-4 text-left text-slate-400 hover:text-red-400 text-sm"
      >
        {"\u21A9 Cerrar sesi\u00f3n"}
      </button>
    </aside>
  );
}