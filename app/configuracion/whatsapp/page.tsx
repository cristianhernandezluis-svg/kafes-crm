"use client";

import { useEffect, useState } from "react";

export default function WhatsAppConfigPage() {
  const [form, setForm] = useState({
    phone_number_id: "",
    waba_id: "",
    token: "",
    verify_token: "",
  });

  const [mensaje, setMensaje] = useState("");

  const cargarConfig = async () => {
    const usuarioGuardado = localStorage.getItem("usuario");

    if (!usuarioGuardado) {
      window.location.href = "/login";
      return;
    }

    const usuario = JSON.parse(usuarioGuardado);

    const res = await fetch(
      `/api/configuracion/whatsapp?empresa_id=${usuario.empresa_id}`,
      { cache: "no-store" }
    );

    const data = await res.json();

    if (data.success && data.integracion) {
      setForm({
        phone_number_id: data.integracion.phone_number_id || "",
        waba_id: data.integracion.waba_id || "",
        token: "",
        verify_token: data.integracion.verify_token || "",
      });
    }
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    const usuarioGuardado = localStorage.getItem("usuario");

    if (!usuarioGuardado) {
      window.location.href = "/login";
      return;
    }

    const usuario = JSON.parse(usuarioGuardado);

    const res = await fetch("/api/configuracion/whatsapp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        empresa_id: usuario.empresa_id,
        ...form,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      setMensaje(data.error || "No se pudo guardar");
      return;
    }

    setMensaje("Configuración guardada correctamente ✅");
  };

  useEffect(() => {
    cargarConfig();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Configuración WhatsApp</h1>
            <p className="text-gray-500">
              Conecta el WhatsApp Cloud API de esta empresa.
            </p>
          </div>

          <a href="/" className="bg-black text-white px-5 py-3 rounded-lg font-bold">
            Volver
          </a>
        </div>

        <form onSubmit={guardar} className="space-y-4">
          <input
            className="border w-full p-3 rounded"
            placeholder="Phone Number ID"
            value={form.phone_number_id}
            onChange={(e) =>
              setForm({ ...form, phone_number_id: e.target.value })
            }
          />

          <input
            className="border w-full p-3 rounded"
            placeholder="WABA ID"
            value={form.waba_id}
            onChange={(e) => setForm({ ...form, waba_id: e.target.value })}
          />

          <input
            className="border w-full p-3 rounded"
            placeholder="Verify Token"
            value={form.verify_token}
            onChange={(e) =>
              setForm({ ...form, verify_token: e.target.value })
            }
          />

          <textarea
            className="border w-full p-3 rounded h-32"
            placeholder="Token permanente de Meta"
            value={form.token}
            onChange={(e) => setForm({ ...form, token: e.target.value })}
          />

          <button className="bg-green-600 text-white w-full py-3 rounded font-bold">
            Guardar configuración
          </button>
        </form>

        {mensaje && <p className="mt-4 text-center">{mensaje}</p>}
      </div>
    </main>
  );
}