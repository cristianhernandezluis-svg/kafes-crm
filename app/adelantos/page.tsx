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
  ultima_gestion?: string | null;
};

const ASESOR_ACTUAL = "cristian";

export default function AdelantosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarClientes = async () => {
    const res = await fetch("/api/clientes", { cache: "no-store" });
    const data = await res.json();

    if (data.success) {
      setClientes(data.clientes);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarClientes();
    const intervalo = setInterval(cargarClientes, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const misAdelantos = clientes.filter(
    (c) =>
      c.asesor?.toLowerCase() === ASESOR_ACTUAL &&
      c.etapa === "Pagó Adelanto"
  );

  const enviados = clientes.filter(
    (c) =>
      c.asesor?.toLowerCase() === ASESOR_ACTUAL &&
      c.etapa === "Enviado"
  );

  const entregados = clientes.filter(
    (c) =>
      c.asesor?.toLowerCase() === ASESOR_ACTUAL &&
      c.etapa === "Entregado"
  );

  const actualizarEtapa = async (cliente: Cliente, etapa: string) => {
    const res = await fetch(`/api/clientes/${cliente.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        etapa,
        ultima_gestion: new Date().toISOString(),
      }),
    });

    const data = await res.json();

    if (!data.success) {
      alert("No se pudo actualizar");
      return;
    }

    cargarClientes();
  };

  const abrirWhatsApp = (telefono: string) => {
    const numero = telefono.replace(/\s/g, "");
    window.open(`https://wa.me/51${numero}`, "_blank");
  };

  const CardCliente = ({ cliente }: { cliente: Cliente }) => (
    <div className="bg-white rounded-xl shadow p-4 border">
      <h3 className="font-bold text-lg">{cliente.nombre || "Sin nombre"}</h3>

      <p className="text-sm">📱 {cliente.telefono}</p>
      <p className="text-sm text-green-600">
        📍 {cliente.ciudad || "Sin ciudad"}
      </p>
      <p className="text-sm text-gray-500">Etapa: {cliente.etapa}</p>

      {cliente.observacion && (
        <p className="text-sm bg-gray-100 p-2 rounded mt-2">
          📝 {cliente.observacion}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          onClick={() => abrirWhatsApp(cliente.telefono)}
          className="bg-green-600 text-white py-2 rounded-lg font-bold text-sm"
        >
          WhatsApp
        </button>

        <button
          onClick={() => actualizarEtapa(cliente, "Enviado")}
          className="bg-blue-600 text-white py-2 rounded-lg font-bold text-sm"
        >
          📦 Enviado
        </button>

        <button
          onClick={() => actualizarEtapa(cliente, "Entregado")}
          className="col-span-2 bg-yellow-500 text-black py-2 rounded-lg font-bold text-sm"
        >
          ✅ Entregado
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

          <Link
            href="/mis-pendientes"
            className="block p-3 hover:bg-zinc-800 rounded-lg"
          >
            Mis Pendientes
          </Link>

          <div className="bg-yellow-500 text-black p-3 rounded-lg font-bold">
            Adelantos
          </div>

          <Link
            href="/seguimientos"
            className="block p-3 hover:bg-zinc-800 rounded-lg"
          >
            Seguimientos
          </Link>
        </div>

        <div className="mt-10 bg-zinc-900 p-4 rounded-xl">
          <p className="text-sm text-gray-400">Cristian</p>
          <p className="mt-2">Adelantos: {misAdelantos.length}</p>
          <p>Enviados: {enviados.length}</p>
          <p>Entregados: {entregados.length}</p>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <h2 className="text-3xl font-bold">💰 Mis Adelantos</h2>
        <p className="text-gray-500 mt-1">
          Clientes que ya pagaron adelanto y deben avanzar a envío o entrega.
        </p>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-green-600 text-white rounded-xl p-4">
            <p>💰 Adelantos</p>
            <p className="text-3xl font-bold">{misAdelantos.length}</p>
          </div>

          <div className="bg-blue-600 text-white rounded-xl p-4">
            <p>📦 Enviados</p>
            <p className="text-3xl font-bold">{enviados.length}</p>
          </div>

          <div className="bg-yellow-500 text-black rounded-xl p-4">
            <p>✅ Entregados</p>
            <p className="text-3xl font-bold">{entregados.length}</p>
          </div>
        </div>

        {cargando ? (
          <p className="mt-8 text-gray-500">Cargando adelantos...</p>
        ) : (
          <div className="mt-8 space-y-10">
            <section>
              <h3 className="text-xl font-bold text-green-600 mb-4">
                💰 Pagaron Adelanto
              </h3>

              <div className="grid grid-cols-3 gap-4">
                {misAdelantos.map((cliente) => (
                  <CardCliente key={cliente.id} cliente={cliente} />
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-blue-600 mb-4">
                📦 Enviados
              </h3>

              <div className="grid grid-cols-3 gap-4">
                {enviados.map((cliente) => (
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