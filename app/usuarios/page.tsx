"use client";

import { useEffect, useState } from "react";

type Usuario = {
  id: number;
  empresa_id: number;
  nombre: string;
  email: string;
  rol: string;
  proveedor: string;
  created_at: string;
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "asesor",
  });

  const cargarUsuarios = async () => {
    const usuarioGuardado = localStorage.getItem("usuario");

    if (!usuarioGuardado) {
      window.location.href = "/login";
      return;
    }

    const usuario = JSON.parse(usuarioGuardado);

    const res = await fetch(`/api/usuarios?empresa_id=${usuario.empresa_id}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      setUsuarios(data.usuarios);
    }
  };

  const crearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    const usuarioGuardado = localStorage.getItem("usuario");

    if (!usuarioGuardado) {
      window.location.href = "/login";
      return;
    }

    const usuario = JSON.parse(usuarioGuardado);

    const res = await fetch("/api/usuarios", {
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
      setMensaje(data.error || "No se pudo crear el usuario");
      return;
    }

    setMensaje("Usuario creado correctamente ✅");
    setForm({
      nombre: "",
      email: "",
      password: "",
      rol: "asesor",
    });

    cargarUsuarios();
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Usuarios del equipo</h1>
            <p className="text-gray-500">
              Agrega asesores para que puedan ingresar al CRM.
            </p>
          </div>

          <a href="/" className="bg-black text-white px-5 py-3 rounded-lg font-bold">
            Volver
          </a>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <form
            onSubmit={crearUsuario}
            className="bg-white rounded-xl shadow p-6"
          >
            <h2 className="text-xl font-bold mb-4">Agregar usuario</h2>

            <input
              className="border w-full p-3 rounded mb-3"
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />

            <input
              className="border w-full p-3 rounded mb-3"
              placeholder="Correo"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <input
              className="border w-full p-3 rounded mb-3"
              placeholder="Contraseña"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <select
              className="border w-full p-3 rounded mb-4"
              value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value })}
            >
              <option value="asesor">Asesor</option>
              <option value="admin">Admin</option>
            </select>

            <button className="bg-green-600 text-white w-full py-3 rounded font-bold">
              Crear usuario
            </button>

            {mensaje && <p className="mt-4 text-center">{mensaje}</p>}
          </form>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">Mi equipo</h2>

            <div className="space-y-3">
              {usuarios.map((u) => (
                <div
                  key={u.id}
                  className="border rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold">{u.nombre}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>

                  <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-bold">
                    {u.rol}
                  </span>
                </div>
              ))}

              {usuarios.length === 0 && (
                <p className="text-gray-500">Aún no hay usuarios.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}