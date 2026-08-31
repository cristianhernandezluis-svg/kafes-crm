"use client";

import { useEffect, useState } from "react";

export default function CanalesPage() {
  const [qr, setQr] = useState("");
  const [estado, setEstado] = useState("cargando");
  const [desconectando, setDesconectando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function cargarQR() {
    try {
      const res = await fetch("/api/whatsapp-qr", {
        cache: "no-store",
      });

      const data = await res.json();

      setQr(data.qr || "");
      setEstado(data.estado || "desconectado");
    } catch (error) {
      console.error(error);
      setEstado("error");
    }
  }

  async function desconectarWhatsApp() {
    const confirmar = window.confirm(
      "¿Seguro que deseas desconectar este WhatsApp? Se generará un nuevo código QR para vincular otro teléfono."
    );

    if (!confirmar) return;

    try {
      setDesconectando(true);
      setMensaje("");

      const res = await fetch("/api/whatsapp-qr/desconectar", {
        method: "POST",
      });

      const data = await res.json();

      if (!data.success) {
        setMensaje(data.error || "No se pudo desconectar WhatsApp");
        return;
      }

      setEstado("desconectado");
      setQr("");
      setMensaje("WhatsApp desconectado. Generando nuevo QR...");

      setTimeout(() => {
        cargarQR();
      }, 1500);
    } catch (error) {
      console.error(error);
      setMensaje("No se pudo desconectar WhatsApp");
    } finally {
      setDesconectando(false);
    }
  }

  useEffect(() => {
    cargarQR();

    const intervalo = setInterval(() => {
      cargarQR();
    }, 3000);

    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">WhatsApp QR</h1>

      <div className="bg-white rounded-xl shadow p-6 max-w-md">
        <p className="mb-4">
          Estado:
          <strong className="ml-2">{estado}</strong>
        </p>

        {estado === "conectado" ? (
          <div className="text-center py-10">
            <div className="text-green-600 text-5xl mb-4">✅</div>

            <p className="font-bold text-green-600 mb-6">
              WhatsApp conectado correctamente
            </p>

            <button
              onClick={desconectarWhatsApp}
              disabled={desconectando}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-3 rounded-lg font-bold w-full"
            >
              {desconectando
                ? "Desconectando..."
                : "Desconectar WhatsApp"}
            </button>
          </div>
        ) : qr ? (
          <img
            src={qr}
            alt="QR WhatsApp"
            className="w-72 h-72 mx-auto"
          />
        ) : (
          <p>Generando QR...</p>
        )}

        {mensaje && (
          <p className="text-center mt-4 text-sm text-gray-600">
            {mensaje}
          </p>
        )}

        <p className="text-center mt-4 text-gray-500">
          Escanee con WhatsApp Business
        </p>
      </div>
    </div>
  );
}