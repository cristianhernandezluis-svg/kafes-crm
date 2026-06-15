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
  "Seguimiento",
  "Pagó Adelanto",
  "Enviado",
  "Entregado",
  "No Responde",
];

export default function KanbanPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarClientes = async () => {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

    const res = await fetch(`/api/clientes?empresa_id=${usuario.empresa_id}`, {
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
    <div className="min-h-screen bg-[#08111f] text-white">
      <div className="border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black">Kanban - Oportunidades</h1>
          <p className="text-slate-400 text-sm">Organiza tus clientes por etapa</p>
        </div>

        <div className="flex gap-3">
          <button className="bg-[#111827] border border-slate-700 px-4 py-2 rounded-xl">
            Filtro
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
                  className="w-[280px] bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-800">
                    <div className="flex justify-between items-center">
                      <h2 className="font-bold">{etapa}</h2>

                      <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-full">
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
                        className="bg-[#111827] border border-slate-800 rounded-xl p-4 hover:border-green-500 transition"
                      >
                        <div className="flex justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-white text-sm">
                              {cliente.observacion || "Oportunidad de venta"}
                            </h3>

                            <p className="text-slate-400 text-xs mt-1">
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
                            <p className="text-xs text-slate-400">
                              {cliente.telefono}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-[11px]">
                            {cliente.etapa}
                          </span>

                          <span className="bg-slate-800 text-slate-400 px-2 py-1 rounded-full text-[11px]">
                            {cliente.canal || "crm"}
                          </span>
                        </div>

                        <div className="mt-3 text-xs text-slate-400">
                          Asesor: {cliente.asesor || "Sin asesor"}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Link
                            href={`/chat?telefono=${cliente.telefono}`}
                            className="bg-green-600 text-center rounded-lg py-2 text-xs font-bold"
                          >
                            WhatsApp
                          </Link>

                          <select
                            value={cliente.etapa}
                            onChange={(e) => moverEtapa(cliente, e.target.value)}
                            className="bg-[#0f172a] border border-slate-700 rounded-lg text-xs px-2"
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

                    <button className="w-full text-slate-400 hover:text-white text-sm py-3">
                      + Agregar tarjeta
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}