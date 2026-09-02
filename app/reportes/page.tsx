"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FilaReporte = {
  fecha: string;
  conversaciones: number;
  pendientes: number | null;
  cierres: number;
  enviados: number;
  entregados: number;
};

export default function ReportesPage() {
  const [temaClaro, setTemaClaro] = useState(false);
  const [dias, setDias] = useState(30);
  const [historial, setHistorial] = useState<FilaReporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cambiarTema = () => {
    setTemaClaro((actual) => {
      const nuevoTema = !actual;
      localStorage.setItem("tema-crm", nuevoTema ? "claro" : "oscuro");
      return nuevoTema;
    });
  };

  useEffect(() => {
    setTemaClaro(localStorage.getItem("tema-crm") === "claro");
  }, []);

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        setError("");

        const usuarioGuardado = localStorage.getItem("usuario");
        if (!usuarioGuardado) {
          window.location.href = "/login";
          return;
        }

        const usuario = JSON.parse(usuarioGuardado);

        const qrRes = await fetch("/api/whatsapp-qr", { cache: "no-store" });
        const qrData = await qrRes.json();
        const whatsappQrId = qrData.whatsapp_qr_id;

        if (!whatsappQrId) {
          setHistorial([]);
          setError("No hay un canal de WhatsApp seleccionado.");
          return;
        }

        const res = await fetch(
          `/api/reportes?empresa_id=${usuario.empresa_id}&whatsapp_qr_id=${whatsappQrId}&dias=${dias}`,
          { cache: "no-store" }
        );
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "No se pudo cargar el reporte");
        }

        setHistorial(data.historial || []);
      } catch (e) {
        console.error("Error cargando reporte:", e);
        setError("No se pudo cargar el reporte.");
        setHistorial([]);
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [dias]);

  const resumen = useMemo(
    () =>
      historial.reduce(
        (acc, fila) => {
          acc.conversaciones += Number(fila.conversaciones || 0);
          acc.cierres += Number(fila.cierres || 0);
          acc.enviados += Number(fila.enviados || 0);
          acc.entregados += Number(fila.entregados || 0);
          return acc;
        },
        { conversaciones: 0, cierres: 0, enviados: 0, entregados: 0 }
      ),
    [historial]
  );

  const tasaCierre = resumen.conversaciones === 0 ? 0 : (resumen.cierres / resumen.conversaciones) * 100;

  const pendientesActuales =
    historial.length > 0 ? historial[0].pendientes : null;

  const panel = temaClaro
    ? "bg-white border-slate-200 shadow-sm"
    : "bg-[#0f172a] border-slate-800";

  const fondo = temaClaro
    ? "bg-slate-100 text-slate-900"
    : "bg-[#08111f] text-white";

  const secundario = temaClaro ? "text-slate-500" : "text-slate-400";

  const formatearFecha = (fecha: string) =>
    new Date(`${fecha}T12:00:00`).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <div className={`min-h-screen flex ${fondo}`}>
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
    <Link href="/dashboard" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
      ðŸ“Š Dashboard
    </Link>

    <Link
  href="/chat"
  className={`flex items-center justify-between px-3 py-3 rounded-lg text-sm ${
    temaClaro
      ? "hover:bg-slate-100 text-slate-700"
      : "hover:bg-slate-800 text-white"
  }`}
>
      <span className="flex items-center gap-3">ðŸ’¬ Conversaciones</span>
    </Link>

    <Link href="/contactos" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
      ðŸ‘¤ Contactos
    </Link>

    <Link href="/kanban" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
      ðŸ§© Kanban
    </Link>

    <Link href="/catalogo" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
      {"\uD83D\uDCE6 Cat\u00e1logo IA"}
    </Link>

    <Link href="/plantillas" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
      ðŸ“„ Plantillas
    </Link>

    <Link href="/automatizaciones" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
      âš™ï¸ Automatizaciones
    </Link>

    <Link href="/reportes" className="flex items-center gap-3 bg-green-700/70 text-white px-3 py-3 rounded-lg font-bold text-sm">
      ðŸ“Š Reportes
    </Link>

    <Link href="/ajustes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
      âš™ï¸ Ajustes
    </Link>
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
        ConexiÃ³n WhatsApp
      </p>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-xl">
          ðŸŸ¢
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
<div
  className={`mt-3 pt-3 border-t ${
    temaClaro ? "border-slate-200" : "border-[#26323d]"
  }`}
>
  <button
    type="button"
    onClick={cambiarTema}
    className="w-full flex items-center justify-between gap-3"
  >
    <div className="flex items-center gap-2">
      <span className="text-base">
        {temaClaro ? "â˜€ï¸" : "ðŸŒ™"}
      </span>

      <span className="text-xs font-semibold text-slate-300">
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
    onClick={() => {
      localStorage.removeItem("usuario");
      window.location.href = "/login";
    }}
    className="px-4 pb-4 text-left text-slate-400 hover:text-red-400 text-sm"
  >
    â†© Cerrar sesiÃ³n
  </button>
