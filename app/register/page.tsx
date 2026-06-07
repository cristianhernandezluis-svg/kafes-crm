"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre,
        empresa,
        email,
        password,
      }),
    });

    const data = await res.json();

    if (data.success) {
      setMensaje("Cuenta creada correctamente ✅");
    } else {
      setMensaje(data.error);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={registrar}
        className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">
          Crear Cuenta
        </h1>

        <input
          className="w-full border p-3 rounded mb-3"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded mb-3"
          placeholder="Empresa"
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded mb-3"
          placeholder="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded mb-3"
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="w-full bg-black text-white py-3 rounded"
          type="submit"
        >
          Crear Cuenta
        </button>

        {mensaje && (
          <p className="mt-4 text-center">
            {mensaje}
          </p>
        )}
      </form>
    </main>
  );
}