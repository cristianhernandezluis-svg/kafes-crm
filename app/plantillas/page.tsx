"use client";

import { useEffect, useState } from "react";

type Plantilla = {
  id: number;
  empresa_id: number;
  nombre: string;
  mensaje: string;
  created_at: string;
};

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [mensajeEstado, setMensajeEstado] = useState("");
  const [form, setForm] = useState({
    nombre: "",
    mensaje: "",
  });

  const cargarPlantillas = async () => {
    const usuarioGuardado = localStorage.getItem("usuario");

    if (!usuarioGuardado) {
      window.location.href = "/login";
      return;
    }

    const usuario = JSON.parse(usuarioGuardado);

    const res = await fetch(`/api/plantillas?empresa_id=${usuario.empresa_id}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      setPlantillas(data.plantillas);
    }
  };

  const crearPlantilla = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeEstado("");

    const usuarioGuardado = localStorage.getItem("usuario");

    if (!usuarioGuardado) {
      window.location.href = "/login";
      return;
    }

    const usuario = JSON.parse(usuarioGuardado);

    const res = await fetch("/api/plantillas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        empresa_id: usuario.empresa_id,
        nombre: form.nombre,
        mensaje: form.mensaje,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      setMensajeEstado("No se pudo crear la plantilla");
      return;
    }

    setMensajeEstado("Plantilla creada correctamente ✅");
    setForm({
      nombre: "",
      mensaje: "",
    });

    cargarPlantillas();
  };

  useEffect(() => {
    cargarPlantillas();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Plantillas de WhatsApp</h1>
            <p className="text-gray-500">
              Crea respuestas listas para usar en tus conversaciones.
            </p>
          </div>

          <a href="/dashboard" className="bg-black text-white px-5 py-3 rounded-lg font-bold">
            Volver
          </a>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <form onSubmit={crearPlantilla} className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">Nueva plantilla</h2>

            <input
              className="border w-full p-3 rounded mb-3"
              placeholder="Nombre de la plantilla. Ej: Precio"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />

            <textarea
              className="border w-full p-3 rounded mb-3 h-40"
              placeholder="Mensaje. Ej: Hola 👋, el precio es S/..."
              value={form.mensaje}
              onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
            />

            <button className="bg-green-600 text-white w-full py-3 rounded font-bold">
              Crear plantilla
            </button>

            {mensajeEstado && (
              <p className="mt-4 text-center">{mensajeEstado}</p>
            )}
          </form>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">Mis plantillas</h2>

            <div className="space-y-3">
              {plantillas.map((p) => (
                <div key={p.id} className="border rounded-lg p-4">
                  <p className="font-bold">{p.nombre}</p>
                  <p className="text-gray-600 whitespace-pre-line mt-2">
                    {p.mensaje}
                  </p>
                </div>
              ))}

              {plantillas.length === 0 && (
                <p className="text-gray-500">
                  Aún no tienes plantillas creadas.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}