</aside>
      <div className="flex-1 min-w-0">
      <header
        className={`border-b ${
          temaClaro
            ? "bg-white border-slate-200"
            : "bg-[#0b1218] border-[#1f2a33]"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black">
              Kafes <span className="text-green-400">CRM</span>
            </h1>
            <p className={`text-xs ${secundario}`}>Reportes ecommerce</p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="px-3 py-2 rounded-lg text-sm font-bold border border-slate-700"
            >
              Dashboard
            </Link>
            <Link
              href="/kanban"
              className="px-3 py-2 rounded-lg text-sm font-bold border border-slate-700"
            >
              Kanban
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-black">Rendimiento diario</h2>
            <p className={`${secundario} mt-1`}>
              Conversaciones, pendientes, cierres, envÃ­os y entregas por dÃ­a.
            </p>
          </div>

          <div className="flex gap-2">
            {[7, 30, 90].map((valor) => (
              <button
                key={valor}
                onClick={() => setDias(valor)}
                className={`px-4 py-2 rounded-xl border text-sm font-bold ${
                  dias === valor
                    ? "bg-green-600 border-green-600 text-white"
                    : temaClaro
                    ? "bg-white border-slate-300 text-slate-700"
                    : "bg-[#0f172a] border-slate-700 text-slate-300"
                }`}
              >
                {valor} dÃ­as
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          <Tarjeta
            titulo="Conversaciones del perÃ­odo"
            valor={resumen.conversaciones}
            detalle={`Ãšltimos ${dias} dÃ­as`}
            panel={panel}
            secundario={secundario}
          />
          <Tarjeta
            titulo="Pendientes hoy"
            valor={pendientesActuales === null ? "â€”" : pendientesActuales}
            detalle="Conversaciones del dÃ­a sin cierre"
            panel={panel}
            secundario={secundario}
          />
          <Tarjeta
            titulo="Cierres del perÃ­odo"
            valor={resumen.cierres}
            detalle="PagÃ³ adelanto"
            panel={panel}
            secundario={secundario}
          />
          <Tarjeta
            titulo="Tasa de cierre"
            valor={tasaCierre.toFixed(1) + "%"}
            detalle="Cierres / conversaciones"
            panel={panel}
            secundario={secundario}
          />
          <Tarjeta
            titulo="Enviados del perÃ­odo"
            valor={resumen.enviados}
            detalle={`Ãšltimos ${dias} dÃ­as`}
            panel={panel}
            secundario={secundario}
          />
          <Tarjeta
            titulo="Entregados del perÃ­odo"
            valor={resumen.entregados}
            detalle={`Ãšltimos ${dias} dÃ­as`}
            panel={panel}
            secundario={secundario}
          />
        </div>

        <section className={`${panel} border rounded-2xl overflow-hidden`}>
          <div
            className={`p-5 border-b ${
              temaClaro ? "border-slate-200" : "border-slate-800"
            }`}
          >
            <h3 className="font-black">Historial por dÃ­a</h3>
            <p className={`text-xs mt-1 ${secundario}`}>
              El cierre cuenta el dÃ­a en que el cliente pasÃ³ a â€œPagÃ³ Adelantoâ€.
            </p>
          </div>

          {error ? (
            <div className="p-8 text-center text-red-400">{error}</div>
          ) : cargando ? (
            <div className={`p-8 text-center ${secundario}`}>
              Cargando reporte...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead
                  className={
                    temaClaro
                      ? "bg-slate-50 text-slate-600"
                      : "bg-[#111827] text-slate-400"
                  }
                >
                  <tr>
                    <th className="text-left p-4">Fecha</th>
                    <th className="text-right p-4">Conversaciones</th>
                    <th className="text-right p-4">Pendientes</th>
                    <th className="text-right p-4">Cierres</th>
                    <th className="text-right p-4">Enviados</th>
                    <th className="text-right p-4">Entregados</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((fila) => (
                    <tr
                      key={fila.fecha}
                      className={`border-t ${
                        temaClaro ? "border-slate-200" : "border-slate-800"
                      }`}
                    >
                      <td className="p-4 font-bold">
                        {formatearFecha(fila.fecha)}
                      </td>
                      <td className="p-4 text-right">{fila.conversaciones}</td>
                      <td className="p-4 text-right">
                        {fila.pendientes === null ? "â€”" : fila.pendientes}
                      </td>
                      <td className="p-4 text-right font-black text-green-400">
                        {fila.cierres}
                      </td>
                      <td className="p-4 text-right">{fila.enviados}</td>
                      <td className="p-4 text-right">{fila.entregados}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className={`text-xs mt-4 ${secundario}`}>
          Nota: el historial de etapas es confiable desde que activamos el
          seguimiento histÃ³rico. En dÃ­as anteriores, â€œPendientesâ€ puede
          mostrarse como â€”.
        </p>
      </main>
    </div>
    </div>
  );
}

function Tarjeta({
  titulo,
  valor,
  detalle,
  panel,
  secundario,
}: {
  titulo: string;
  valor: number | string;
  detalle: string;
  panel: string;
  secundario: string;
}) {
  return (
    <div className={`${panel} border rounded-2xl p-5`}>
      <p className={`text-sm font-bold ${secundario}`}>{titulo}</p>
      <p className="text-3xl font-black mt-2">{valor}</p>
      <p className={`text-xs mt-2 ${secundario}`}>{detalle}</p>
 </div>
  );
}
