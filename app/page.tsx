"use client";

import { useEffect, useState } from "react";

const estados = [
  "Nuevo",
  "Interesado",
  "Seguimiento",
  "Pagó Adelanto",
  "Enviado",
  "Entregado",
  "No Responde",
];

type Cliente = {
  id: number;
  nombre: string;
  telefono: string;
  ciudad: string | null;
  etapa: string;
  asesor: string | null;
  created_at: string;
};

type Conversacion = {
  id: number;
  cliente_id: number;
  telefono: string;
  mensaje: string;
  tipo: string;
  remitente: string;
  created_at: string;
};

export default function Home() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);

  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    ciudad: "",
    etapa: "Nuevo",
    asesor: "",
  });

  const cargarClientes = async () => {
    try {
      const res = await fetch("/api/clientes", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setClientes(data.clientes);
    } finally {
      setCargando(false);
    }
  };

  const abrirConversacion = async (cliente: Cliente) => {
    setClienteActivo(cliente);

    const res = await fetch(`/api/conversaciones/${cliente.id}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      setConversaciones(data.conversaciones);
    }
  };

  useEffect(() => {
    cargarClientes();
    const intervalo = setInterval(cargarClientes, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const cambiarEtapa = async (id: number, nuevaEtapa: string) => {
    setClientes((prev) =>
      prev.map((cliente) =>
        cliente.id === id ? { ...cliente, etapa: nuevaEtapa } : cliente
      )
    );

    await fetch(`/api/clientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: nuevaEtapa }),
    });
  };

  const crearCliente = async () => {
    if (!form.nombre || !form.telefono) {
      alert("Completa nombre y teléfono");
      return;
    }

    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!data.success) {
      alert("No se pudo crear el cliente");
      return;
    }

    setMostrarModal(false);
    setForm({
      nombre: "",
      telefono: "",
      ciudad: "",
      etapa: "Nuevo",
      asesor: "",
    });

    cargarClientes();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-black text-white p-5">
        <h1 className="text-2xl font-bold text-yellow-400">Kafes CRM</h1>

        <div className="mt-10 space-y-4">
          <div className="bg-yellow-500 text-black p-3 rounded-lg font-bold">
            Dashboard
          </div>
          <div className="p-3 hover:bg-zinc-800 rounded-lg cursor-pointer">
            Clientes
          </div>
          <div className="p-3 hover:bg-zinc-800 rounded-lg cursor-pointer">
            Seguimientos
          </div>
          <div className="p-3 hover:bg-zinc-800 rounded-lg cursor-pointer">
            Ventas
          </div>
          <div className="p-3 hover:bg-zinc-800 rounded-lg cursor-pointer">
            Reportes
          </div>
        </div>

        <div className="mt-10 bg-zinc-900 p-4 rounded-xl">
          <p className="text-sm text-gray-400">Resumen hoy</p>
          <p className="mt-2">Clientes: {clientes.length}</p>
          <p>
            Adelantos:{" "}
            {clientes.filter((c) => c.etapa === "Pagó Adelanto").length}
          </p>
          <p>
            Entregados:{" "}
            {clientes.filter((c) => c.etapa === "Entregado").length}
          </p>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-x-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Embudo de Ventas</h2>

          <div className="flex gap-3">
            <button
              onClick={cargarClientes}
              className="bg-gray-800 text-white px-5 py-3 rounded-lg font-bold"
            >
              Actualizar
            </button>

            <button
              onClick={() => setMostrarModal(true)}
              className="bg-yellow-500 text-black px-5 py-3 rounded-lg font-bold"
            >
              + Nuevo Cliente
            </button>
          </div>
        </div>

        {cargando ? (
          <p className="mt-8 text-gray-500">Cargando clientes...</p>
        ) : (
          <div className="grid grid-cols-7 gap-4 mt-8 min-w-[1400px]">
            {estados.map((estado) => (
              <div
                key={estado}
                className="bg-white rounded-xl shadow p-4 min-h-[500px]"
              >
                <h3 className="font-bold mb-3">
                  {estado}{" "}
                  <span className="text-gray-400">
                    {clientes.filter((c) => c.etapa === estado).length}
                  </span>
                </h3>

                <div className="space-y-3">
                  {clientes
                    .filter((cliente) => cliente.etapa === estado)
                    .map((cliente) => (
                      <div
                        key={cliente.id}
                        className="bg-gray-100 p-3 rounded-lg"
                      >
                        <p className="font-semibold">
                          {cliente.nombre || "Sin nombre"}
                        </p>

                        <p className="text-sm">📱 {cliente.telefono}</p>

                        <p className="text-green-600 text-sm">
                          📍 {cliente.ciudad || "Sin ciudad"}
                        </p>

                        <p className="text-xs mt-2 text-gray-500">
                          Etapa: {cliente.etapa}
                        </p>

                        <select
                          className="border w-full p-2 mt-3 rounded text-sm bg-white"
                          value={cliente.etapa}
                          onChange={(e) =>
                            cambiarEtapa(cliente.id, e.target.value)
                          }
                        >
                          {estados.map((estado) => (
                            <option key={estado} value={estado}>
                              {estado}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => abrirConversacion(cliente)}
                          className="block bg-blue-600 text-white text-center mt-3 py-2 rounded text-sm font-bold w-full"
                        >
                          Ver conversación
                        </button>

                        <a
                          href={`https://wa.me/51${cliente.telefono.replace(
                            /\s/g,
                            ""
                          )}`}
                          target="_blank"
                          className="block bg-green-600 text-white text-center mt-2 py-2 rounded text-sm font-bold"
                        >
                          Abrir WhatsApp
                        </a>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {clienteActivo && (
        <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 p-5 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Conversación</h2>
            <button
              onClick={() => setClienteActivo(null)}
              className="text-red-500 font-bold"
            >
              Cerrar
            </button>
          </div>

          <div className="bg-gray-100 p-3 rounded-lg mb-4">
            <p className="font-bold">{clienteActivo.nombre}</p>
            <p className="text-sm">📱 {clienteActivo.telefono}</p>
            <p className="text-sm">📍 {clienteActivo.ciudad || "Sin ciudad"}</p>
          </div>

          <div className="space-y-3">
            {conversaciones.length === 0 ? (
              <p className="text-gray-500 text-sm">
                Aún no hay mensajes guardados para este cliente.
              </p>
            ) : (
              conversaciones.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg text-sm ${
                    msg.remitente === "cliente"
                      ? "bg-green-100"
                      : "bg-gray-200"
                  }`}
                >
                  <p>{msg.mensaje}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {msg.remitente} · {new Date(msg.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[430px] shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Nuevo Cliente</h2>

            <input
              className="border w-full p-3 mb-3 rounded-lg"
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />

            <input
              className="border w-full p-3 mb-3 rounded-lg"
              placeholder="Teléfono / WhatsApp"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />

            <input
              className="border w-full p-3 mb-3 rounded-lg"
              placeholder="Ciudad"
              value={form.ciudad}
              onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
            />

            <input
              className="border w-full p-3 mb-3 rounded-lg"
              placeholder="Asesor"
              value={form.asesor}
              onChange={(e) => setForm({ ...form, asesor: e.target.value })}
            />

            <select
              className="border w-full p-3 mb-4 rounded-lg"
              value={form.etapa}
              onChange={(e) => setForm({ ...form, etapa: e.target.value })}
            >
              {estados.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setMostrarModal(false)}
                className="bg-gray-300 px-4 py-2 rounded-lg w-full"
              >
                Cancelar
              </button>

              <button
                onClick={crearCliente}
                className="bg-green-600 text-white px-4 py-2 rounded-lg w-full font-bold"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}