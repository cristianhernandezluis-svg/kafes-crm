"use client";

import { useEffect, useState } from "react";

type PlanData = {
  empresa: {
    id: number;
    nombre: string;
    plan: string;
    estado: string;
  };
  uso: {
    usuarios: number;
  };
  limites: {
    usuarios: number;
  };
};

export default function PlanesPage() {
  const [data, setData] = useState<PlanData | null>(null);

  const cargarPlan = async () => {
    const usuarioGuardado = localStorage.getItem("usuario");

    if (!usuarioGuardado) {
      window.location.href = "/login";
      return;
    }

    const usuario = JSON.parse(usuarioGuardado);

    const res = await fetch(`/api/planes?empresa_id=${usuario.empresa_id}`, {
      cache: "no-store",
    });

    const json = await res.json();

    if (json.success) {
      setData(json);
    }
  };

  useEffect(() => {
    cargarPlan();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Suscripción</h1>
            <p className="text-gray-500">
              Revisa tu plan actual y mejora cuando necesites más capacidad.
            </p>
          </div>

          <a href="/dashboard" className="bg-black text-white px-5 py-3 rounded-lg font-bold">
            Volver
          </a>
        </div>

        {data && (
          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <h2 className="text-xl font-bold">Plan actual: {data.empresa.plan}</h2>
            <p className="text-gray-600 mt-2">
              Usuarios usados: {data.uso.usuarios} / {data.limites.usuarios}
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          <PlanCard
            nombre="Gratis"
            precio="S/0"
            items={["1 usuario", "1 WhatsApp", "Plantillas", "Embudo CRM"]}
          />

          <PlanCard
            nombre="Emprendedor"
            precio="S/49/mes"
            destacado
            items={[
              "3 usuarios",
              "1 WhatsApp",
              "Seguimientos",
              "Audios y archivos",
              "Soporte básico",
            ]}
          />

          <PlanCard
            nombre="Empresa"
            precio="S/99/mes"
            items={[
              "10 usuarios",
              "3 WhatsApp",
              "Reportes",
              "Productividad",
              "Soporte prioritario",
            ]}
          />
        </div>
      </div>
    </main>
  );
}

function PlanCard({
  nombre,
  precio,
  items,
  destacado = false,
}: {
  nombre: string;
  precio: string;
  items: string[];
  destacado?: boolean;
}) {
  return (
    <div className={`rounded-xl shadow p-6 bg-white border-2 ${destacado ? "border-yellow-400" : "border-transparent"}`}>
      {destacado && (
        <p className="bg-yellow-400 text-black inline-block px-3 py-1 rounded-full text-sm font-bold mb-3">
          Recomendado
        </p>
      )}

      <h2 className="text-2xl font-black">{nombre}</h2>
      <p className="text-3xl font-black mt-3">{precio}</p>

      <ul className="mt-5 space-y-2">
        {items.map((item) => (
          <li key={item}>✅ {item}</li>
        ))}
      </ul>

      <button className="w-full bg-black text-white py-3 rounded-lg mt-6 font-bold">
        Solicitar este plan
      </button>
    </div>
  );
}