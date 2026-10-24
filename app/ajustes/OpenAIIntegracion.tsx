
"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, CheckCircle2, KeyRound, Loader2 } from "lucide-react";

type Estado = {
  success?: boolean;
  conectado?: boolean;
  error?: string;
  mensaje?: string;
};

export default function OpenAIIntegracion() {
  const [conectado, setConectado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modal, setModal] = useState(false);
  const [clave, setClave] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let activo = true;

    fetch("/api/integraciones/openai", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (r) => {
        const data: Estado = await r.json();
        if (!r.ok) throw new Error(data.error || "Error al consultar");
        return data;
      })
      .then((data) => {
        if (activo) setConectado(Boolean(data.conectado));
      })
      .catch(() => {
        if (activo) setMensaje("No se pudo consultar la conexión.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => { activo = false; };
  }, []);

  async function conectar() {
    if (!clave.trim() || guardando) return;
    setGuardando(true);
    setMensaje("");

    try {
      const r = await fetch("/api/integraciones/openai", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: clave.trim() }),
      });

      const data: Estado = await r.json();
      if (!r.ok || !data.success) {
        throw new Error(data.error || "No se pudo conectar OpenAI");
      }

      setConectado(true);
      setModal(false);
      setClave("");
      setMensaje("OpenAI conectado correctamente.");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "Error al conectar");
    } finally {
      setGuardando(false);
    }
  }

  async function desconectar() {
    if (guardando || !window.confirm("¿Desconectar OpenAI de Kafes CRM?")) return;
    setGuardando(true);
    setMensaje("");

    try {
      const r = await fetch("/api/integraciones/openai", {
        method: "DELETE",
        credentials: "same-origin",
      });

      const data: Estado = await r.json();
      if (!r.ok || !data.success) {
        throw new Error(data.error || "No se pudo desconectar");
      }

      setConectado(false);
      setMensaje("OpenAI desconectado.");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "Error al desconectar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-700 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <BrainCircuit className="text-green-500" size={24} />
        <div>
          <h3 className="font-bold">OpenAI ChatGPT</h3>
          <p className="text-sm text-slate-400">
            Conecta inteligencia artificial a Kafes CRM
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {conectado && <CheckCircle2 className="text-green-500" size={18} />}
        <span className={conectado ? "text-green-500" : "text-amber-500"}>
          {cargando ? "Comprobando..." : conectado ? "Conectado" : "Sin conectar"}
        </span>
      </div>

      <button
        type="button"
        disabled={cargando || guardando}
        onClick={() => conectado ? desconectar() : setModal(true)}
        className="rounded-xl bg-green-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50"
      >
        {conectado ? "Desconectar" : "Conectar OpenAI"}
      </button>

      {mensaje && <p role="status" className="text-sm text-amber-500">{mensaje}</p>}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Conectar OpenAI"
            className="w-full max-w-md rounded-2xl bg-[#111c2b] border border-slate-700 p-6 text-white space-y-4"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="text-green-500" />
              <h3 className="text-xl font-bold">Conectar OpenAI</h3>
            </div>

            <p className="text-sm text-slate-400">
              Introduce tu API Key de OpenAI. La guardaremos cifrada
              y no volveremos a mostrarla.
            </p>

            <input
              type={mostrarClave ? "text" : "password"}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-slate-600 bg-[#08111f] px-4 py-3 outline-none"
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={mostrarClave}
                onChange={(e) => setMostrarClave(e.target.checked)}
              />
              Mostrar clave
            </label>

            {mensaje && <p role="alert" className="text-sm text-red-400">{mensaje}</p>}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={guardando}
                onClick={() => {
                  setModal(false);
                  setClave("");
                  setMensaje("");
                }}
                className="rounded-xl border border-slate-600 px-4 py-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!clave.trim() || guardando}
                onClick={conectar}
                className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 font-bold disabled:opacity-50"
              >
                {guardando && <Loader2 size={16} className="animate-spin" />}
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
