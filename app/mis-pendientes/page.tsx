"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import VerificarSuscripcion from "@/components/VerificarSuscripcion";

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

const ASESOR_ACTUAL = "cristian";

export default function MisPendientesPage() {
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
      console.error("Error cargando mis pendientes:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarClientes();
    const intervalo = setInterval(cargarClientes, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const misClientes = clientes.filter(
    (c) => c.asesor?.toLowerCase() === ASESOR_ACTUAL
  );

  const etapasFinales = ["Pagó Adelanto", "Enviado", "Entregado"];

  const activos = misClientes.filter(
    (c) => !etapasFinales.includes(c.etapa)
  );

  const vencidos = activos.filter(
    (c) =>
      c.proximo_seguimiento &&
      new Date(c.proximo_seguimiento) < new Date()
  );

  const paraHoy = activos.filter((c) => {
    if (!c.proximo_seguimiento) return false;
    const fecha = new Date(c.proximo_seguimiento);
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString();
  });

const proximos = activos.filter((c) => {
  if (!c.proximo_seguimiento) return false;

  const fecha = new Date(c.proximo_seguimiento);
  const hoy = new Date();

  return fecha > hoy && fecha.toDateString() !== hoy.toDateString();
});

  const sinSeguimiento = activos.filter(
    (c) => !c.proximo_seguimiento
  );

  const pendientesAdelanto = misClientes.filter(
    (c) =>
      c.etapa === "Interesado" ||
      c.etapa === "Seguimiento"
  );

  const abrirWhatsApp = (telefono: string) => {
    const numero = telefono.replace(/\s/g, "");
    window.open(`https://wa.me/51${numero}`, "_blank");
  };

  const marcarPagoAdelanto = async (cliente: Cliente) => {
    const res = await fetch(`/api/clientes/${cliente.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        etapa: "Pagó Adelanto",
        ultima_gestion: new Date().toISOString(),
      }),
    });

    const data = await res.json();

    if (!data.success) {
      alert("No se pudo marcar como Pagó Adelanto");
      return;
    }

    cargarClientes();
  };

const marcarPendienteAdelanto = async (cliente: Cliente) => {
  const res = await fetch(`/api/clientes/${cliente.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      etapa: "Pendiente Adelanto",
      ultima_gestion: new Date().toISOString(),
    }),
  });

  const data = await res.json();

  if (!data.success) {
    alert("No se pudo marcar como Pendiente Adelanto");
    return;
  }

  cargarClientes();
};

  const CardCliente = ({ cliente }: { cliente: Cliente }) => (
    <div className="bg-white rounded-xl shadow p-4 border">
      <h3 className="font-bold text-lg">{cliente.nombre || "Sin nombre"}</h3>

      <p className="text-sm">📱 {cliente.telefono}</p>
      <p className="text-sm text-green-600">📍 {cliente.ciudad || "Sin ciudad"}</p>
      <p className="text-sm text-gray-500">Etapa: {cliente.etapa}</p>

      {cliente.proximo_seguimiento && (
        <p className="text-sm text-orange-600 mt-2">
          📅 {new Date(cliente.proximo_seguimiento).toLocaleString("es-PE")}
        </p>
      )}

      {cliente.observacion && (
        <p className="text-sm bg-gray-100 p-2 rounded mt-2">
          📝 {cliente.observacion}
        </p>
      )}

      <p className="text-xs text-blue-600 mt-2">
        🔥 Seguimientos: {cliente.cantidad_seguimientos || 0}
      </p>

      <div className="grid grid-cols-2 gap-2 mt-4">
  <button
    onClick={() => abrirWhatsApp(cliente.telefono)}
    className="bg-green-600 text-white py-2 rounded-lg font-bold text-sm"
  >
    WhatsApp
  </button>

  <Link
    href="/seguimientos"
    className="bg-purple-600 text-white text-center py-2 rounded-lg font-bold text-sm"
  >
    Reprogramar
  </Link>

  <button
    onClick={() => marcarPendienteAdelanto(cliente)}
    className="col-span-2 bg-orange-500 text-white py-2 rounded-lg font-bold text-sm"
  >
    🔥 Pendiente Adelanto
  </button>

  <button
    onClick={() => marcarPagoAdelanto(cliente)}
    className="col-span-2 bg-yellow-500 text-black py-2 rounded-lg font-bold text-sm"
  >
    💰 Pagó Adelanto
  </button>
</div>
    </div>
  );

  return (
  <>
    <VerificarSuscripcion />

    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-black text-white p-5">
        <h1 className="text-2xl font-bold text-yellow-400">Kafes CRM</h1>

        <div className="mt-10 space-y-4">
  <Link href="/" className="block p-3 hover:bg-zinc-800 rounded-lg">
    Dashboard
  </Link>

  <div className="bg-yellow-500 text-black p-3 rounded-lg font-bold">
    Mis Pendientes
  </div>

  <Link
    href="/seguimientos"
    className="block p-3 hover:bg-zinc-800 rounded-lg"
  >
    Seguimientos
  </Link>

  <Link
    href="/adelantos"
    className="block p-3 hover:bg-zinc-800 rounded-lg"
  >
    Adelantos
  </Link>

  <div className="p-3 hover:bg-zinc-800 rounded-lg cursor-pointer">
    Ventas
  </div>

  <div className="p-3 hover:bg-zinc-800 rounded-lg cursor-pointer">
    Reportes
  </div>
</div>

        <div className="mt-10 bg-zinc-900 p-4 rounded-xl">
          <p className="text-sm text-gray-400">Cristian</p>
          <p className="mt-2">Mis clientes: {misClientes.length}</p>
          <p>Vencidos: {vencidos.length}</p>
          <p>Para hoy: {paraHoy.length}</p>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <h2 className="text-3xl font-bold">🔥 Mis Pendientes</h2>
        <p className="text-gray-500 mt-1">
          Esta es tu bandeja personal de trabajo diario.
        </p>

        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-red-600 text-white rounded-xl p-4">
            <p>🚨 Vencidos</p>
            <p className="text-3xl font-bold">{vencidos.length}</p>
          </div>

          <div className="bg-orange-500 text-white rounded-xl p-4">
            <p>📅 Para hoy</p>
            <p className="text-3xl font-bold">{paraHoy.length}</p>
          </div>

         <div className="bg-gray-800 text-white rounded-xl p-4">
  <p>🕳 Sin seguimiento</p>
  <p className="text-3xl font-bold">{sinSeguimiento.length}</p>
</div>

<div className="bg-blue-600 text-white rounded-xl p-4">
  <p>📌 Próximos</p>
  <p className="text-3xl font-bold">{proximos.length}</p>
</div>
</div>

{cargando ? (
  <p className="mt-8 text-gray-500">Cargando pendientes...</p>
) : (
  <div className="mt-8 space-y-10">
    <section>
      <h3 className="text-xl font-bold text-red-600 mb-4">
        🚨 Vencidos
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {vencidos.map((cliente) => (
          <CardCliente key={cliente.id} cliente={cliente} />
        ))}
      </div>
    </section>

    <section>
      <h3 className="text-xl font-bold text-orange-600 mb-4">
        📅 Para hoy
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {paraHoy.map((cliente) => (
          <CardCliente key={cliente.id} cliente={cliente} />
        ))}
      </div>
    </section>

    <section>
      <h3 className="text-xl font-bold text-blue-600 mb-4">
        📌 Próximos
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {proximos.map((cliente) => (
          <CardCliente key={cliente.id} cliente={cliente} />
        ))}
      </div>
    </section>

    <section>
      <h3 className="text-xl font-bold text-gray-700 mb-4">
        🕳 Sin seguimiento programado
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {sinSeguimiento.map((cliente) => (
          <CardCliente key={cliente.id} cliente={cliente} />
        ))}
      </div>
    </section>
  </div>
)}
</main>
</div>
</>
);
}