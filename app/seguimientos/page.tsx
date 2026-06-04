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
  cantidad_seguimientos?: number;
  created_at: string;
};

export default function SeguimientosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarClientes = async () => {
    try {
      const res = await fetch("/api/clientes", { cache: "no-store" });
      const data = await res.json();

      if (data.success) {
        setClientes(data.clientes);
      }
    } catch (error) {
      console.error("Error cargando seguimientos:", error);
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

  const etapasFinales = ["Pagó Adelanto", "Enviado", "Entregado"];

  const clientesConSeguimiento = clientes
    .filter(
      (c) =>
        c.proximo_seguimiento &&
        !etapasFinales.includes(c.etapa)
    )
    .sort(
      (a, b) =>
        new Date(a.proximo_seguimiento || "").getTime() -
        new Date(b.proximo_seguimiento || "").getTime()
    );

  const vencidos = clientesConSeguimiento.filter(
    (c) =>
      c.proximo_seguimiento &&
      new Date(c.proximo_seguimiento) < new Date()
  );

  const paraHoy = clientesConSeguimiento.filter((c) => {
    if (!c.proximo_seguimiento) return false;

    const fecha = new Date(c.proximo_seguimiento);
    const hoy = new Date();

    return fecha.toDateString() === hoy.toDateString();
  });

  const futuros = clientesConSeguimiento.filter((c) => {
    if (!c.proximo_seguimiento) return false;

    const fecha = new Date(c.proximo_seguimiento);
    const hoy = new Date();

    return fecha > hoy && fecha.toDateString() !== hoy.toDateString();
  });

  const registrarSeguimiento = async (cliente: Cliente) => {
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ultima_gestion: new Date().toISOString(),
          cantidad_seguimientos: (cliente.cantidad_seguimientos || 0) + 1,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert("No se pudo registrar el seguimiento");
        return;
      }

      cargarClientes();
    } catch (error) {
      console.error("Error registrando seguimiento:", error);
      alert("Error registrando seguimiento");
    }
  };

  const abrirWhatsApp = (telefono: string) => {
    const numero = telefono.replace(/\s/g, "");
    window.open(`https://wa.me/51${numero}`, "_blank");
  };

  const CardCliente = ({ cliente }: { cliente: Cliente }) => (
    <div className="bg-white rounded-xl shadow p-4 border">
      <div className="flex justify-between gap-3">
        <div>
          <h3 className="font-bold text-lg">
            {cliente.nombre || "Sin nombre"}
          </h3>

          <p className="text-sm">📱 {cliente.telefono}</p>

          <p className="text-sm text-green-600">
            📍 {cliente.ciudad || "Sin ciudad"}
          </p>

          <p className="text-sm text-gray-500">
            Etapa: {cliente.etapa}
          </p>

          {cliente.asesor && (
            <p className="text-sm text-gray-500">
              Asesor: {cliente.asesor}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500">Seguimientos</p>
          <p className="text-2xl font-bold text-blue-600">
            {cliente.cantidad_seguimientos || 0}
          </p>
        </div>
      </div>

      {cliente.proximo_seguimiento && (
        <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-sm text-orange-700 font-bold">
            📅 Próximo seguimiento
          </p>
          <p className="text-sm text-orange-700">
            {new Date(cliente.proximo_seguimiento).toLocaleString("es-PE")}
          </p>
        </div>
      )}

      {cliente.observacion && (
        <div className="mt-3 bg-gray-100 rounded-lg p-3">
          <p className="text-sm text-gray-700">
            📝 {cliente.observacion}
          </p>
        </div>
      )}

      {cliente.ultima_gestion && (
        <p className="text-xs text-purple-600 mt-3">
          📞 Última gestión:{" "}
          {new Date(cliente.ultima_gestion).toLocaleString("es-PE")}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link
          href="/"
          className="bg-blue-600 text-white text-center py-2 rounded-lg font-bold text-sm"
        >
          Ver en CRM
        </Link>

        <button
          onClick={() => abrirWhatsApp(cliente.telefono)}
          className="bg-green-600 text-white py-2 rounded-lg font-bold text-sm"
        >
          Abrir WhatsApp
        </button>

        <button
          onClick={() => registrarSeguimiento(cliente)}
          className="col-span-2 bg-purple-600 text-white py-2 rounded-lg font-bold text-sm"
        >
          ✔ Seguimiento realizado
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-black text-white p-5">
        <h1 className="text-2xl font-bold text-yellow-400">Kafes CRM</h1>

        <div className="mt-10 space-y-4">
          <Link
            href="/"
            className="block p-3 hover:bg-zinc-800 rounded-lg"
          >
            Dashboard
          </Link>

          <div className="p-3 hover:bg-zinc-800 rounded-lg cursor-pointer">
            Clientes
          </div>

          <div className="bg-yellow-500 text-black p-3 rounded-lg font-bold">
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
          <p className="text-sm text-gray-400">Resumen seguimientos</p>
          <p className="mt-2">Vencidos: {vencidos.length}</p>
          <p>Para hoy: {paraHoy.length}</p>
          <p>Futuros: {futuros.length}</p>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">
              Seguimientos Pendientes
            </h2>
            <p className="text-gray-500 mt-1">
              Aquí están los clientes que los asesores deben volver a contactar.
            </p>
          </div>

          <button
            onClick={cargarClientes}
            className="bg-gray-800 text-white px-5 py-3 rounded-lg font-bold"
          >
            Actualizar
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-red-600 text-white rounded-xl p-4 shadow">
            <p className="text-sm opacity-90">🚨 Vencidos</p>
            <p className="text-3xl font-bold">{vencidos.length}</p>
          </div>

          <div className="bg-orange-500 text-white rounded-xl p-4 shadow">
            <p className="text-sm opacity-90">📅 Para hoy</p>
            <p className="text-3xl font-bold">{paraHoy.length}</p>
          </div>

          <div className="bg-gray-800 text-white rounded-xl p-4 shadow">
            <p className="text-sm opacity-90">📌 Futuros</p>
            <p className="text-3xl font-bold">{futuros.length}</p>
          </div>
        </div>

        {cargando ? (
          <p className="mt-8 text-gray-500">Cargando seguimientos...</p>
        ) : (
          <div className="mt-8 space-y-10">
            <section>
              <h3 className="text-xl font-bold text-red-600 mb-4">
                🚨 Vencidos
              </h3>

              {vencidos.length === 0 ? (
                <p className="text-gray-500">
                  No hay seguimientos vencidos.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {vencidos.map((cliente) => (
                    <CardCliente key={cliente.id} cliente={cliente} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="text-xl font-bold text-orange-600 mb-4">
                📅 Para hoy
              </h3>

              {paraHoy.length === 0 ? (
                <p className="text-gray-500">
                  No hay seguimientos para hoy.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {paraHoy.map((cliente) => (
                    <CardCliente key={cliente.id} cliente={cliente} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="text-xl font-bold text-gray-700 mb-4">
                📌 Próximos
              </h3>

              {futuros.length === 0 ? (
                <p className="text-gray-500">
                  No hay seguimientos futuros.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {futuros.map((cliente) => (
                    <CardCliente key={cliente.id} cliente={cliente} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}