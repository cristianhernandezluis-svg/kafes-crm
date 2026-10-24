
"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import {
  Bot, Plus, Save, Trash2, Wrench, Loader2
} from "lucide-react";

type Agente = {
  id: string;
  nombre: string;
  proveedor: string;
  modelo: string;
  prompt_maestro: string;
  activo: boolean;
};

type Respuesta = {
  success?: boolean;
  error?: string;
  agentes?: Agente[];
  agente?: Agente;
};

const modelos = ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"];

const nuevoAgente = {
  nombre: "Asesor de ventas peruano",
  modelo: "gpt-4.1-mini",
  prompt_maestro: "",
};

export default function RespuestasAutomaticasPage() {
  const [temaClaro, setTemaClaro] = useState(false);
  const [seccion, setSeccion] = useState("agentes");
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [nombre, setNombre] = useState(nuevoAgente.nombre);
  const [modelo, setModelo] = useState(nuevoAgente.modelo);
  const [prompt, setPrompt] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
const [mensajePrueba, setMensajePrueba] = useState("");
const [respuestaPrueba, setRespuestaPrueba] = useState("");
const [probando, setProbando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const tarjeta = temaClaro
    ? "bg-white border-slate-200"
    : "bg-[#111c2b] border-slate-800";

  const campo = temaClaro
    ? "bg-white text-slate-900 border-slate-300"
    : "bg-[#08111f] text-white border-slate-700";

  useEffect(() => {
    setTemaClaro(localStorage.getItem("tema-crm") === "claro");

    fetch("/api/agentes-ia", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (r) => {
        const datos: Respuesta = await r.json();
        if (!r.ok || !datos.success) {
          throw new Error(datos.error || "No se pudieron cargar los agentes");
        }
        setAgentes(datos.agentes || []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Error al cargar");
      })
      .finally(() => setCargando(false));
  }, []);

  function seleccionar(agente: Agente) {
    setSeleccionado(agente.id);
    setNombre(agente.nombre);
    setModelo(agente.modelo);
    setPrompt(agente.prompt_maestro);
    setMensaje("");
    setError("");
  }

  function crearNuevo() {
    setSeleccionado(null);
    setNombre(nuevoAgente.nombre);
    setModelo(nuevoAgente.modelo);
    setPrompt("");
    setMensaje("");
    setError("");
  }

  async function guardar() {
    if (guardando) return;

    setMensaje("");
    setError("");
    setGuardando(true);

    try {
      const editando = seleccionado !== null;
      const url = editando
        ? `/api/agentes-ia/${seleccionado}`
        : "/api/agentes-ia";

      const respuesta = await fetch(url, {
        method: editando ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          modelo,
          prompt_maestro: prompt,
        }),
      });

      const datos: Respuesta = await respuesta.json();

      if (!respuesta.ok || !datos.success || !datos.agente) {
        throw new Error(datos.error || "No se pudo guardar");
      }

      const guardado = datos.agente;

      setAgentes((anteriores) =>
        editando
          ? anteriores.map((a) => a.id === guardado.id ? guardado : a)
          : [guardado, ...anteriores]
      );

      setSeleccionado(guardado.id);
      setMensaje("Agente guardado correctamente.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }


async function probarAgente() {
  if (!seleccionado || !mensajePrueba.trim() || probando) return;

  setProbando(true);
  setRespuestaPrueba("");
  setError("");

  try {
    const respuesta = await fetch("/api/agentes-ia/probar", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agente_id: seleccionado,
        mensaje: mensajePrueba.trim(),
      }),
    });

    const datos: {
      success?: boolean;
      respuesta?: string;
      error?: string;
    } = await respuesta.json();

    if (!respuesta.ok || !datos.success) {
      throw new Error(datos.error || "No se pudo probar el agente");
    }

    setRespuestaPrueba(datos.respuesta || "Sin respuesta");
  } catch (e) {
    setError(e instanceof Error ? e.message : "Error al probar");
  } finally {
    setProbando(false);
  }
}


  async function eliminar() {
    if (!seleccionado || guardando) return;
    if (!window.confirm("¿Eliminar definitivamente este agente?")) return;

    setGuardando(true);
    setMensaje("");
    setError("");

    try {
      const respuesta = await fetch(
        `/api/agentes-ia/${seleccionado}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );

      const datos: Respuesta = await respuesta.json();

      if (!respuesta.ok || !datos.success) {
        throw new Error(datos.error || "No se pudo eliminar");
      }

      setAgentes((anteriores) =>
        anteriores.filter((a) => a.id !== seleccionado)
      );

      crearNuevo();
      setMensaje("Agente eliminado correctamente.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={`min-h-screen flex ${
      temaClaro ? "bg-slate-100 text-slate-900" : "bg-[#08111f] text-white"
    }`}>
      <Sidebar
        temaClaro={temaClaro}
        onCambiarTema={() => {
          const siguiente = !temaClaro;
          setTemaClaro(siguiente);
          localStorage.setItem("tema-crm", siguiente ? "claro" : "oscuro");
        }}
      />

      <main className="flex-1 min-w-0 p-6 md:p-8">
        <h1 className="text-2xl font-bold">Respuestas automáticas</h1>
        <p className="text-sm text-slate-400 mt-2">
          Administra tus agentes de IA y sus instrucciones comerciales.
        </p>

        <div className="flex gap-5 border-b border-slate-700 my-6">
          {[
            ["agentes", "Agentes de IA"],
            ["herramientas", "Herramientas de IA"],
          ].map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSeccion(id)}
              className={`pb-3 font-semibold ${
                seccion === id
                  ? "border-b-2 border-green-500 text-green-500"
                  : "text-slate-400"
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        {seccion === "herramientas" ? (
          <section className={`border rounded-2xl p-6 ${tarjeta}`}>
            <h2 className="font-bold flex items-center gap-2">
              <Wrench size={20} /> Herramientas de IA
            </h2>
            <p className="text-sm text-slate-400 mt-3">
              Próximamente: consultar productos, preparar pedidos
              y transferir conversaciones a una asesora.
            </p>
            <p className="text-sm text-amber-500 mt-4">
              Todavía no se ejecutan acciones automáticas.
            </p>
          </section>
        ) : (
          <div className="grid lg:grid-cols-[300px_1fr] gap-5">
            <section className={`border rounded-2xl p-5 ${tarjeta}`}>
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-bold flex items-center gap-2">
                  <Bot size={20} className="text-green-500" />
                  Mis agentes
                </h2>
                <button
                  onClick={crearNuevo}
                  className="rounded-lg bg-green-600 text-white p-2"
                  title="Nuevo agente"
                >
                  <Plus size={18} />
                </button>
              </div>

              {cargando && <p className="text-sm">Cargando agentes...</p>}

              {!cargando && agentes.length === 0 && (
                <p className="text-sm text-slate-400">
                  Todavía no tienes agentes. Crea el primero.
                </p>
              )}

              <div className="space-y-2">
                {agentes.map((agente) => (
                  <button
                    key={agente.id}
                    type="button"
                    onClick={() => seleccionar(agente)}
                    className={`w-full text-left rounded-xl border p-3 ${
                      seleccionado === agente.id
                        ? "border-green-500 bg-green-500/10"
                        : "border-slate-700"
                    }`}
                  >
                    <p className="font-semibold text-sm">{agente.nombre}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {agente.modelo} · {agente.activo ? "Activo" : "Desactivado"}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className={`border rounded-2xl p-6 ${tarjeta}`}>
              <h2 className="text-xl font-bold mb-5">
                {seleccionado ? "Editar agente" : "Nuevo agente"}
              </h2>

              <div className="space-y-4">
                <label className="block">
                  <span className="block text-sm font-medium mb-2">
                    Nombre del agente
                  </span>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    maxLength={120}
                    className={`w-full border rounded-xl p-3 ${campo}`}
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-medium mb-2">
                    Modelo de OpenAI
                  </span>
                  <select
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    className={`w-full border rounded-xl p-3 ${campo}`}
                  >
                    {modelos.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium mb-2">
                    Prompt Maestro
                  </span>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={16}
                    maxLength={40000}
                    placeholder="Escribe aquí las instrucciones del agente..."
                    className={`w-full border rounded-xl p-4 font-mono text-sm ${campo}`}
                  />
                </label>

                <p className="text-xs text-slate-400">
                  {prompt.length.toLocaleString()} / 40,000 caracteres
                </p>

                <p className="text-xs text-amber-500">
                  Guardar este agente no activa respuestas en WhatsApp.
                </p>


<div className="rounded-2xl border border-green-500/30 p-5 space-y-4">
  <h3 className="font-bold text-lg">
    Laboratorio de pruebas
  </h3>

  <p className="text-xs text-slate-400">
    Prueba el Prompt Maestro guardado sin enviar mensajes
    reales por WhatsApp. Esta operación consume créditos de OpenAI.
  </p>

  <textarea
    value={mensajePrueba}
    onChange={(e) => setMensajePrueba(e.target.value)}
    maxLength={1500}
    rows={3}
    placeholder="Ejemplo: ¿Cuánto cuesta el soporte telescópico?"
    className={`w-full border rounded-xl p-3 ${campo}`}
  />

  <button
    type="button"
    disabled={!seleccionado || !mensajePrueba.trim() || probando || guardando}
    onClick={probarAgente}
    className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
  >
    {probando ? "Consultando OpenAI..." : "Probar agente"}
  </button>

  {!seleccionado && (
    <p className="text-xs text-amber-500">
      Primero guarda el agente para poder probarlo.
    </p>
  )}

  {respuestaPrueba && (
    <div className="rounded-xl border border-slate-700 p-4">
      <p className="font-semibold text-sm mb-2">
        Respuesta de OpenAI
      </p>
      <p className="text-sm whitespace-pre-wrap">
        {respuestaPrueba}
      </p>
    </div>
  )}
</div>


                {error && (
                  <p role="alert" className="text-sm text-red-500">{error}</p>
                )}
                {mensaje && (
                  <p role="status" className="text-sm text-green-500">{mensaje}</p>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={guardando || cargando}
                    onClick={guardar}
                    className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-bold text-white disabled:opacity-50"
                  >
                    {guardando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Guardar agente
                  </button>

                  {seleccionado && (
                    <button
                      type="button"
                      disabled={guardando}
                      onClick={eliminar}
                      className="flex items-center gap-2 rounded-xl border border-red-500 px-4 py-3 font-semibold text-red-500 disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
