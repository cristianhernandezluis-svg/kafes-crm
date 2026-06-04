"use client";

import { useEffect, useState } from "react";

const estados = [
  "Nuevo",
  "Interesado",
  "Seguimiento",
  "Pagó Adelanto",
  "Enviado",
  "Entregado",
  "No Responde",
];

type Cliente = {
  id: number;
  nombre: string;
  telefono: string;
  ciudad: string | null;
  etapa: string;
  asesor: string | null;
  created_at: string;
};

export default function Home() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarClientes = async () => {
    try {
      const res = await fetch("/api/clientes", {
        cache: "no-store",
      });

      const data = await res.json();

      if (data.success) {
        setClientes(data.clientes);
      }
    } catch (error) {
      console.error("Error cargando clientes:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarClientes();

    const intervalo = setInterval(() => {
      cargarClientes();
    }, 5000);

    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-black text-white p-5">
        <h1 className="text-2xl font-bold text-yellow-400">Kafes CRM</h1>

        <div className="mt-10 space-y-4">
          <div className="bg-yellow-500 text-black p-3 rounded-lg font-bold">
            Dashboard
          </div>
          <div className="p-3 hover:bg-zinc-800 rounded-lg cursor-pointer">
            Clientes
          </div>
          <div className="p-3 hover:bg-zinc-800 rounded-lg cursor-pointer">
            Seguimientos
          </div>
          <div className="p-3 hover:bg-zinc-800 rounded-lg cursor-pointer">
            Ventas
          </div>
          <div className="p-3 hover:bg-zinc-800 rounded-lg cursor-pointer">
            Reportes
          </div>
        </div>

        <div className="mt-10 bg-zinc-900 p-4 rounded-xl">
          <p className="text-sm text-gray-400">Resumen hoy</p>
          <p className="mt-2">Clientes: {clientes.length}</p>
          <p>
            Adelantos:{" "}
            {clientes.filter((c) => c.etapa === "Pagó Adelanto").length}
          </p>
          <p>
            Entregados:{" "}
            {clientes.filter((c) => c.etapa === "Entregado").length}
          </p>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-x-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Embudo de Ventas</h2>

          <button
            onClick={cargarClientes}
            className="bg-yellow-500 text-black px-5 py-3 rounded-lg font-bold hover:bg-yellow-400"
          >
            Actualizar
          </button>
        </div>

        {cargando ? (
          <p className="mt-8 text-gray-500">Cargando clientes...</p>
        ) : (
          <div className="grid grid-cols-7 gap-4 mt-8 min-w-[1400px]">
            {estados.map((estado) => (
              <div
                key={estado}
                className="bg-white rounded-xl shadow p-4 min-h-[500px]"
              >
                <h3 className="font-bold mb-3">
                  {estado}{" "}
                  <span className="text-gray-400">
                    {clientes.filter((c) => c.etapa === estado).length}
                  </span>
                </h3>

                <div className="space-y-3">
                  {clientes
                    .filter((cliente) => cliente.etapa === estado)
                    .map((cliente) => (
                      <div
                        key={cliente.id}
                        className="bg-gray-100 p-3 rounded-lg"
                      >
                        <p className="font-semibold">
                          {cliente.nombre || "Sin nombre"}
                        </p>

                        <p className="text-sm">📱 {cliente.telefono}</p>

                        <p className="text-green-600 text-sm">
                          📍 {cliente.ciudad || "Sin ciudad"}
                        </p>

                        <p className="text-xs mt-2 text-gray-500">
                          Etapa: {cliente.etapa}
                        </p>

                        {cliente.asesor && (
                          <p className="text-xs text-gray-500">
                            Asesor: {cliente.asesor}
                          </p>
                        )}

                        <a
                          href={`https://wa.me/51${cliente.telefono.replace(/\s/g, "")}`}
                          target="_blank"
                          className="block bg-green-600 text-white text-center mt-3 py-2 rounded text-sm font-bold"
                        >
                          Abrir WhatsApp
                        </a>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}