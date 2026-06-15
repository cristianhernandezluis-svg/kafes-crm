"use client";

import { useEffect, useState } from "react";

type Automatizacion = {
  id: number;
  empresa_id: number;
  nombre: string;
  descripcion: string;
  trigger_tipo: string;
  mensaje: string;
  espera_horas: number;
  activa: boolean;
  created_at: string;
};

export default function AutomatizacionesPage() {
  const [automatizaciones, setAutomatizaciones] = useState<Automatizacion[]>([]);
  const [activa, setActiva] = useState<Automatizacion | null>(null);

  const [form, setForm] = useState({
    nombre: "Bienvenida automática",
    descripcion: "Envía un mensaje cuando entra un nuevo contacto.",
    trigger_tipo: "nuevo_contacto",
    mensaje:
      "Hola 👋 gracias por comunicarte con nosotros. En breve te responderemos.",
    espera_horas: 0,
  });

  const usuario =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("usuario") || "{}")
      : {};

  const empresaId = usuario?.empresa_id || 1;

  async function cargarAutomatizaciones() {
    const res = await fetch(`/api/automatizaciones?empresa_id=${empresaId}`);
    const data = await res.json();

    if (data.success) {
      setAutomatizaciones(data.automatizaciones);

      if (!activa && data.automatizaciones.length > 0) {
        setActiva(data.automatizaciones[0]);
      }
    }
  }

  async function crearAutomatizacion() {
    const res = await fetch("/api/automatizaciones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        empresa_id: empresaId,
        ...form,
        activa: true,
      }),
    });

    const data = await res.json();

    if (data.success) {
      setForm({
        nombre: "",
        descripcion: "",
        trigger_tipo: "nuevo_contacto",
        mensaje: "",
        espera_horas: 0,
      });

      await cargarAutomatizaciones();
      setActiva(data.automatizacion);
    } else {
      alert("Error creando automatización");
    }
  }

  async function cambiarEstado(auto: Automatizacion) {
    const res = await fetch(`/api/automatizaciones/${auto.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        activa: !auto.activa,
      }),
    });

    const data = await res.json();

    if (data.success) {
      await cargarAutomatizaciones();
      setActiva(data.automatizacion);
    } else {
      alert("Error actualizando automatización");
    }
  }

  useEffect(() => {
    cargarAutomatizaciones();
  }, []);

  return (
    <div className="min-h-screen bg-[#08111f] text-white flex">
      <main className="flex-1 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
              Automatizaciones
              <span className="text-xs bg-green-500 text-white px-3 py-1 rounded-full">
                {automatizaciones.length}
              </span>
            </h1>

            <p className="text-slate-400 mt-1">
              Crea flujos automáticos para optimizar tu comunicación y procesos.
            </p>
          </div>

          <button
            onClick={crearAutomatizacion}
            className="bg-green-500 hover:bg-green-600 px-5 py-3 rounded-xl font-bold"
          >
            + Nueva automatización
          </button>
        </div>

        <div className="grid grid-cols-[320px_1fr_300px] gap-4">
          <section className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h2 className="font-bold">Automatizaciones</h2>
              <p className="text-xs text-slate-400">
                Selecciona una automatización
              </p>
            </div>

            <div>
              {automatizaciones.length === 0 && (
                <div className="p-5 text-slate-400 text-sm">
                  Aún no tienes automatizaciones.
                </div>
              )}

              {automatizaciones.map((auto) => (
                <button
                  key={auto.id}
                  onClick={() => setActiva(auto)}
                  className={`w-full text-left p-4 border-b border-slate-800 hover:bg-slate-800/70 ${
                    activa?.id === auto.id ? "bg-green-500/15" : ""
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-sm">{auto.nombre}</h3>

                      <p className="text-xs text-slate-400 mt-1">
                        {auto.descripcion}
                      </p>

                      <span
                        className={`text-xs mt-2 inline-block ${
                          auto.activa ? "text-green-400" : "text-yellow-400"
                        }`}
                      >
                        ● {auto.activa ? "Activa" : "Inactiva"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        cambiarEstado(auto);
                      }}
                      className={`w-10 h-5 rounded-full p-1 shrink-0 ${
                        auto.activa ? "bg-green-500" : "bg-slate-600"
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-white transition-all ${
                          auto.activa ? "ml-5" : "ml-0"
                        }`}
                      />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
            <h2 className="text-xl font-black mb-4">Crear automatización</h2>

            <div className="grid gap-4">
              <input
                className="bg-[#08111f] border border-slate-700 rounded-xl px-4 py-3 outline-none"
                placeholder="Nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />

              <input
                className="bg-[#08111f] border border-slate-700 rounded-xl px-4 py-3 outline-none"
                placeholder="Descripción"
                value={form.descripcion}
                onChange={(e) =>
                  setForm({ ...form, descripcion: e.target.value })
                }
              />

              <select
                className="bg-[#08111f] border border-slate-700 rounded-xl px-4 py-3 outline-none"
                value={form.trigger_tipo}
                onChange={(e) =>
                  setForm({ ...form, trigger_tipo: e.target.value })
                }
              >
                <option value="nuevo_contacto">Nuevo contacto</option>
                <option value="sin_respuesta_24h">Sin respuesta 24h</option>
                <option value="cambio_etapa">Cambio de etapa</option>
                <option value="cumpleanos">Cumpleaños</option>
              </select>

              <textarea
                className="bg-[#08111f] border border-slate-700 rounded-xl px-4 py-3 outline-none min-h-[140px]"
                placeholder="Mensaje automático"
                value={form.mensaje}
                onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
              />

              <input
                type="number"
                className="bg-[#08111f] border border-slate-700 rounded-xl px-4 py-3 outline-none"
                placeholder="Horas de espera"
                value={form.espera_horas}
                onChange={(e) =>
                  setForm({
                    ...form,
                    espera_horas: Number(e.target.value),
                  })
                }
              />

              <button
                onClick={crearAutomatizacion}
                className="bg-green-500 hover:bg-green-600 px-5 py-3 rounded-xl font-bold"
              >
                Guardar automatización
              </button>
            </div>
          </section>

          <section className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
  <div className="flex justify-between items-center mb-6">
    <h2 className="text-xl font-black">
      {activa?.nombre || "Flujo"}
    </h2>

    <div className="flex gap-2">
      <button className="bg-slate-800 px-4 py-2 rounded-lg text-sm">
        Probar flujo
      </button>

      <button className="bg-green-500 px-4 py-2 rounded-lg text-sm font-bold">
        Guardar
      </button>
    </div>
  </div>

  <div className="flex flex-col items-center gap-6 py-8">

    <div className="w-[280px] border border-green-500 rounded-xl p-4 bg-green-500/10">
      <p className="text-green-400 text-sm font-bold">
        ⚡ Disparador
      </p>

      <h3 className="font-bold mt-2">
        Nuevo contacto
      </h3>

      <p className="text-xs text-slate-400 mt-1">
        Cuando un cliente inicia conversación.
      </p>
    </div>

    <div className="h-12 border-l border-slate-700"></div>

    <div className="w-[280px] border border-yellow-500 rounded-xl p-4 bg-yellow-500/10">
      <p className="text-yellow-400 text-sm font-bold">
        🔍 Condición
      </p>

      <h3 className="font-bold mt-2">
        Siempre
      </h3>

      <p className="text-xs text-slate-400 mt-1">
        Ejecutar automáticamente.
      </p>
    </div>

    <div className="h-12 border-l border-slate-700"></div>

    <div className="w-[320px] border border-green-500 rounded-xl p-4 bg-slate-900">
      <p className="text-green-400 text-sm font-bold">
        💬 Enviar mensaje
      </p>

      <p className="text-sm mt-3">
        {activa?.mensaje ||
          "Hola 👋 gracias por comunicarte con nosotros."}
      </p>
    </div>

    <div className="h-12 border-l border-slate-700"></div>

    <div className="w-[280px] border border-blue-500 rounded-xl p-4 bg-blue-500/10">
      <p className="text-blue-400 text-sm font-bold">
        🏁 Finalizar
      </p>

      <p className="text-sm mt-2">
        Fin del flujo
      </p>
    </div>

  </div>
</section>
        </div>
      </main>
    </div>
  );
}