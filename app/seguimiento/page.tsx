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
  proximo_seguimiento?: string | null;
  ultima_gestion?: string | null;
  created_at: string;
};

export default function SeguimientoPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);
  const [busqueda, setBusqueda] = useState("");

  async function cargarClientes() {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

    const res = await fetch(`/api/clientes?empresa_id=${usuario.empresa_id}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      const seguimiento = data.clientes.filter(
        (c: Cliente) => c.etapa === "Seguimiento"
      );

      setClientes(seguimiento);

      if (!clienteActivo && seguimiento.length > 0) {
        setClienteActivo(seguimiento[0]);
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

  const hoy = new Date();

  const vencidos = clientes.filter(
    (c) =>
      c.proximo_seguimiento &&
      new Date(c.proximo_seguimiento) < hoy
  );

  const paraHoy = clientes.filter((c) => {
    if (!c.proximo_seguimiento) return false;
    return new Date(c.proximo_seguimiento).toDateString() === hoy.toDateString();
  });

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
      </aside>

      <main className="flex-1 min-w-0 h-screen overflow-hidden">
        <div className="h-12 bg-[#0b1218] border-b border-[#1f2a33] flex items-center justify-between px-5 shrink-0">
          <h1 className="text-sm font-bold text-white">En seguimiento</h1>

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
                  <h1 className="text-3xl font-black">En seguimiento</h1>
                  <p className="text-slate-400 mt-1">
                    Clientes que necesitan seguimiento para cerrar la venta.
                  </p>
                </div>

                <div className="flex gap-3">
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar clientes..."
                    className="bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 outline-none w-[260px] text-sm"
                  />

                  <button className="bg-[#0f172a] border border-slate-800 px-4 py-3 rounded-xl text-sm">
                    Filtros
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-5">
                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                  <p className="text-slate-400 text-sm">Total seguimiento</p>
                  <h2 className="text-3xl font-black mt-2">{clientes.length}</h2>
                </div>

                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                  <p className="text-slate-400 text-sm">Vencidos</p>
                  <h2 className="text-3xl font-black mt-2 text-red-400">{vencidos.length}</h2>
                </div>

                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                  <p className="text-slate-400 text-sm">Para hoy</p>
                  <h2 className="text-3xl font-black mt-2 text-yellow-400">{paraHoy.length}</h2>
                </div>

                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                  <p className="text-slate-400 text-sm">Sin fecha</p>
                  <h2 className="text-3xl font-black mt-2">
                    {clientes.filter((c) => !c.proximo_seguimiento).length}
                  </h2>
                </div>
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
                <div className="flex gap-8 px-5 py-4 border-b border-slate-800 text-sm">
                  <button className="text-green-400 border-b-2 border-green-500 pb-2">Todos</button>
                  <button className="text-slate-400 pb-2">Vencidos</button>
                  <button className="text-slate-400 pb-2">Hoy</button>
                  <button className="text-slate-400 pb-2">Esta semana</button>
                  <button className="text-slate-400 pb-2">Sin asesor</button>
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-[#111827] text-slate-400">
                    <tr>
                      <th className="text-left p-4">Cliente</th>
                      <th className="text-left p-4">Teléfono</th>
                      <th className="text-left p-4">Ciudad</th>
                      <th className="text-left p-4">Asesor</th>
                      <th className="text-left p-4">Última gestión</th>
                      <th className="text-left p-4">Próximo seguimiento</th>
                      <th className="text-left p-4">Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtrados.map((cliente) => {
                      const estaVencido =
                        cliente.proximo_seguimiento &&
                        new Date(cliente.proximo_seguimiento) < hoy;

                      return (
                        <tr
                          key={cliente.id}
                          onClick={() => setClienteActivo(cliente)}
                          className={`border-t border-slate-800 cursor-pointer hover:bg-slate-800 ${
                            clienteActivo?.id === cliente.id ? "bg-green-900/20" : ""
                          }`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-yellow-500 text-black flex items-center justify-center font-black">
                                {(cliente.nombre || "S").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold">{cliente.nombre || "Sin nombre"}</p>
                                <p className="text-xs text-slate-400">Seguimiento</p>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">{cliente.telefono}</td>
                          <td className="p-4">{cliente.ciudad || "Sin ciudad"}</td>
                          <td className="p-4">{cliente.asesor || "Sin asesor"}</td>

                          <td className="p-4">
                            {cliente.ultima_gestion
                              ? new Date(cliente.ultima_gestion).toLocaleString("es-PE")
                              : "Sin gestión"}
                          </td>

                          <td className="p-4">
                            {cliente.proximo_seguimiento
                              ? new Date(cliente.proximo_seguimiento).toLocaleString("es-PE")
                              : "Sin fecha"}
                          </td>

                          <td className="p-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs ${
                                estaVencido
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                              }`}
                            >
                              {estaVencido ? "Vencido" : "Pendiente"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="p-4 text-sm text-slate-400 border-t border-slate-800">
                  Mostrando {filtrados.length} de {clientes.length} clientes
                </div>
              </div>
            </div>

            <aside className="bg-[#0f172a] border border-slate-800 rounded-2xl h-fit overflow-hidden">
              <div className="p-5 border-b border-slate-800">
                <h3 className="font-black">Detalle seguimiento</h3>
              </div>

              {!clienteActivo ? (
                <div className="p-5 text-slate-400 text-sm">
                  Selecciona un cliente.
                </div>
              ) : (
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-16 h-16 rounded-full bg-yellow-500 text-black flex items-center justify-center text-2xl font-black">
                      {(clienteActivo.nombre || "S").charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <h2 className="text-xl font-black">{clienteActivo.nombre}</h2>
                      <p className="text-yellow-400 text-sm">En seguimiento</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-sm mb-5">
                    <div>
                      <p className="text-slate-500">Teléfono</p>
                      <p>{clienteActivo.telefono}</p>
                    </div>

                    <div>
                      <p className="text-slate-500">Ciudad</p>
                      <p>{clienteActivo.ciudad || "Sin ciudad"}</p>
                    </div>

                    <div>
                      <p className="text-slate-500">Asesor</p>
                      <p>{clienteActivo.asesor || "Sin asesor"}</p>
                    </div>

                    <div>
                      <p className="text-slate-500">Próximo seguimiento</p>
                      <p>
                        {clienteActivo.proximo_seguimiento
                          ? new Date(clienteActivo.proximo_seguimiento).toLocaleString("es-PE")
                          : "Sin fecha"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Observación</p>
                      <div className="bg-[#08111f] border border-slate-800 rounded-xl p-3 mt-1">
                        {clienteActivo.observacion || "Sin observación"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Link
                      href={`/chat?cliente_id=${clienteActivo.id}`}
                      className="block w-full bg-green-600 hover:bg-green-700 text-center py-3 rounded-xl font-bold"
                    >
                      Abrir chat
                    </Link>

                    <a
                      href={`tel:${clienteActivo.telefono}`}
                      className="block w-full border border-slate-700 text-center py-3 rounded-xl font-bold hover:bg-slate-800"
                    >
                      Llamar
                    </a>

                    <button
                      onClick={() => cambiarEtapa(clienteActivo.id, "Pagó Adelanto")}
                      className="w-full border border-green-500 text-green-400 py-3 rounded-xl font-bold hover:bg-green-500/10"
                    >
                      Marcar pagó adelanto
                    </button>

                    <button
                      onClick={() => cambiarEtapa(clienteActivo.id, "No Responde")}
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