"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Cliente = {
  id: number;
  nombre: string;
  telefono: string;
  ciudad: string | null;
  asesor: string | null;
  observacion: string | null;
  etapa: string;
  created_at: string;
};

export default function VentasEntregadasPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [activo, setActivo] = useState<Cliente | null>(null);

  async function cargarClientes() {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

    const res = await fetch(`/api/clientes?empresa_id=${usuario.empresa_id}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      const pagos = data.clientes.filter(
        (c: Cliente) => c.etapa === "Entregado"
      );

      setClientes(pagos);

      if (!activo && pagos.length > 0) {
        setActivo(pagos[0]);
      }
    }
  }

  async function moverEnviado(id: number) {
    await fetch(`/api/clientes/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        etapa: "Enviado",
      }),
    });

    cargarClientes();
  }

  useEffect(() => {
    cargarClientes();
  }, []);

  return (
    <div className="min-h-screen bg-[#08111f] text-white flex">
      <aside className="hidden lg:flex w-[220px] bg-[#101820] text-white flex-col h-screen sticky top-0 border-r border-[#1f2a33]">
        <Link href="/dashboard" className="flex items-center gap-3 px-4 py-4 border-b border-[#1f2a33]">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-black">
            K
          </div>
          <h1 className="text-xl font-black">
            Kafes <span className="text-green-400">CRM</span>
          </h1>
        </Link>

        <div className="px-4 pt-5 pb-2">
          <p className="text-[11px] text-slate-400 uppercase font-bold">Principal</p>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">📊 Dashboard</Link>
          <Link href="/chat" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">💬 Conversaciones</Link>
          <Link href="/contactos" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">👤 Contactos</Link>
          <Link href="/kanban" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">🧩 Kanban</Link>
          <Link href="/mensajes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">✉️ Mensajes</Link>
          <Link href="/plantillas" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">📄 Plantillas</Link>
          <Link href="/automatizaciones" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">⚙️ Automatizaciones</Link>
          <Link href="/reportes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">📊 Reportes</Link>
          <Link href="/ajustes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">⚙️ Ajustes</Link>
        </nav>

        <div className="p-3">
          <div className="border border-[#26323d] rounded-xl p-4 bg-[#111c24]">
            <p className="text-sm font-bold text-slate-300 mb-3">
              Conexión WhatsApp
            </p>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                🟢
              </div>
              <div>
                <p className="text-green-400 font-bold text-sm">Conectado</p>
                <p className="text-xs text-slate-400">QR activo</p>
              </div>
            </div>

            <Link
              href="/dashboard/canales"
              className="block w-full text-center border border-slate-700 rounded-lg py-2 text-xs font-bold hover:bg-slate-800"
            >
              VER QR
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 h-screen overflow-hidden">
        <div className="h-12 bg-[#0b1218] border-b border-[#1f2a33] flex items-center justify-between px-5 shrink-0">
          <h1 className="text-sm font-bold text-white">Ventas Entregadas</h1>

          <div className="flex items-center gap-4 text-slate-300">
            <button className="hover:text-white">🔍</button>
            <button className="hover:text-white">🔔</button>

            <Link
              href="/administracion"
              className="flex items-center gap-2 hover:bg-slate-800 px-2 py-1 rounded-lg"
            >
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-black">
                C
              </div>
              <div>
                <p className="text-xs font-bold text-white">Administrador</p>
                <p className="text-[10px] text-green-400">● En línea</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="h-[calc(100vh-48px)] overflow-y-auto p-6">
          <div className="flex justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black">Ventas Entregadas</h1>
              <p className="text-slate-400 mt-1">
                Clientes listos para enviar.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="bg-green-600 px-4 py-3 rounded-xl font-bold"
            >
              Volver Dashboard
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#0f172a] rounded-2xl p-5 border border-slate-800">
              <p className="text-slate-400 text-sm">Total Adelantos</p>
              <h2 className="text-3xl font-black mt-2">{clientes.length}</h2>
            </div>

            <div className="bg-[#0f172a] rounded-2xl p-5 border border-slate-800">
              <p className="text-slate-400 text-sm">Pendientes Envío</p>
              <h2 className="text-3xl font-black mt-2 text-yellow-400">
                {clientes.length}
              </h2>
            </div>

            <div className="bg-[#0f172a] rounded-2xl p-5 border border-slate-800">
              <p className="text-slate-400 text-sm">Monto Adelantos</p>
              <h2 className="text-3xl font-black mt-2 text-green-400">
                S/ {(clientes.length * 30).toFixed(0)}
              </h2>
            </div>

            <div className="bg-[#0f172a] rounded-2xl p-5 border border-slate-800">
              <p className="text-slate-400 text-sm">Hoy</p>
              <h2 className="text-3xl font-black mt-2">{clientes.length}</h2>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_320px] gap-5">
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#111827]">
                  <tr>
                    <th className="text-left p-4">Cliente</th>
                    <th className="text-left p-4">Ciudad</th>
                    <th className="text-left p-4">Teléfono</th>
                    <th className="text-left p-4">Fecha</th>
                    <th className="text-left p-4">Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {clientes.map((cliente) => (
                    <tr
                      key={cliente.id}
                      onClick={() => setActivo(cliente)}
                      className="border-t border-slate-800 cursor-pointer hover:bg-slate-800"
                    >
                      <td className="p-4">{cliente.nombre}</td>
                      <td className="p-4">{cliente.ciudad || "Sin ciudad"}</td>
                      <td className="p-4">{cliente.telefono}</td>
                      <td className="p-4">
                        {new Date(cliente.created_at).toLocaleDateString("es-PE")}
                      </td>
                      <td className="p-4">
                        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs">
                          Pagó
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <aside className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
              {!activo ? (
                <p className="text-slate-400">Selecciona un cliente</p>
              ) : (
                <>
                  <h2 className="text-xl font-black">{activo.nombre}</h2>

                  <div className="space-y-4 mt-5 text-sm">
                    <div>
                      <p className="text-slate-400">Teléfono</p>
                      <p>{activo.telefono}</p>
                    </div>

                    <div>
                      <p className="text-slate-400">Ciudad</p>
                      <p>{activo.ciudad || "Sin ciudad"}</p>
                    </div>

                    <div>
                      <p className="text-slate-400">Observación</p>
                      <p>{activo.observacion || "Sin observaciones"}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => moverEnviado(activo.id)}
                    className="w-full mt-6 bg-green-600 py-3 rounded-xl font-bold"
                  >
                    Venta completada
                  </button>
                </>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}