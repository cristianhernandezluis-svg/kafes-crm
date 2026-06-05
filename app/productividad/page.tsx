"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Cliente = {
  id: number;
  nombre: string;
  etapa: string;
  asesor: string | null;
  proximo_seguimiento?: string | null;
  ultima_gestion?: string | null;
  cantidad_seguimientos?: number;
};

type ResumenAsesor = {
  asesor: string;
  clientes: number;
  vencidos: number;
  seguimientos: number;
  adelantos: number;
  enviados: number;
  entregados: number;
};

export default function ProductividadPage() {
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
      console.error("Error cargando productividad:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarClientes();
    const intervalo = setInterval(cargarClientes, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const hoy = new Date();

  const asesores = Array.from(
    new Set(
      clientes
        .map((c) => c.asesor?.trim())
        .filter((a): a is string => Boolean(a))
    )
  );

  const resumen: ResumenAsesor[] = asesores.map((asesor) => {
    const propios = clientes.filter(
      (c) => c.asesor?.toLowerCase() === asesor.toLowerCase()
    );

    return {
      asesor,
      clientes: propios.length,
      vencidos: propios.filter(
        (c) =>
          c.proximo_seguimiento &&
          new Date(c.proximo_seguimiento) < hoy &&
          !["Pagó Adelanto", "Enviado", "Entregado"].includes(c.etapa)
      ).length,
      seguimientos: propios.reduce(
        (total, c) => total + (c.cantidad_seguimientos || 0),
        0
      ),
      adelantos: propios.filter((c) => c.etapa === "Pagó Adelanto").length,
      enviados: propios.filter((c) => c.etapa === "Enviado").length,
      entregados: propios.filter((c) => c.etapa === "Entregado").length,
    };
  });

  const ranking = resumen.sort(
    (a, b) =>
      b.seguimientos +
      b.adelantos * 5 +
      b.entregados * 10 -
      (a.seguimientos + a.adelantos * 5 + a.entregados * 10)
  );

  return (
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

          <div className="bg-yellow-500 text-black p-3 rounded-lg font-bold">
            Productividad
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <h2 className="text-3xl font-bold">🎯 Productividad por Asesor</h2>
        <p className="text-gray-500 mt-1">
          Mide quién está haciendo seguimiento y quién está cerrando más.
        </p>

        {cargando ? (
          <p className="mt-8 text-gray-500">Cargando productividad...</p>
        ) : (
          <div className="mt-8 space-y-6">
<div className="grid grid-cols-4 gap-4 mb-6">
<div className="grid grid-cols-4 gap-4">
  <div className="bg-blue-600 text-white rounded-xl p-4">
    <p>🎯 Meta Seguimientos</p>
    <p className="text-3xl font-bold">
      {resumen.reduce((t, a) => t + a.seguimientos, 0)} / 50
    </p>
  </div>

  <div className="bg-green-700 text-white rounded-xl p-4">
    <p>💰 Meta Adelantos</p>
    <p className="text-3xl font-bold">
      {resumen.reduce((t, a) => t + a.adelantos, 0)} / 5
    </p>
  </div>

  <div className="bg-yellow-500 text-black rounded-xl p-4">
    <p>📦 Meta Entregados</p>
    <p className="text-3xl font-bold">
      {resumen.reduce((t, a) => t + a.entregados, 0)} / 10
    </p>
  </div>

  <div className="bg-red-700 text-white rounded-xl p-4">
    <p>🚨 Clientes Vencidos</p>
    <p className="text-3xl font-bold">
      {resumen.reduce((t, a) => t + a.vencidos, 0)}
    </p>
  </div>
</div>              <div className="bg-gray-800 text-white rounded-xl p-4">
                <p>👥 Asesores</p>
                <p className="text-3xl font-bold">{resumen.length}</p>
              </div>

              <div className="bg-purple-600 text-white rounded-xl p-4">
                <p>🔥 Seguimientos</p>
                <p className="text-3xl font-bold">
                  {resumen.reduce((t, a) => t + a.seguimientos, 0)}
                </p>
              </div>

              <div className="bg-green-600 text-white rounded-xl p-4">
                <p>💰 Adelantos</p>
                <p className="text-3xl font-bold">
                  {resumen.reduce((t, a) => t + a.adelantos, 0)}
                </p>
              </div>

              <div className="bg-red-600 text-white rounded-xl p-4">
                <p>🚨 Vencidos</p>
                <p className="text-3xl font-bold">
                  {resumen.reduce((t, a) => t + a.vencidos, 0)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="p-3 text-left">Asesor</th>
                    <th className="p-3">Clientes</th>
                    <th className="p-3">Seguimientos</th>
                    <th className="p-3">Adelantos</th>
                    <th className="p-3">Enviados</th>
                    <th className="p-3">Entregados</th>
                    <th className="p-3">Vencidos</th>
                  </tr>
                </thead>

                <tbody>
                  {ranking.map((asesor, index) => (
                    <tr key={asesor.asesor} className="border-b">
                      <td className="p-3 font-bold">
                        {index === 0 ? "🥇 " : index === 1 ? "🥈 " : index === 2 ? "🥉 " : ""}
                        {asesor.asesor}
                      </td>
                      <td className="p-3 text-center">{asesor.clientes}</td>
                      <td className="p-3 text-center">{asesor.seguimientos}</td>
                      <td className="p-3 text-center">{asesor.adelantos}</td>
                      <td className="p-3 text-center">{asesor.enviados}</td>
                      <td className="p-3 text-center">{asesor.entregados}</td>
                      <td className="p-3 text-center text-red-600 font-bold">
                        {asesor.vencidos}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}