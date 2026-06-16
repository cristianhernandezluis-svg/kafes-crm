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
  created_at: string;
};

export default function LeadsNuevosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [leadActivo, setLeadActivo] = useState<Cliente | null>(null);
  const [busqueda, setBusqueda] = useState("");

  async function cargarClientes() {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

    const res = await fetch(`/api/clientes?empresa_id=${usuario.empresa_id}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      const nuevos = data.clientes.filter(
        (c: Cliente) => c.etapa === "Nuevo"
      );

      setClientes(nuevos);

      if (!leadActivo && nuevos.length > 0) {
        setLeadActivo(nuevos[0]);
      }
    }
  }

  async function cambiarEtapa(id: number, etapa: string) {
    await fetch(`/api/clientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa }),
    });

    await cargarClientes();
  }

  useEffect(() => {
    cargarClientes();
  }, []);

  const filtrados = clientes.filter((c) =>
    `${c.nombre} ${c.telefono} ${c.ciudad || ""} ${c.asesor || ""}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#08111f] text-white flex">
      <aside className="hidden lg:flex w-[220px] bg-[#101820] text-white flex-col h-screen sticky top-0 border-r border-[#1f2a33]">
        <Link href="/dashboard" className="flex items-center gap-3 px-4 py-4 border-b border-[#1f2a33]">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-black">K</div>
          <h1 className="text-xl font-black">Kafes <span className="text-green-400">CRM</span></h1>
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
            <p className="text-sm font-bold text-slate-300 mb-3">Conexión WhatsApp</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">🟢</div>
              <div>
                <p className="text-green-400 font-bold text-sm">Conectado</p>
                <p className="text-xs text-slate-400">QR activo</p>
              </div>
            </div>
            <Link href="/dashboard/canales" className="block w-full text-center border border-slate-700 rounded-lg py-2 text-xs font-bold hover:bg-slate-800">
              VER QR
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 h-screen overflow-hidden">
        <div className="h-12 bg-[#0b1218] border-b border-[#1f2a33] flex items-center justify-between px-5 shrink-0">
          <h1 className="text-sm font-bold text-white">Leads nuevos</h1>

          <Link href="/administracion" className="flex items-center gap-2 hover:bg-slate-800 px-2 py-1 rounded-lg">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-black">C</div>
            <div>
              <p className="text-xs font-bold text-white">Administrador</p>
              <p className="text-[10px] text-green-400">● En línea</p>
            </div>
          </Link>
        </div>

        <div className="h-[calc(100vh-48px)] overflow-y-auto p-6">
          <div className="grid grid-cols-[1fr_320px] gap-5">
            <div>
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h1 className="text-3xl font-black">Leads nuevos</h1>
                  <p className="text-slate-400 mt-1">
                    Administra y responde tus nuevos leads.
                  </p>
                </div>

                <div className="flex gap-3">
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar leads..."
                    className="bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 outline-none w-[260px] text-sm"
                  />
                  <button className="bg-[#0f172a] border border-slate-800 px-4 py-3 rounded-xl text-sm">Filtros</button>
                  <button className="bg-green-600 px-5 py-3 rounded-xl font-bold text-sm">Exportar</button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-5">
                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                  <p className="text-slate-400 text-sm">Total leads</p>
                  <h2 className="text-3xl font-black mt-2">{clientes.length}</h2>
                  <p className="text-xs text-slate-400 mt-1">100% del total</p>
                </div>

                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                  <p className="text-slate-400 text-sm">Sin responder</p>
                  <h2 className="text-3xl font-black mt-2">
                    {clientes.filter((c) => !c.observacion).length}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Pendientes</p>
                </div>

                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                  <p className="text-slate-400 text-sm">Respondidos</p>
                  <h2 className="text-3xl font-black mt-2">
                    {clientes.filter((c) => c.observacion).length}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Con gestión</p>
                </div>

                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                  <p className="text-slate-400 text-sm">Contactados</p>
                  <h2 className="text-3xl font-black mt-2">
                    {clientes.filter((c) => c.asesor).length}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Asignados</p>
                </div>
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
                <div className="flex gap-8 px-5 py-4 border-b border-slate-800 text-sm">
                  <button className="text-green-400 border-b-2 border-green-500 pb-2">Todos</button>
                  <button className="text-slate-400 pb-2">Hoy</button>
                  <button className="text-slate-400 pb-2">Ayer</button>
                  <button className="text-slate-400 pb-2">Facebook</button>
                  <button className="text-slate-400 pb-2">WhatsApp</button>
                  <button className="text-slate-400 pb-2">Sin asignar</button>
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-[#111827] text-slate-400">
                    <tr>
                      <th className="text-left p-4">Cliente</th>
                      <th className="text-left p-4">Teléfono</th>
                      <th className="text-left p-4">Hora</th>
                      <th className="text-left p-4">Ciudad</th>
                      <th className="text-left p-4">Asesor</th>
                      <th className="text-left p-4">Último mensaje</th>
                      <th className="text-left p-4">Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtrados.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => setLeadActivo(lead)}
                        className={`border-t border-slate-800 cursor-pointer hover:bg-slate-800 ${
                          leadActivo?.id === lead.id ? "bg-green-900/20" : ""
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-yellow-500 text-black flex items-center justify-center font-black">
                              {(lead.nombre || "S").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold">{lead.nombre || "Sin nombre"}</p>
                              <p className="text-xs text-slate-400">Nuevo lead</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">{lead.telefono}</td>
                        <td className="p-4">
                          {new Date(lead.created_at).toLocaleTimeString("es-PE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-4">{lead.ciudad || "Sin ciudad"}</td>
                        <td className="p-4">{lead.asesor || "Sin asesor"}</td>
                        <td className="p-4 text-slate-300 max-w-[220px] truncate">
                          {lead.observacion || "Sin último mensaje"}
                        </td>
                        <td className="p-4">
                          <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs">
                            Nuevo
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="p-4 text-sm text-slate-400 border-t border-slate-800">
                  Mostrando {filtrados.length} de {clientes.length} leads
                </div>
              </div>
            </div>

            <aside className="bg-[#0f172a] border border-slate-800 rounded-2xl h-fit overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex justify-between">
                <h3 className="font-black">Detalle del lead</h3>
                <button className="text-slate-400">×</button>
              </div>

              {!leadActivo ? (
                <div className="p-5 text-slate-400 text-sm">
                  Selecciona un lead.
                </div>
              ) : (
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-16 h-16 rounded-full bg-yellow-500 text-black flex items-center justify-center text-2xl font-black">
                      {(leadActivo.nombre || "S").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-black">{leadActivo.nombre}</h2>
                      <p className="text-blue-400 text-sm">Nuevo lead</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-sm mb-5">
                    <div>
                      <p className="text-slate-500">Teléfono</p>
                      <p>{leadActivo.telefono}</p>
                    </div>

                    <div>
                      <p className="text-slate-500">Ciudad</p>
                      <p>{leadActivo.ciudad || "Sin ciudad"}</p>
                    </div>

                    <div>
                      <p className="text-slate-500">Asesor</p>
                      <p>{leadActivo.asesor || "Sin asesor"}</p>
                    </div>

                    <div>
                      <p className="text-slate-500">Fecha</p>
                      <p>{new Date(leadActivo.created_at).toLocaleString("es-PE")}</p>
                    </div>

                    <div>
                      <p className="text-slate-500">Último mensaje</p>
                      <div className="bg-[#08111f] border border-slate-800 rounded-xl p-3 mt-1">
                        {leadActivo.observacion || "Sin mensaje"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Link
                      href={`/chat?cliente_id=${leadActivo.id}`}
                      className="block w-full bg-green-600 hover:bg-green-700 text-center py-3 rounded-xl font-bold"
                    >
                      Abrir chat
                    </Link>

                    <a
                      href={`tel:${leadActivo.telefono}`}
                      className="block w-full border border-slate-700 text-center py-3 rounded-xl font-bold hover:bg-slate-800"
                    >
                      Llamar
                    </a>

                    <button
                      onClick={() => cambiarEtapa(leadActivo.id, "Interesado")}
                      className="w-full border border-slate-700 py-3 rounded-xl font-bold hover:bg-slate-800"
                    >
                      Mover a interesado
                    </button>

                    <button
                      onClick={() => cambiarEtapa(leadActivo.id, "No Responde")}
                      className="w-full bg-red-600/30 text-red-300 border border-red-500 py-3 rounded-xl font-bold"
                    >
                      No responde
                    </button>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}