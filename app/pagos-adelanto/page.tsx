"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Cliente = {
  id: number;
  nombre: string;
  telefono: string;
  ciudad: string;
  asesor: string;
  observacion: string;
  etapa: string;
  created_at: string;
};

export default function PagosAdelantoPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [activo, setActivo] = useState<Cliente | null>(null);

  async function cargarClientes() {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

    const res = await fetch(
      `/api/clientes?empresa_id=${usuario.empresa_id}`
    );

    const data = await res.json();

    if (data.success) {
      const pagos = data.clientes.filter(
        (c: Cliente) => c.etapa === "Pagó Adelanto"
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
      <main className="flex-1 p-6">
        <div className="flex justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black">
              Pagó Adelanto
            </h1>

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
            <p className="text-slate-400 text-sm">
              Total Adelantos
            </p>

            <h2 className="text-3xl font-black mt-2">
              {clientes.length}
            </h2>
          </div>

          <div className="bg-[#0f172a] rounded-2xl p-5 border border-slate-800">
            <p className="text-slate-400 text-sm">
              Pendientes Envío
            </p>

            <h2 className="text-3xl font-black mt-2 text-yellow-400">
              {clientes.length}
            </h2>
          </div>

          <div className="bg-[#0f172a] rounded-2xl p-5 border border-slate-800">
            <p className="text-slate-400 text-sm">
              Monto Adelantos
            </p>

            <h2 className="text-3xl font-black mt-2 text-green-400">
              S/ {(clientes.length * 30).toFixed(0)}
            </h2>
          </div>

          <div className="bg-[#0f172a] rounded-2xl p-5 border border-slate-800">
            <p className="text-slate-400 text-sm">
              Hoy
            </p>

            <h2 className="text-3xl font-black mt-2">
              {clientes.length}
            </h2>
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
                    <td className="p-4">
                      {cliente.nombre}
                    </td>

                    <td className="p-4">
                      {cliente.ciudad}
                    </td>

                    <td className="p-4">
                      {cliente.telefono}
                    </td>

                    <td className="p-4">
                      {new Date(
                        cliente.created_at
                      ).toLocaleDateString()}
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
              <p className="text-slate-400">
                Selecciona un cliente
              </p>
            ) : (
              <>
                <h2 className="text-xl font-black">
                  {activo.nombre}
                </h2>

                <div className="space-y-4 mt-5 text-sm">
                  <div>
                    <p className="text-slate-400">
                      Teléfono
                    </p>

                    <p>{activo.telefono}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">
                      Ciudad
                    </p>

                    <p>{activo.ciudad}</p>
                  </div>

                  <div>
                    <p className="text-slate-400">
                      Observación
                    </p>

                    <p>
                      {activo.observacion ||
                        "Sin observaciones"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    moverEnviado(activo.id)
                  }
                  className="w-full mt-6 bg-green-600 py-3 rounded-xl font-bold"
                >
                  Marcar enviado
                </button>
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}