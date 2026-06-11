"use client";

import { useEffect, useState } from "react";

export default function CanalesPage() {
  const [qr, setQr] = useState("");
  const [estado, setEstado] = useState("cargando");

  async function cargarQR() {
    try {
      const res = await fetch("/api/whatsapp-qr");
      const data = await res.json();

      setQr(data.qr);
      setEstado(data.estado);
    } catch (error) {
      console.error(error);
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
      <h1 className="text-3xl font-bold mb-6">
        WhatsApp QR
      </h1>

      <div className="bg-white rounded-xl shadow p-6 max-w-md">
        <p className="mb-4">
          Estado:
          <strong className="ml-2">
            {estado}
          </strong>
        </p>

        {qr ? (
          <img
            src={qr}
            alt="QR WhatsApp"
            className="w-72 h-72 mx-auto"
          />
        ) : (
          <p>Esperando QR...</p>
        )}

        <p className="text-center mt-4 text-gray-500">
          Escanee con WhatsApp Business
        </p>
      </div>
    </div>
  );
}