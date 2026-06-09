"use client";

import { useEffect, useState } from "react";
import VerificarSuscripcion from "@/components/VerificarSuscripcion";

type Productividad = {
  asesor: string;
  clientes: number;
  seguimientos: number;
  pendientes_adelanto: number;
  adelantos: number;
  enviados: number;
  entregados: number;
  no_responde: number;
};

export default function ProductividadPage() {
  const [data, setData] = useState<Productividad[]>([]);

  const cargarProductividad = async () => {
    const usuarioGuardado = localStorage.getItem("usuario");

    if (!usuarioGuardado) {
      window.location.href = "/login";
      return;
    }

    const usuario = JSON.parse(usuarioGuardado);

    const res = await fetch(`/api/productividad?empresa_id=${usuario.empresa_id}`, {
      cache: "no-store",
    });

    const json = await res.json();

    if (json.success) {
      setData(json.productividad);
    }
  };

  useEffect(() => {
    cargarProductividad();
  }, []);

  return (
    <>
      <VerificarSuscripcion />

      <main className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Productividad por asesor</h1>
              <p className="text-gray-500">
                Revisa cuántos clientes, seguimientos y cierres tiene cada asesor.
              </p>
            </div>

            <a href="/dashboard" className="bg-black text-white px-5 py-3 rounded-lg font-bold">
              Volver
            </a>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Resumen titulo="Total clientes" valor={data.reduce((a, b) => a + b.clientes, 0)} />
            <Resumen titulo="Adelantos" valor={data.reduce((a, b) => a + b.adelantos, 0)} />
            <Resumen titulo="Entregados" valor={data.reduce((a, b) => a + b.entregados, 0)} />
          </div>

          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-3 text-left">Asesor</th>
                  <th className="border p-3">Clientes</th>
                  <th className="border p-3">Seguimientos</th>
                  <th className="border p-3">Pend. Adelanto</th>
                  <th className="border p-3">Pagó Adelanto</th>
                  <th className="border p-3">Enviado</th>
                  <th className="border p-3">Entregado</th>
                  <th className="border p-3">No Responde</th>
                </tr>
              </thead>

              <tbody>
                {data.map((item) => (
                  <tr key={item.asesor}>
                    <td className="border p-3 font-bold">{item.asesor}</td>
                    <td className="border p-3 text-center">{item.clientes}</td>
                    <td className="border p-3 text-center">{item.seguimientos}</td>
                    <td className="border p-3 text-center">{item.pendientes_adelanto}</td>
                    <td className="border p-3 text-center">{item.adelantos}</td>
                    <td className="border p-3 text-center">{item.enviados}</td>
                    <td className="border p-3 text-center">{item.entregados}</td>
                    <td className="border p-3 text-center">{item.no_responde}</td>
                  </tr>
                ))}

                {data.length === 0 && (
                  <tr>
                    <td className="p-5 text-center text-gray-500" colSpan={8}>
                      No hay datos de productividad todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}

function Resumen({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-gray-500">{titulo}</p>
      <p className="text-3xl font-black mt-2">{valor}</p>
    </div>
  );
}