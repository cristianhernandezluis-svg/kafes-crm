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
  nombre: string;
  celular: string;
  producto: string;
  ciudad: string;
  estado: string;
  nota?: string;
};

export default function Home() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);

  const [form, setForm] = useState<Cliente>({
    nombre: "",
    celular: "",
    producto: "",
    ciudad: "",
    estado: "Nuevo",
    nota: "",
  });

  useEffect(() => {
    const guardados = localStorage.getItem("kafes-clientes");

    if (guardados) {
      setClientes(JSON.parse(guardados));
    } else {
      setClientes([
        {
          nombre: "Carlos Ramirez",
          celular: "925 653 265",
          producto: 'Sierra BOMVINK 8"',
          ciudad: "Lima",
          estado: "Nuevo",
          nota: "Cliente de prueba",
        },
      ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("kafes-clientes", JSON.stringify(clientes));
  }, [clientes]);

  const guardarCliente = () => {
    if (!form.nombre || !form.celular || !form.producto) {
      alert("Completa nombre, celular y producto");
      return;
    }

    setClientes([...clientes, form]);

    setForm({
      nombre: "",
      celular: "",
      producto: "",
      ciudad: "",
      estado: "Nuevo",
      nota: "",
    });

    setMostrarModal(false);
  };

  const cambiarEstado = (indexGlobal: number, nuevoEstado: string) => {
    const copia = [...clientes];
    copia[indexGlobal].estado = nuevoEstado;
    setClientes(copia);
  };

  const eliminarCliente = (indexGlobal: number) => {
    const confirmar = confirm("¿Eliminar este cliente?");
    if (!confirmar) return;

    setClientes(clientes.filter((_, index) => index !== indexGlobal));
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
            {clientes.filter((c) => c.estado === "Pagó Adelanto").length}
          </p>
          <p>
            Entregados:{" "}
            {clientes.filter((c) => c.estado === "Entregado").length}
          </p>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-x-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Embudo de Ventas</h2>

          <button
            onClick={() => setMostrarModal(true)}
            className="bg-yellow-500 text-black px-5 py-3 rounded-lg font-bold hover:bg-yellow-400"
          >
            + Nuevo Cliente
          </button>
        </div>

        <div className="grid grid-cols-7 gap-4 mt-8 min-w-[1400px]">
          {estados.map((estado) => (
            <div
              key={estado}
              className="bg-white rounded-xl shadow p-4 min-h-[500px]"
            >
              <h3 className="font-bold mb-3">
                {estado}{" "}
                <span className="text-gray-400">
                  {clientes.filter((c) => c.estado === estado).length}
                </span>
              </h3>

              <div className="space-y-3">
                {clientes.map((cliente, index) =>
                  cliente.estado === estado ? (
                    <div key={index} className="bg-gray-100 p-3 rounded-lg">
                      <p className="font-semibold">{cliente.nombre}</p>
                      <p className="text-sm">📱 {cliente.celular}</p>
                      <p className="text-sm">📦 {cliente.producto}</p>
                      <p className="text-green-600 text-sm">📍 {cliente.ciudad}</p>

                      {cliente.nota && (
                        <p className="text-xs mt-2 text-gray-600">
                          Nota: {cliente.nota}
                        </p>
                      )}

                      <select
                        className="border w-full p-2 mt-3 rounded text-sm bg-white"
                        value={cliente.estado}
                        onChange={(e) => cambiarEstado(index, e.target.value)}
                      >
                        {estados.map((estado) => (
                          <option key={estado}>{estado}</option>
                        ))}
                      </select>

                      <a
                        href={`https://wa.me/51${cliente.celular.replace(/\s/g, "")}`}
                        target="_blank"
                        className="block bg-green-600 text-white text-center mt-3 py-2 rounded text-sm font-bold"
                      >
                        Abrir WhatsApp
                      </a>

                      <button
                        onClick={() => eliminarCliente(index)}
                        className="bg-red-500 text-white w-full mt-2 py-2 rounded text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-[430px] shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Nuevo Cliente</h2>

            <input
              className="border w-full p-3 mb-3 rounded-lg"
              placeholder="Nombre del cliente"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />

            <input
              className="border w-full p-3 mb-3 rounded-lg"
              placeholder="WhatsApp / celular"
              value={form.celular}
              onChange={(e) => setForm({ ...form, celular: e.target.value })}
            />

            <input
              className="border w-full p-3 mb-3 rounded-lg"
              placeholder="Producto"
              value={form.producto}
              onChange={(e) => setForm({ ...form, producto: e.target.value })}
            />

            <input
              className="border w-full p-3 mb-3 rounded-lg"
              placeholder="Ciudad"
              value={form.ciudad}
              onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
            />

            <textarea
              className="border w-full p-3 mb-3 rounded-lg"
              placeholder="Nota / seguimiento"
              value={form.nota}
              onChange={(e) => setForm({ ...form, nota: e.target.value })}
            />

            <select
              className="border w-full p-3 mb-4 rounded-lg"
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
            >
              {estados.map((estado) => (
                <option key={estado}>{estado}</option>
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
                onClick={guardarCliente}
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