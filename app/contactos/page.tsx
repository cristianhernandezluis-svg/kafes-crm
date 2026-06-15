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
  canal?: string | null;
  created_at: string;
};

export default function ContactosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargarClientes = async () => {
    try {
      const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

      const res = await fetch(`/api/clientes?empresa_id=${usuario.empresa_id}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (data.success) {
        setClientes(data.clientes);
      }
    } catch (error) {
      console.error("Error cargando contactos:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const contactosFiltrados = clientes.filter((cliente) =>
    `${cliente.nombre} ${cliente.telefono} ${cliente.ciudad || ""} ${
      cliente.asesor || ""
    } ${cliente.etapa || ""}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#08111f] text-white">
      <div className="border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black">
            Contactos{" "}
            <span className="bg-green-600 text-white text-sm px-3 py-1 rounded-full">
              {clientes.length}
            </span>
          </h1>

          <p className="text-slate-400">Gestiona todos tus clientes</p>
        </div>

        <div className="flex gap-3">
          <button className="bg-slate-800 px-4 py-2 rounded-xl">
            Importar
          </button>

          <button
            onClick={async () => {
              const res = await fetch("/api/whatsapp-qr", {
                method: "POST",
              });

              const data = await res.json();

              alert(
                data.success
                  ? `✅ ${
                      data.contactos_sincronizados || 0
                    } contactos sincronizados`
                  : `❌ ${data.error}`
              );

              cargarClientes();
            }}
            className="bg-green-700 px-4 py-2 rounded-xl font-bold"
          >
            🔄 Sincronizar WhatsApp
          </button>

          <button className="bg-green-600 px-4 py-2 rounded-xl font-bold">
            + Agregar contacto
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="flex gap-3 mb-5">
          <input
            placeholder="🔍 Buscar contactos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-[#111827] border border-slate-700 rounded-xl px-4 py-3 w-[350px] outline-none"
          />

          <button className="bg-[#111827] border border-slate-700 px-4 rounded-xl">
            Filtros
          </button>
        </div>

        <div className="flex gap-2 mb-5">
          <button className="bg-green-600 px-4 py-2 rounded-xl text-sm">
            Todos
          </button>

          <button className="bg-[#111827] px-4 py-2 rounded-xl text-sm">
            Clientes
          </button>

          <button className="bg-[#111827] px-4 py-2 rounded-xl text-sm">
            Prospectos
          </button>

          <button className="bg-[#111827] px-4 py-2 rounded-xl text-sm">
            No contactados
          </button>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#111827]">
              <tr>
                <th className="text-left p-4">Nombre</th>
                <th className="text-left p-4">Teléfono</th>
                <th className="text-left p-4">Ciudad</th>
                <th className="text-left p-4">Asesor</th>
                <th className="text-left p-4">Etapa</th>
                <th className="text-left p-4">Canal</th>
                <th className="text-left p-4">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {cargando ? (
                <tr>
                  <td className="p-6 text-slate-400" colSpan={7}>
                    Cargando contactos...
                  </td>
                </tr>
              ) : contactosFiltrados.length === 0 ? (
                <tr>
                  <td className="p-6 text-slate-400" colSpan={7}>
                    No hay contactos encontrados.
                  </td>
                </tr>
              ) : (
                contactosFiltrados.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="border-t border-slate-800 hover:bg-slate-900"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black">
                          {(cliente.nombre || "S").charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <p className="font-bold text-white">
                            {cliente.nombre || "Sin nombre"}
                          </p>
                          <p className="text-xs text-slate-400">
                            Cliente #{cliente.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">+51 {cliente.telefono}</td>

                    <td className="p-4">
                      {cliente.ciudad || "Sin ciudad"}
                    </td>

                    <td className="p-4">
                      {cliente.asesor || "Sin asesor"}
                    </td>

                    <td className="p-4">
                      <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs">
                        {cliente.etapa || "Nuevo"}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs">
                        {cliente.canal || "crm"}
                      </span>
                    </td>

                    <td className="p-4 flex gap-2">
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="bg-slate-800 px-3 py-1 rounded-lg text-sm"
                      >
                        Ver
                      </Link>

                      <a
                        href={`https://wa.me/51${cliente.telefono}`}
                        target="_blank"
                        className="bg-green-600 px-3 py-1 rounded-lg text-sm"
                      >
                        WhatsApp
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-slate-400 text-sm mt-4">
          Mostrando {contactosFiltrados.length} de {clientes.length} contactos
        </p>
      </div>
    </div>
  );
}