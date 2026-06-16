"use client";

import Link from "next/link";
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
<aside className="hidden lg:flex w-[220px] bg-[#101820] text-white flex-col min-h-screen border-r border-[#1f2a33]">
        <Link href="/dashboard" className="flex items-center gap-3 px-4 py-4 border-b border-[#1f2a33]">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-black">
            K
          </div>
          <h1 className="text-xl font-black">
            Kafes <span className="text-green-400">CRM</span>
          </h1>
        </Link>

        <div className="px-4 pt-5 pb-2">
          <p className="text-[11px] text-slate-400 uppercase font-bold">Principal</p>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">📊 Dashboard</Link>
          <Link href="/chat" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">💬 Conversaciones</Link>
          <Link href="/contactos" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">👤 Contactos</Link>
          <Link href="/kanban" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">🧩 Kanban</Link>
          <Link
  href="/mensajes"
  className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm"
>
  ✉️ Mensajes
</Link>
          <Link
  href="/plantillas"
  className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm"
>
  📄 Plantillas
</Link>
          <Link
  href="/automatizaciones"
  className="flex items-center gap-3 bg-green-700/70 text-white px-3 py-3 rounded-lg font-bold text-sm"
>
  ⚙️ Automatizaciones
</Link>
          <Link href="/reportes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">📊 Reportes</Link>
          <Link href="/ajustes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">⚙️ Ajustes</Link>
        </nav>

        <div className="p-3">
          <div className="border border-[#26323d] rounded-xl p-4 bg-[#111c24]">
            <p className="text-sm font-bold text-slate-300 mb-3">Conexión WhatsApp</p>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">🟢</div>
              <div>
                <p className="text-green-400 font-bold text-sm">Conectado</p>
                <p className="text-xs text-slate-400">QR activo</p>
              </div>
            </div>

            <Link href="/dashboard/canales" className="block w-full text-center border border-slate-700 rounded-lg py-2 text-xs font-bold hover:bg-slate-800">
              VER QR
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">

  <div className="h-12 bg-[#0b1218] border-b border-[#1f2a33] flex items-center justify-between px-5">
    <h1 className="text-sm font-bold text-white">
      Automatizaciones
    </h1>

    <div className="flex items-center gap-4 text-slate-300">
      <button className="hover:text-white">🔍</button>
      <button className="hover:text-white">🔔</button>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-black">
          C
        </div>

        <div>
          <p className="text-xs font-bold text-white">
            Administrador
          </p>

          <p className="text-[10px] text-green-400">
            ● En línea
          </p>
        </div>
      </div>
    </div>
  </div>

<div className="p-6">
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

  <div className="flex items-center gap-3">
    <div className="relative">
      <span className="absolute left-4 top-3 text-slate-400">🔍</span>
      <input
        className="bg-[#0f172a] border border-slate-800 rounded-xl pl-11 pr-4 py-3 outline-none w-[280px] text-sm"
        placeholder="Buscar automatizaciones..."
      />
    </div>

    <button className="bg-[#0f172a] border border-slate-800 px-4 py-3 rounded-xl text-sm">
      ⚗️ Filtros
    </button>

    <button
      onClick={crearAutomatizacion}
      className="bg-green-500 hover:bg-green-600 px-5 py-3 rounded-xl font-bold"
    >
      + Nueva automatización
    </button>
    </div>
  </div>

  <div className="flex gap-8 mb-4 text-sm">
  <button className="text-green-400 border-b-2 border-green-500 pb-2">
    Todas
  </button>

  <button className="text-slate-400 pb-2">
    Activas
    <span className="ml-2 bg-slate-800 px-2 py-0.5 rounded-full">
      {automatizaciones.filter((a) => a.activa).length}
    </span>
  </button>

  <button className="text-slate-400 pb-2">
    Inactivas
    <span className="ml-2 bg-slate-800 px-2 py-0.5 rounded-full">
      {automatizaciones.filter((a) => !a.activa).length}
    </span>
  </button>
</div>

        <div className="grid grid-cols-[320px_1fr_320px] gap-4">
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
      </div>
      </main>
    </div>
  );
}