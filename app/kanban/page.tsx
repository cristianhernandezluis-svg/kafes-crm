"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Cliente = {
  id: number;
  nombre: string;
  telefono: string;
  ciudad: string | null;
  etapa: string;
  asesor: string | null;
  observacion?: string | null;
  canal?: string | null;
};

const etapas = [
  "Nuevo",
  "Interesado",
  "Calificado",
  "Seguimiento",
  "Pagó Adelanto",
  "Enviado",
  "Entregado",
  "No Responde",
];

export default function KanbanPage() {
const [temaClaro, setTemaClaro] = useState(false);

useEffect(() => {
  const temaGuardado = localStorage.getItem("tema-crm");
  setTemaClaro(temaGuardado === "claro");
}, []);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarClientes = async () => {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

    const qrRes = await fetch("/api/whatsapp-qr", { cache: "no-store" });
    const qrData = await qrRes.json();
    const whatsappQrId = qrData.whatsapp_qr_id;

    if (!whatsappQrId) {
      setClientes([]);
      setCargando(false);
      return;
    }

    const res = await fetch(`/api/clientes?empresa_id=${usuario.empresa_id}&whatsapp_qr_id=${whatsappQrId}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      setClientes(data.clientes);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const moverEtapa = async (cliente: Cliente, nuevaEtapa: string) => {
    await fetch(`/api/clientes/${cliente.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: nuevaEtapa }),
    });

    cargarClientes();
  };

  return (
    <div
  className={`min-h-screen flex ${
    temaClaro
      ? "bg-slate-100 text-slate-900"
      : "bg-[#08111f] text-white"
  }`}
>
      <aside
  className={`hidden lg:flex w-[220px] flex-col min-h-screen border-r ${
    temaClaro
      ? "bg-white text-slate-800 border-slate-200"
      : "bg-[#101820] text-white border-[#1f2a33]"
  }`}
>
        <Link
          href="/dashboard"
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
        </Link>

        <div className="px-4 pt-5 pb-2">
          <p className="text-[11px] text-slate-400 uppercase font-bold">
            Principal
          </p>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          <Link href="/dashboard" className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm ${
  temaClaro
    ? "hover:bg-slate-100 text-slate-700"
    : "hover:bg-slate-800 text-white"
}`}>
            📊 Dashboard
          </Link>

          <Link href="/chat" className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
            <span>💬 Conversaciones</span>
            <span className="bg-green-500 text-white text-[11px] px-2 py-0.5 rounded-full">
              {clientes.length}
            </span>
          </Link>

          <Link href="/contactos" className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm ${
  temaClaro
    ? "hover:bg-slate-100 text-slate-700"
    : "hover:bg-slate-800 text-white"
}`}>
            👤 Contactos
          </Link>

          <Link href="/kanban" className="flex items-center gap-3 bg-green-700/70 text-white px-3 py-3 rounded-lg font-bold text-sm">
            🧩 Kanban
          </Link>

          <Link href="/mensajes" className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm ${
  temaClaro
    ? "hover:bg-slate-100 text-slate-700"
    : "hover:bg-slate-800 text-white"
}`}>
            ✉️ Mensajes
          </Link>

          <Link href="/plantillas" className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm ${
  temaClaro
    ? "hover:bg-slate-100 text-slate-700"
    : "hover:bg-slate-800 text-white"
}`}>
            📄 Plantillas
          </Link>

          <Link href="/automatizaciones" className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm ${
  temaClaro
    ? "hover:bg-slate-100 text-slate-700"
    : "hover:bg-slate-800 text-white"
}`}>
            ⚙️ Automatizaciones
          </Link>

          <Link href="/reportes" className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm ${
  temaClaro
    ? "hover:bg-slate-100 text-slate-700"
    : "hover:bg-slate-800 text-white"
}`}>
            📊 Reportes
          </Link>

          <Link href="/ajustes" className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm ${
  temaClaro
    ? "hover:bg-slate-100 text-slate-700"
    : "hover:bg-slate-800 text-white"
}`}>
            ⚙️ Ajustes
          </Link>
        </nav>

        <div className="p-3">
          <div
  className={`border rounded-xl p-4 ${
    temaClaro
      ? "bg-slate-50 border-slate-200"
      : "bg-[#111c24] border-[#26323d]"
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
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-xl">
                🟢
              </div>

              <div>
                <p className="text-green-400 font-bold text-sm">Conectado</p>
                <p className="text-xs text-slate-400">Cloud API activa</p>
              </div>
            </div>

            <Link
              href="/dashboard/canales"
              className={`block w-full text-center border rounded-lg py-2 text-xs font-bold ${
  temaClaro
    ? "border-slate-300 text-slate-700 hover:bg-slate-100"
    : "border-slate-700 text-white hover:bg-slate-800"
}`}
            >
              VER QR
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div
  className={`h-12 border-b flex items-center justify-between px-5 ${
    temaClaro
      ? "bg-white border-slate-200"
      : "bg-[#0b1218] border-[#1f2a33]"
  }`}
>
          <h1
  className={`text-sm font-bold ${
    temaClaro ? "text-slate-900" : "text-white"
  }`}
>
            Kanban - Oportunidades
          </h1>

          <div className="flex items-center gap-4 text-slate-300">
            <button className="hover:text-white">🔍</button>

            <div className="relative">
              <button className="hover:text-white">🔔</button>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                2
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-black">
                C
              </div>

              <div>
                <p
  className={`text-xs font-bold ${
    temaClaro ? "text-slate-900" : "text-white"
  }`}
>
  Administrador
</p>
                <p className="text-[10px] text-green-400">● En línea</p>
              </div>
            </div>
          </div>
        </div>

        <div
  className={`border-b px-6 py-4 flex justify-between items-center ${
    temaClaro
      ? "bg-white border-slate-200"
      : "border-slate-800"
  }`}
>
          <div className="flex gap-3">
            <button >
              OportunidadesclassName={`border px-4 py-2 rounded-xl ${
  temaClaro
    ? "bg-white border-slate-300 text-slate-700"
    : "bg-[#111827] border-slate-700 text-white"
}`}
            </button>

            <button className="bg-green-700/50 border border-green-700 px-4 py-2 rounded-xl">
              Kanban
            </button>

            <button className={`border px-4 py-2 rounded-xl ${
  temaClaro
    ? "bg-white border-slate-300 text-slate-700"
    : "bg-[#111827] border-slate-700 text-white"
}`}>
              Lista
            </button>
          </div>

          <div className="flex gap-3">
            <button className={`border px-4 py-2 rounded-xl ${
  temaClaro
    ? "bg-white border-slate-300 text-slate-700"
    : "bg-[#111827] border-slate-700 text-white"
}`}>
              Filtro
            </button>

            <button className={`border px-4 py-2 rounded-xl ${
  temaClaro
    ? "bg-white border-slate-300 text-slate-700"
    : "bg-[#111827] border-slate-700 text-white"
}`}>
              Asignado a: Todos
            </button>

            <Link
              href="/contactos"
              className="bg-green-600 px-4 py-2 rounded-xl font-bold"
            >
              + Nueva oportunidad
            </Link>
          </div>
        </div>

        <div className="p-6 overflow-x-auto">
          {cargando ? (
            <p className="text-slate-400">Cargando Kanban...</p>
          ) : (
            <div className="flex gap-4 min-w-max">
              {etapas.map((etapa, index) => {
                const clientesEtapa = clientes.filter((c) => c.etapa === etapa);

                return (
                  <div
                    key={etapa}
                    className={`w-[280px] border rounded-2xl overflow-hidden ${
  temaClaro
    ? "bg-white border-slate-200"
    : "bg-[#0f172a] border-slate-800"
}`}
                  >
                    <div
  className={`p-4 border-b ${
    temaClaro ? "border-slate-200" : "border-slate-800"
  }`}
>
                      <div className="flex justify-between items-center">
                        <h2 className="font-bold">{etapa}</h2>

                        <span
  className={`text-xs px-2 py-1 rounded-full ${
    temaClaro
      ? "bg-slate-100 text-slate-600"
      : "bg-slate-800 text-slate-300"
  }`}
>
                          {clientesEtapa.length}
                        </span>
                      </div>

                      <div
                        className={`h-1 mt-3 rounded-full ${
                          index === 0
                            ? "bg-blue-500"
                            : index === 1
                            ? "bg-yellow-500"
                            : index === 2
                            ? "bg-purple-500"
                            : index === 3
                            ? "bg-orange-500"
                            : index === 4
                            ? "bg-green-500"
                            : index === 5
                            ? "bg-emerald-500"
                            : "bg-red-500"
                        }`}
                      />
                    </div>

                    <div className="p-3 space-y-3 min-h-[520px]">
                      {clientesEtapa.slice(0, 20).map((cliente) => (
                        <div
                          key={cliente.id}
                          className={`border rounded-xl p-4 hover:border-green-500 transition ${
  temaClaro
    ? "bg-slate-50 border-slate-200"
    : "bg-[#111827] border-slate-800"
}`}
                        >
                          <div className="flex justify-between gap-2">
                            <div>
                              <h3
  className={`font-bold text-sm ${
    temaClaro ? "text-slate-900" : "text-white"
  }`}
>
                                {cliente.observacion || "Oportunidad de venta"}
                              </h3>

                              <p
  className={`text-xs mt-1 ${
    temaClaro ? "text-slate-500" : "text-slate-400"
  }`}
>
                                {cliente.nombre || "Sin nombre"}
                              </p>
                            </div>

                            <button className="text-slate-500">⋮</button>
                          </div>

                          <div className="flex items-center gap-3 mt-3">
                            <div className="w-9 h-9 rounded-full bg-yellow-500 text-black flex items-center justify-center font-black">
                              {(cliente.nombre || "S").charAt(0).toUpperCase()}
                            </div>

                            <div>
                              <p className="text-sm font-bold">
                                {cliente.nombre || "Sin nombre"}
                              </p>
                              <p
  className={`text-xs ${
    temaClaro ? "text-slate-500" : "text-slate-400"
  }`}
>
                                {cliente.telefono}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-[11px]">
                              {cliente.etapa}
                            </span>

                            <span
  className={`px-2 py-1 rounded-full text-[11px] ${
    temaClaro
      ? "bg-slate-100 text-slate-600"
      : "bg-slate-800 text-slate-400"
  }`}
>
                              {cliente.canal || "crm"}
                            </span>
                          </div>

                          <div
  className={`mt-3 text-xs ${
    temaClaro ? "text-slate-500" : "text-slate-400"
  }`}
>
                            Asesor: {cliente.asesor || "Sin asesor"}
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <Link
  href={`/chat?cliente_id=${cliente.id}`}
  className="bg-green-600 text-center rounded-lg py-2 text-xs font-bold"
>
  WhatsApp
</Link>

                            <select
                              value={cliente.etapa}
                              onChange={(e) =>
                                moverEtapa(cliente, e.target.value)
                              }
                              className={`border rounded-lg text-xs px-2 ${
  temaClaro
    ? "bg-white border-slate-300 text-slate-700"
    : "bg-[#0f172a] border-slate-700 text-white"
}`}
                            >
                              {etapas.map((e) => (
                                <option key={e} value={e}>
                                  {e}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}

                      <button
  className={`w-full text-sm py-3 ${
    temaClaro
      ? "text-slate-500 hover:text-slate-900"
      : "text-slate-400 hover:text-white"
  }`}
>
                        + Agregar tarjeta
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}