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
    <div className={`min-h-screen ${fondo}`}>
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
              Conversaciones, pendientes, cierres, envíos y entregas por día.
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
                {valor} días
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <Tarjeta
            titulo="Conversaciones"
            valor={resumen.conversaciones}
            detalle={`Últimos ${dias} días`}
            panel={panel}
            secundario={secundario}
          />
          <Tarjeta
            titulo="Pendientes actuales"
            valor={pendientesActuales === null ? "—" : pendientesActuales}
            detalle="Cartera por gestionar"
            panel={panel}
            secundario={secundario}
          />
          <Tarjeta
            titulo="Cierres"
            valor={resumen.cierres}
            detalle="Pagó adelanto"
            panel={panel}
            secundario={secundario}
          />
          <Tarjeta
            titulo="Enviados"
            valor={resumen.enviados}
            detalle={`Últimos ${dias} días`}
            panel={panel}
            secundario={secundario}
          />
          <Tarjeta
            titulo="Entregados"
            valor={resumen.entregados}
            detalle={`Últimos ${dias} días`}
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
            <h3 className="font-black">Historial por día</h3>
            <p className={`text-xs mt-1 ${secundario}`}>
              El cierre cuenta el día en que el cliente pasó a “Pagó Adelanto”.
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
                        {fila.pendientes === null ? "—" : fila.pendientes}
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
          seguimiento histórico. En días anteriores, “Pendientes” puede
          mostrarse como —.
        </p>
      </main>
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
